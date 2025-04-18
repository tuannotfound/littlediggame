import Vector from "../vector.js";
import MathExtras from "../math_extras.js";
import PixelType from "../diggables/pixel_type.js";
import PixelBody from "./pixel_body.js";
import Pixel from "../diggables/pixel.js";
import SerpentDiggable from "../diggables/serpent.js";
import Color from "../color.js";

export default class Serpent extends PixelBody {
    static TAG = "[SERP] ";
    static MAX_SIZE = 16;
    static MIN_SIZE = 2;
    static BORDER_BUFFER_PIXELS = 2;
    static BLACK_SKY = new Color().immutableCopy();
    static KILL_ALL_INTERVAL_MIN_MS = 10 * 1000;
    static KILL_ALL_INTERVAL_MAX_MS = 15 * 1000;
    static KILL_ALL_ANIMATION_FRAMES = 20;
    static KILL_ALL_SEGMENT_OFFSET_MS = 100;

    constructor(
        width,
        height,
        initialDirection = new Vector(0, -1),
        // Moves per frame. Should be 1/N where N is a whole number for less
        // janky movement.
        speed = 1 / 2
    ) {
        super(width, height, true);
        this.segmentCount = 0;
        this.position = new Vector(width / 2, height / 2);
        this.position.round();
        this.direction = initialDirection;
        this.speed = speed;
        // Whether the serpent is allowed to exit the boundaries of the screen.
        this.loose = false;
        this.serpentLooseCallback = null;
        this.segments = [];

        this.nextKillAllTime = 0;
    }

    static fromJSON(json, upgrades) {
        let serpent = new Serpent(
            json.width,
            json.height,
            Vector.fromJSON(json.direction),
            json.speed
        );
        serpent.upgrades = upgrades;
        for (const segmentJson of json.segments) {
            let segment = Segment.fromJSON(segmentJson, serpent);
            if (segmentJson.hasForeSegment) {
                segment.setForeSegment(serpent.segments[serpent.segments.length - 1]);
            }
            serpent.segments.push(segment);
            serpent.pixels.push(...segment.pixels);
        }
        serpent.segmentCount = serpent.segments.length;
        serpent.position = Vector.fromJSON(json.position);
        serpent.position.round();
        return serpent;
    }

    // Override
    toJSON() {
        let json = super.toJSON();
        json.segments = [];
        for (const segment of this.segments) {
            json.segments.push(segment.toJSON());
        }
        json.position = this.position;
        json.direction = this.direction;
        json.speed = this.speed;
        return json;
    }

    // Override
    init(upgrades, segmentCount) {
        // Only need to set segment count if we haven't been loaded from save data.
        if (this.segments.length <= 0) {
            // Todo: get rid of this default 20
            this.segmentCount = segmentCount ? segmentCount : 20;
        }
        console.log("Initializing Serpent w/ segment count of " + this.segmentCount);
        super.init(upgrades);
        this.nextKillAllTime = performance.now() + Serpent.KILL_ALL_INTERVAL_MAX_MS;
    }

    // Override
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
                    1,
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
                size += 6;
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
        // Initialize in reverse order so the head is rendered on top.
        for (let i = this.segments.length - 1; i >= 0; i--) {
            this.segments[i].init();
        }
    }

    // Override
    get skyColors() {
        return {
            top: Serpent.BLACK_SKY,
            bottom: Serpent.BLACK_SKY,
        };
    }

    onResize(newSize) {
        this.width = newSize.x;
        this.height = newSize.y;
        this.layer.onResize(newSize);
        for (const segment of this.segments) {
            segment.bounds = new Vector(this.layer.width, this.layer.height);

            if (!segment.foreSegment && !segment.isWithinBounds(segment.position)) {
                segment.moveWithinBounds();
            }
        }
    }

    // Override
    update() {
        let allSegmentsOutsideBounds = true;
        for (const segment of this.segments) {
            this.needsUpdate = segment.update() || this.needsUpdate;
            if (!segment.isEntirelyOutsideBounds()) {
                allSegmentsOutsideBounds = false;
            }
        }
        if (this.loose && allSegmentsOutsideBounds) {
            this.serpentLooseCallback();
        }
        const now = performance.now();
        if (now > this.nextKillAllTime) {
            this.nextKillAllTime = Math.round(
                now +
                    MathExtras.randomBetween(
                        Serpent.KILL_ALL_INTERVAL_MIN_MS,
                        Serpent.KILL_ALL_INTERVAL_MAX_MS
                    )
            );
            this.killAll();
        }
        super.update();
    }

    killAll() {
        for (let i = 0; i < this.segments.length; i++) {
            setTimeout(() => {
                if (i >= this.segments.length) {
                    // This is possible if a segment gets destroyed before the timeout elapses.
                    return;
                }
                this.segments[i].killAll();
            }, i * Serpent.KILL_ALL_SEGMENT_OFFSET_MS);
        }
    }

    destroy() {
        for (const segment of this.segments) {
            segment.destroy();
        }
        this.segments = [];
        this.segmentCount = 0;
        super.destroy();
    }

    // When the callback is executed, the serpent will be automatically destroyed.
    letLoose(serpentLooseCallback) {
        this.serpentLooseCallback = serpentLooseCallback;
        this.loose = true;
        for (const segment of this.segments) {
            segment.loose = true;
        }
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

    // Override
    get renderBufferPct() {
        return 0;
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

        this.loose = false;

        this.pixels = [];
        this.surfacePixels = [];
    }

    static fromJSON(json, serpent) {
        let segment = new Segment(
            serpent,
            json.size,
            new Vector(serpent.width, serpent.height),
            Vector.fromJSON(json.position),
            Vector.fromJSON(json.direction),
            serpent.speed,
            serpent.upgrades
        );
        for (const pixelJson of json.pixels) {
            segment.pixels.push(Pixel.fromJSON(pixelJson, serpent.upgrades));
        }
        segment.history = [];
        for (const historyJSON of json.history) {
            segment.history.push({
                renderPosition: Vector.fromJSON(historyJSON.renderPosition),
                direction: Vector.fromJSON(historyJSON.direction),
            });
        }
        segment.historySize = segment.history.length;
        return segment;
    }

    toJSON() {
        let json = {
            size: this.size,
            position: this.position,
            direction: this.direction,
            pixels: this.pixels,
            history: this.history,
            hasForeSegment: this.foreSegment != null,
        };
        return json;
    }

    init() {
        this.generatePixels();
    }

    destroy() {
        this.pixels = [];
        this.surfacePixels = [];
        this.serpent = null;
        this.foreSegment = null;
        this.aftSegment = null;
        this.upgrades = null;
        this.history = [];
        this.historySize = 0;
    }

    speckle(pixel) {
        pixel.color = Color.wiggle(
            SerpentDiggable.SPECKLE_COLOR,
            SerpentDiggable.COLOR_VARIABILITY
        );
        pixel.surfaceColor = Color.wiggle(
            SerpentDiggable.SPECKLE_SURFACE_COLOR,
            SerpentDiggable.COLOR_VARIABILITY
        );
    }

    generateHeadPixels() {
        const extent = Math.floor(this.size / 2);
        const oneThirdExtent = Math.floor(this.size / 6);
        const headHeight = Math.floor(this.size * 0.5);
        const headWidth = Math.floor(this.size * 0.5);
        const headPointiness = 1.225;

        // Huh. This looks suspiciously similar to the egg function in EggPlanet.
        // Duplicate code? In MY project?
        function headShape(x, y) {
            return (
                y ** 2 / headHeight ** 2 + (x ** 2 * (1 + headPointiness ** -y)) / headWidth ** 2
            );
        }
        for (let x = -extent; x <= extent; x++) {
            for (let y = -extent; y <= extent; y++) {
                if (headShape(x, y) < 1) {
                    let coords = new Vector(x, y);
                    let pixel = this.serpent.addPixel(
                        Vector.add(this.renderPosition, coords),
                        PixelType.SERPENT
                    );
                    if (pixel) {
                        let speckleDx = y > 0 ? 1 : 0;
                        if (Math.abs(x) == oneThirdExtent + speckleDx && Math.abs(y) % 2 == 0) {
                            this.speckle(pixel);
                        }
                        this.pixels.push(pixel);
                    }
                }
            }
        }
    }

    generateBodyPixels() {
        const xExtent = Math.floor(
            this.size *
                MathExtras.scaleBetween(this.size, Serpent.MIN_SIZE, Serpent.MAX_SIZE, 0.45, 0.35)
        );
        const yExtent = Math.floor(this.size * 0.5);
        const speckleWidth = Math.floor(
            MathExtras.scaleBetween(this.size, Serpent.MIN_SIZE + 3, Serpent.MAX_SIZE, 0, 4)
        );
        function exclude(x, y) {
            return (
                (x == -xExtent && y == -yExtent) ||
                (x == xExtent && y == yExtent) ||
                (x == -xExtent && y == yExtent) ||
                (x == xExtent && y == -yExtent)
            );
        }
        for (let x = -xExtent; x <= xExtent; x++) {
            let speckleX = speckleWidth;
            let speckleDw = 1;
            for (let y = -yExtent; y <= yExtent; y++) {
                if (speckleX == 0 || speckleX == speckleWidth) {
                    speckleDw *= -1;
                }
                speckleX += speckleDw;
                if (this.size > 3 && exclude(x, y)) {
                    continue;
                }
                let coords = new Vector(x, y);
                let pixel = this.serpent.addPixel(
                    Vector.add(this.renderPosition, coords),
                    PixelType.SERPENT
                );
                if (pixel) {
                    if (speckleWidth > 0 && Math.abs(x) == speckleX) {
                        this.speckle(pixel);
                    } else if (speckleWidth == 0 && x == 0 && Math.abs(y) % 2 == 0) {
                        this.speckle(pixel);
                    }
                    this.pixels.push(pixel);
                }
            }
        }
    }

    generatePixels() {
        if (!this.foreSegment) {
            this.generateHeadPixels();
        } else {
            this.generateBodyPixels();
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

    isEntirelyOutsideBounds() {
        const halfSize = Math.floor(this.size / 2);
        const extraMargin = this.loose ? new Vector() : Vector.mult(this.bounds, 0.25);
        return (
            this.position.x + halfSize < -extraMargin.x ||
            this.position.x - halfSize >= this.bounds.x + extraMargin.x ||
            this.position.y + halfSize < -extraMargin.y ||
            this.position.y - halfSize >= this.bounds.y + extraMargin.y
        );
    }

    isWithinBounds(position) {
        const halfSize = Math.floor(this.size / 2);
        return (
            position.x - halfSize >= Serpent.BORDER_BUFFER_PIXELS &&
            position.x + halfSize < this.bounds.x - Serpent.BORDER_BUFFER_PIXELS &&
            position.y - halfSize >= Serpent.BORDER_BUFFER_PIXELS &&
            position.y + halfSize < this.bounds.y - Serpent.BORDER_BUFFER_PIXELS
        );
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
        if (this.loose) {
            return true;
        }
        let nextRenderPosition = Vector.add(this.position, Vector.mult(this.direction, this.speed));
        nextRenderPosition.round();
        return this.isWithinBounds(nextRenderPosition);
    }

    killAll() {
        this.killAllAnimationFrame = Serpent.KILL_ALL_ANIMATION_FRAMES;
    }

    // Returns true if we actually moved (i.e. renderPosition changed),
    // false otherwise.
    update() {
        if (this.pixels.length == 0) {
            return false;
        }
        if (this.killAllAnimationFrame > 0) {
            this.killAllAnimationFrame--;
            for (const pixel of this.pixels) {
                if (this.killAllAnimationFrame == 0) {
                    pixel.unsetColorOverride();
                } else {
                    pixel.setColorOverride(Color.WHITE);
                }
            }
        }
        if (!this.foreSegment) {
            // We're a head segment, decide if we're going to turn.
            let forcedToTurn = !this.canMoveForward();
            let turnChance = this.loose
                ? 0 // A loose serpent never turns.
                : MathExtras.scaleBetween(
                      this.renderPositionChangesSinceLastTurn,
                      0,
                      Math.min(this.bounds.x, this.bounds.y),
                      0,
                      this.MAX_TURN_CHANCE_PCT
                  );
            if (forcedToTurn || 100 * Math.random() < turnChance) {
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
                if (window.DEBUG) {
                    console.log(
                        Serpent.TAG +
                            "Head segment turning. Went from " +
                            this.mostRecentState.direction.toString() +
                            " to " +
                            this.direction.toString()
                    );
                }
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
            // This should be rare.
            if (!this.foreSegment) {
                console.warn(Serpent.TAG + "180");
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
                if (!this.foreSegment && window.DEBUG) {
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
                if (!this.foreSegment && window.DEBUG) {
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
