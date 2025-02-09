import Layer from "./layer.js";
import Vector from "./vector.js";
import MathExtras from "./math_extras.js";
import PixelFactory from "./diggables/pixel_factory.js";
import PixelType from "./diggables/pixel_type.js";

export default class Serpent {
    static TAG = "[SERP] ";
    MAX_SIZE = 10;
    MIN_SIZE = 2;

    constructor(
        segmentCount,
        bounds,
        initialPosition,
        initialDirection = new Vector(0, -1),
        speed = 1
    ) {
        this.segmentCount = segmentCount;
        this.bounds = bounds;
        this.position = initialPosition;
        this.direction = initialDirection;
        this.speed = speed;

        this.upgrades = null;
        this.segments = [];

        this.layer = new Layer("serpent", bounds.x, bounds.y);

        this.initialized = false;
    }

    init(upgrades) {
        this.upgrades = upgrades;
        this.layer.initOffscreen();
        if (this.segments.length == 0) {
            this.generateSegments();
        }

        this.initialized = true;
    }

    generateSegments() {
        if (this.segments.length > 0) {
            console.error(
                Serpent.TAG + "Attempted to generate segments when segments already exist"
            );
            return;
        }
        for (let i = 0; i < this.segmentCount; i++) {
            let size = Math.round(
                MathExtras.scaleBetween(
                    this.segmentCount - i,
                    0,
                    this.segmentCount,
                    this.MIN_SIZE,
                    this.MAX_SIZE - 1
                )
            );
            // Ensure we always have an odd size so that we can have a center pixel.
            if (size % 2 == 0) {
                size++;
            }
            if (i == 0) {
                // Ensure the head is always the largest, with no equal.
                size += 2;
            }
            console.log(Serpent.TAG + "Generating segment of size " + size);
            let segment = new Segment(
                size,
                this.bounds,
                this.position.copy(),
                this.direction,
                this.speed,
                this.upgrades
            );
            if (i > 0) {
                segment.setForeSegment(this.segments[i - 1]);
            }
            this.segments.push(segment);
        }
    }

    onResize(bounds) {
        this.bounds = bounds;
        this.layer.destroy();
        this.layer = new Layer("serpent", bounds.x, bounds.y);
        if (this.initialized) {
            this.layer.initOffscreen();
        }
        // This is insufficient and the position needs to be accounted for somehow.
        for (const segment of this.segments) {
            segment.bounds = bounds;
        }
    }

    update() {
        if (!this.initialized) {
            return;
        }
        for (const segment of this.segments) {
            segment.update();
        }
        let imageData = this.layer
            .getContext()
            .createImageData(this.layer.width, this.layer.height);
        // Render from tail to head to ensure the head stays on top.
        for (let i = this.segments.length - 1; i >= 0; i--) {
            //for (let i = 0; i < this.segments.length; i++) {
            this.segments[i].render(imageData);
        }
        this.layer.getContext().putImageData(imageData, 0, 0);
    }
}

class Segment {
    MAX_TURN_CHANCE_PCT = 5;
    constructor(size, bounds, position, direction, speed, upgrades) {
        this.size = Math.round(size);
        this.bounds = bounds;
        // This is the center of the segment
        this.position = position;
        this.renderPosition = position.copy();
        this.renderPosition.round();
        this.direction = direction;
        this.speed = speed;

        this.renderPositionChangesSinceLastTurn = 0;

        this.history = [];
        this.historySize = this.size * 2;
        for (let i = 0; i < this.historySize; i++) {
            this.history.push({
                renderPosition: this.renderPosition.copy(),
                direction: this.direction.copy(),
            });
        }
        this.upgrades = upgrades;
        this.foreSegment = null;
        this.aftSegment = null;

        this.pixels = [];
        this.generatePixels();
    }

    generatePixels() {
        // Temporary: just make a square with edge length = size
        const halfSize = Math.floor(this.size / 2);
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                // Temporary, indicator dot
                let indicatorDot = false;
                if (this.direction.y == 1 && y == this.size - 1 && x == halfSize) {
                    indicatorDot = true;
                } else if (this.direction.y == -1 && y == 0 && x == halfSize) {
                    indicatorDot = true;
                } else if (this.direction.x == -1 && x == 0 && y == halfSize) {
                    indicatorDot = true;
                } else if (this.direction.x == 1 && x == this.size - 1 && y == halfSize) {
                    indicatorDot = true;
                }
                let pixelPosition = new Vector(x - halfSize, y - halfSize);
                if (pixelPosition.x == 0 && pixelPosition.y == 0) {
                    indicatorDot = true;
                }
                let pixel = PixelFactory.create(
                    pixelPosition,
                    this.upgrades,
                    indicatorDot ? PixelType.DIAMOND : PixelType.SERPENT
                );
                if (x == 0 || x == this.size - 1 || y == 0 || y == this.size - 1) {
                    pixel.setSurface(true);
                }
                this.pixels.push(pixel);
            }
        }
    }

    canMoveForward() {
        const halfSize = Math.floor(this.size / 2);
        let nextRenderPosition = Vector.add(this.position, Vector.mult(this.direction, this.speed));
        nextRenderPosition.round();
        if (
            nextRenderPosition.x - halfSize < 0 ||
            nextRenderPosition.x + halfSize >= this.bounds.x ||
            nextRenderPosition.y - halfSize < 0 ||
            nextRenderPosition.y + halfSize >= this.bounds.y
        ) {
            return false;
        }
        return true;
    }

    update() {
        if (!this.foreSegment) {
            // We're a head segment, decide if we're going to turn.
            let forcedToTurn = !this.canMoveForward();
            let turnThreshold = MathExtras.scaleBetween(
                this.renderPositionChangesSinceLastTurn,
                0,
                Math.min(this.bounds.x, this.bounds.y),
                0,
                this.MAX_TURN_CHANCE_PCT
            );
            if (forcedToTurn || 100 * Math.random() < turnThreshold) {
                this.direction = new Vector(this.direction.y, this.direction.x);
                if (!this.canMoveForward() || Math.random() > 0.5) {
                    // If we can't proceed in this new direction (e.g. right) then go in the
                    // opposite direction (e.g. left).
                    this.direction.x *= -1;
                    this.direction.y *= -1;
                }
                if (!this.canMoveForward()) {
                    // Either we've flipped a coin and decided on a direction we can't proceed in
                    // or we're stuck in a tube. Flip back to the opposite direction.
                    this.direction.x *= -1;
                    this.direction.y *= -1;
                }
                if (!this.canMoveForward()) {
                    // Still can't do it? Weird. Must be in a tube. Go back to the opposite of the
                    // previous direction.
                    this.direction = this.mostRecentState.direction;
                    this.direction.x *= -1;
                    this.direction.y *= -1;
                }
                if (!this.canMoveForward()) {
                    // I give up. Almost. Just proceed in the same direction we were originally
                    // going in and pretend none of this ever happened.
                    this.direction = this.mostRecentState.direction;
                }
                if (!this.canMoveForward()) {
                    // This can happen due to changes in bounds (from window resizing).
                    // TBD: Detect + move to just within the bounds.
                    console.error(
                        Serpent.TAG +
                            "Head segment is unable to go anywhere, all directions are invalid."
                    );
                    return;
                }
                console.log(
                    Serpent.TAG +
                        "Head segment turning. Went from " +
                        this.mostRecentState.direction.toString() +
                        " to " +
                        this.direction.toString()
                );
                this.renderPositionChangesSinceLastTurn = 0;

                let rotationFunc = this.getRotationFunc();
                if (rotationFunc) {
                    this.rotate(rotationFunc);
                }
            }
            this.position.add(Vector.mult(this.direction, this.speed));
            this.renderPosition.set(this.position);
            this.renderPosition.round();
            if (window.DEBUG) {
                console.log(Serpent.TAG + "Head segment @ " + this.renderPosition.toString());
            }
        } else {
            // We're a body segment, so just follow the segment in front of us.
            let foreState =
                this.foreSegment.history[
                    this.foreSegment.history.length -
                        (Math.ceil(this.foreSegment.size / 2) + Math.ceil(this.size / 2) - 1)
                ];
            this.direction = foreState.direction;

            let rotationFunc = this.getRotationFunc();
            if (rotationFunc) {
                this.rotate(rotationFunc);
            }

            this.position = foreState.renderPosition.copy();
            this.renderPosition = this.position.copy();
        }

        if (!Vector.equals(this.renderPosition, this.mostRecentState.renderPosition)) {
            // Not all updates result in a new render position. At slow speeds, we can go many
            // updates before we visually move, but we don't want this to count towards our
            // time since last turn.
            this.renderPositionChangesSinceLastTurn++;

            this.history.push({
                renderPosition: this.renderPosition.copy(),
                direction: this.direction.copy(),
            });
            while (this.history.length > this.historySize) {
                this.history.shift();
            }
        }
    }

    setForeSegment(segment) {
        this.foreSegment = segment;
        segment.setAftSegment(this);
    }

    setAftSegment(segment) {
        this.aftSegment = segment;
    }

    rotate(rotationFunc) {
        for (const pixel of this.pixels) {
            pixel.position.set(rotationFunc(pixel.position, 1, 1));
        }
    }

    // Returns null if no rotation should happen.
    getRotationFunc() {
        // "previous" direction
        let pd = this.mostRecentState.direction;
        // "current" direction
        let cd = this.direction;
        if (Vector.equals(cd, pd)) {
            return null;
        }

        // Going to get ugly, buckle up.
        if (pd.x == cd.x || pd.y == cd.y) {
            console.log(Serpent.TAG + "180");
            return Vector.rotate180;
        }
        // Sets of [pd.x, pd.y, cd.x, cd.y] that result in a CCW rotation.
        let ccw = [
            [0, 1, 1, 0],
            [0, -1, -1, 0],
            [1, 0, 0, -1],
            [-1, 0, 0, 1],
        ];
        for (const i of ccw) {
            if (pd.x == i[0] && pd.y == i[1] && cd.x == i[2] && cd.y == i[3]) {
                console.log(
                    Serpent.TAG +
                        "CCW, this.renderPositionChangesSinceLastTurn = " +
                        this.renderPositionChangesSinceLastTurn
                );
                return Vector.rotate90CCW;
            }
        }
        // Sets of [pd.x, pd.y, cd.x, cd.y] that result in a CW rotation.
        let cw = [
            [0, 1, -1, 0],
            [0, -1, 1, 0],
            [1, 0, 0, 1],
            [-1, 0, 0, -1],
        ];
        for (const i of cw) {
            if (pd.x == i[0] && pd.y == i[1] && cd.x == i[2] && cd.y == i[3]) {
                console.log(
                    Serpent.TAG +
                        "CW, this.renderPositionChangesSinceLastTurn = " +
                        this.renderPositionChangesSinceLastTurn
                );
                return Vector.rotate90CW;
            }
        }
    }

    render(imageData) {
        for (const pixel of this.pixels) {
            pixel.render(imageData, Vector.sub(this.renderPosition, 0));
        }
    }

    get oldestState() {
        return this.history[0];
    }

    get mostRecentState() {
        return this.history[this.history.length - 1];
    }
}
