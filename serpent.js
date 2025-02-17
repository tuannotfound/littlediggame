import Vector from "./vector.js";
import MathExtras from "./math_extras.js";
import PixelType from "./diggables/pixel_type.js";
import PixelBody from "./pixel_body.js";

export default class Serpent extends PixelBody {
    static TAG = "[SERP] ";
    static MAX_SIZE = 10;
    static MIN_SIZE = 1;
    static BORDER_BUFFER_PIXELS = 2;

    constructor(
        segmentCount,
        bounds,
        initialPosition,
        initialDirection = new Vector(0, -1),
        // Moves per frame. Should be 1/N where N is a whole number for less
        // janky movement.
        speed = 1 / 2
    ) {
        super(bounds.x, bounds.y, true, "serpent");
        this.segmentCount = segmentCount;
        this.position = initialPosition;
        this.direction = initialDirection;
        this.speed = speed;
        this.segments = [];

        this.initialized = false;
    }

    init(upgrades) {
        super.init(upgrades);

        this.initialized = true;
    }

    createInitialPixels() {
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
                    Serpent.MIN_SIZE,
                    Serpent.MAX_SIZE - 1
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
                this,
                size,
                new Vector(this.layer.width, this.layer.height),
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

    onResize(newSize) {
        this.layer.onResize(newSize);
        // This is insufficient and the position needs to be accounted for somehow.
        for (const segment of this.segments) {
            segment.bounds = new Vector(this.layer.width, this.layer.height);

            if (!segment.foreSegment && !segment.isWithinBounds(segment.position)) {
                segment.moveWithinBounds();
            }
        }
    }

    update() {
        if (!this.initialized) {
            return;
        }
        for (const segment of this.segments) {
            this.needsUpdate = segment.update() || this.needsUpdate;
        }
        super.update();
    }

    // Override
    updateSurface() {
        this.surfacePixels = [];

        // Consider each segment independent of one another for
        // calculating the surfaces.
        for (const segment of this.segments) {
            segment.updateSurface();
            this.surfacePixels.push(...segment.surfacePixels);
        }
    }

    // Override
    removePixel(pixel, updateSurface = true) {
        console.log("Serpent - removePixel(pixel, updateSurface = " + updateSurface);
        super.removePixel(pixel, false);
        // Also have to update the segment that held that pixel before updating
        // the surface.
        let pixelRemoved = false;
        for (const segment of this.segments) {
            pixelRemoved = segment.removePixel(pixel);
            if (!pixelRemoved) {
                continue;
            }
            if (segment.pixels.length == 0) {
                // Remove the segment from the serpent and update its surrounding segments.
                this.segments.splice(this.segments.indexOf(segment), 1);
                if (segment.foreSegment) {
                    segment.foreSegment.aftSegment = null;
                }
                if (segment.aftSegment) {
                    segment.aftSegment.foreSegment = null;
                }
            }
            break;
        }

        if (!pixelRemoved) {
            console.error("Attempted to remove a pixel not found in any segment");
        }
        if (updateSurface) {
            this.updateSurface();
        }
    }

    // Override
    addPixel(position, type = PixelType.DIRT) {
        if (type == PixelType.TOMBSTONE) {
            return null;
        }
        return super.addPixel(position, type);
    }
}

class Segment {
    MAX_TURN_CHANCE_PCT = 5;
    constructor(serpent, size, bounds, position, direction, speed, upgrades) {
        this.serpent = serpent;
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
        this.surfacePixels = [];
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
                let pixelType = indicatorDot ? PixelType.DIAMOND : PixelType.SERPENT;
                let pixel = this.serpent.addPixel(
                    Vector.add(this.renderPosition, pixelPosition),
                    pixelType
                );
                if (pixel) {
                    this.pixels.push(pixel);
                }
            }
        }
    }

    removePixel(pixel) {
        let index = this.pixels.indexOf(pixel);
        if (index < 0) {
            return false;
        }
        this.pixels.splice(index, 1);

        // May or may not be part of the surface.
        if (pixel.isSurface) {
            index = this.surfacePixels.indexOf(pixel);
            if (index >= 0) {
                this.surfacePixels.splice(index, 1);
            }
        }
        return true;
    }

    isWithinBounds(position) {
        const halfSize = Math.floor(this.size / 2);
        if (
            position.x - halfSize < Serpent.BORDER_BUFFER_PIXELS ||
            position.x + halfSize >= this.bounds.x - Serpent.BORDER_BUFFER_PIXELS ||
            position.y - halfSize < Serpent.BORDER_BUFFER_PIXELS ||
            position.y + halfSize >= this.bounds.y - Serpent.BORDER_BUFFER_PIXELS
        ) {
            if (position.x - halfSize < Serpent.BORDER_BUFFER_PIXELS) {
                console.log(
                    "Not within bounds because " +
                        position.x +
                        " - " +
                        halfSize +
                        " < " +
                        Serpent.BORDER_BUFFER_PIXELS
                );
            }
            if (position.x + halfSize >= this.bounds.x - Serpent.BORDER_BUFFER_PIXELS) {
                console.log(
                    "Not within bounds because " +
                        position.x +
                        " + " +
                        halfSize +
                        " >= " +
                        this.bounds.x +
                        " - " +
                        Serpent.BORDER_BUFFER_PIXELS
                );
            }
            if (position.y - halfSize < Serpent.BORDER_BUFFER_PIXELS) {
                console.log(
                    "Not within bounds because " +
                        position.y +
                        " - " +
                        halfSize +
                        " < " +
                        Serpent.BORDER_BUFFER_PIXELS
                );
            }
            if (position.y + halfSize >= this.bounds.y - Serpent.BORDER_BUFFER_PIXELS) {
                console.log(
                    "Not within bounds because " +
                        position.y +
                        " + " +
                        halfSize +
                        " >= " +
                        this.bounds.y +
                        " - " +
                        Serpent.BORDER_BUFFER_PIXELS
                );
            }
            return false;
        }
        return true;
    }

    moveWithinBounds() {
        const halfSize = Math.floor(this.size / 2);
        this.position.x = MathExtras.clamp(
            this.position.x,
            Serpent.BORDER_BUFFER_PIXELS + halfSize,
            this.bounds.x - Serpent.BORDER_BUFFER_PIXELS - halfSize - 1
        );
        this.position.y = MathExtras.clamp(
            this.position.y,
            Serpent.BORDER_BUFFER_PIXELS + halfSize,
            this.bounds.y - Serpent.BORDER_BUFFER_PIXELS - halfSize - 1
        );
        this.renderPosition = this.position.copy().round();
        this.updateForMove();
    }

    canMoveForward() {
        let nextRenderPosition = Vector.add(this.position, Vector.mult(this.direction, this.speed));
        nextRenderPosition.round();
        return this.isWithinBounds(nextRenderPosition);
    }

    // Returns true if we actually moved (i.e. renderPosition changed),
    // false otherwise.
    update() {
        if (this.pixels.length == 0) {
            return false;
        }
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
                            "Head segment is unable to go anywhere, all directions are invalid. Position = " +
                            this.position.toString() +
                            ", bounds = " +
                            this.bounds.toString()
                    );
                    return false;
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

        return this.updateForMove();
    }

    updateForMove() {
        if (Vector.equals(this.renderPosition, this.mostRecentState.renderPosition)) {
            return false;
        }
        // Not all updates result in a new render position. At slow speeds, we can go many
        // updates before we visually move, but we don't want this to count towards our
        // time since last turn otherwise we'll be turning all the time.
        this.renderPositionChangesSinceLastTurn++;

        let delta = Vector.sub(this.renderPosition, this.mostRecentState.renderPosition);

        if (window.DEBUG) {
            console.log(
                Serpent.TAG +
                    "Head segment @ " +
                    this.renderPosition.toString() +
                    ", delta = " +
                    delta.toString()
            );
        }
        for (const pixel of this.pixels) {
            pixel.position.add(delta);
        }

        this.history.push({
            renderPosition: this.renderPosition.copy(),
            direction: this.direction.copy(),
        });
        while (this.history.length > this.historySize) {
            this.history.shift();
        }
        return true;
    }

    updateSurface() {
        // We can improve this by shrinking the bounds to just be around our actual pixels.
        this.surfacePixels = this.serpent.findSurfacePixels(
            this.pixels,
            this.bounds.x,
            this.bounds.y
        );
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
            let localPosition = Vector.sub(this.renderPosition, pixel.position);
            localPosition = rotationFunc(localPosition, 1, 1);
            pixel.position.set(Vector.add(this.renderPosition, localPosition));
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

        // Couldn't figure out a more clever way of doing this, so it's going to get
        // ugly. Buckle up.
        if (pd.x == cd.x || pd.y == cd.y) {
            if (!this.foreSegment) {
                console.log(Serpent.TAG + "180");
            }
            return Vector.rotate180;
        }
        // At one point, CW and CCW were swapped. Things made sense. But then, somehow, during the
        // switch-over for Serpent to become a PixelBody, things got swapped. I don't know why.
        // But this works, for whatever reason. If it seems wrong, I agree with you.
        // Sets of [pd.x, pd.y, cd.x, cd.y] that result in a CW rotation.
        const cw = [
            [0, 1, 1, 0],
            [0, -1, -1, 0],
            [1, 0, 0, -1],
            [-1, 0, 0, 1],
        ];
        for (const rot of cw) {
            if (pd.x == rot[0] && pd.y == rot[1] && cd.x == rot[2] && cd.y == rot[3]) {
                if (!this.foreSegment) {
                    console.log(Serpent.TAG + "CW");
                }
                return Vector.rotate90CW;
            }
        }
        // Sets of [pd.x, pd.y, cd.x, cd.y] that result in a CCW rotation.
        const ccw = [
            [0, 1, -1, 0],
            [0, -1, 1, 0],
            [1, 0, 0, 1],
            [-1, 0, 0, -1],
        ];
        for (const rot of ccw) {
            if (pd.x == rot[0] && pd.y == rot[1] && cd.x == rot[2] && cd.y == rot[3]) {
                if (!this.foreSegment) {
                    console.log(Serpent.TAG + "CCW");
                }
                return Vector.rotate90CCW;
            }
        }
    }

    get oldestState() {
        return this.history[0];
    }

    get mostRecentState() {
        return this.history[this.history.length - 1];
    }
}
