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
        speed = 0.25
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
        let previousPosition = this.position;
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
            let position = new Vector(previousPosition.x, previousPosition.y);
            let segment = new Segment(
                size,
                this.bounds,
                position,
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
        // for (let i = this.segments.length - 1; i >= 0; i--) {
        for (let i = 0; i < this.segments.length; i++) {
            this.segments[i].render(imageData);
        }
        this.layer.getContext().putImageData(imageData, 0, 0);
    }
}

class Segment {
    MAX_TURN_CHANCE_PCT = 0; //5;
    constructor(size, bounds, position, direction, speed, upgrades) {
        this.size = Math.round(size);
        this.bounds = bounds;
        this.position = position;
        this.renderPosition = position.copy();
        this.renderPosition.round();
        this.direction = direction;
        this.speed = speed;

        this.renderPositionChangesSinceLastTurn = 0;

        this.history = [];
        this.historySize = 1;
        this.history.push({
            renderPosition: this.renderPosition.copy(),
            direction: this.direction.copy(),
        });
        this.upgrades = upgrades;
        this.foreSegment = null;
        this.aftSegment = null;

        this.pixels = [];
        this.generatePixels();
    }

    generatePixels() {
        // Temporary: just make a square with edge length = size
        for (let x = 0; x < this.size; x++) {
            for (let y = 0; y < this.size; y++) {
                let pixel = PixelFactory.create(new Vector(x, y), this.upgrades, PixelType.SERPENT);
                if (x == 0 || x == this.size - 1 || y == 0 || y == this.size - 1) {
                    pixel.setSurface(true);
                }
                this.pixels.push(pixel);
            }
        }
    }

    canMoveForward() {
        let nextPosition = Vector.add(this.position, Vector.mult(this.direction, this.speed));
        if (
            nextPosition.x < 0 ||
            nextPosition.x + this.size >= this.bounds.x ||
            nextPosition.y < 0 ||
            nextPosition.y + this.size >= this.bounds.y
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
            }
            this.position.add(Vector.mult(this.direction, this.speed));
            this.renderPosition.set(this.position);
            this.renderPosition.round();
            if (window.DEBUG) {
                console.log(Serpent.TAG + "Head segment @ " + this.renderPosition.toString());
            }
        } else {
            // We're a body segment, so just follow the segment in front of us.
            // TBD: Fix this! This ALMOST works. Works great for going left to up, but any other
            // direction is broken.
            let foreState = this.foreSegment.oldestState;
            this.direction = foreState.direction;

            let forePosition = foreState.renderPosition;
            let foreCenter = Vector.add(forePosition, this.foreSegment.size / 2);
            let foreConnectionPosition = Vector.add(
                foreCenter,
                Vector.mult(foreState.direction, Math.round(this.size / 2))
            );
            let offsetPosition = foreConnectionPosition.copy();

            if (this.direction.x == 1) {
                offsetPosition.sub(this.size, 0);
                offsetPosition.sub(0, this.size / 2);
            } else if (this.direction.y == 1) {
                offsetPosition.sub(0, this.size);
                offsetPosition.sub(this.size / 2, 0);
            } else if (this.direction.y == -1) {
                offsetPosition.sub(this.size / 2, 0);
            } else if (this.direction.x == -1) {
                offsetPosition.sub(0, this.size / 2);
            }
            this.position = offsetPosition;
            this.renderPosition = offsetPosition.copy();
            this.renderPosition.round();
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
        this.historySize = Math.ceil((this.size + segment.size) / 2);

        for (let i = this.history.length; i < this.historySize; i++) {
            this.history.push({
                renderPosition: this.renderPosition.copy(),
                direction: this.direction.copy(),
            });
        }
    }

    render(imageData) {
        // TBD: render the orientation as well
        for (const pixel of this.pixels) {
            pixel.render(imageData, this.renderPosition);
        }
    }

    get oldestState() {
        return this.history[0];
    }

    get mostRecentState() {
        return this.history[this.history.length - 1];
    }
}
