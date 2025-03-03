import Vector from "./vector.js";
import Layer from "./layer.js";
import Color from "./color.js";
import MathExtras from "./math_extras.js";

class SandPixel {
    static BASE_COLOR = new Color(194, 167, 95).immutableCopy();

    constructor(x, y) {
        this.position = new Vector(x, y);
        this.color = Color.wiggle(SandPixel.BASE_COLOR, 10);
    }
}

class PhysicsSandPixel extends SandPixel {
    static UNMOVED_FRAMES_BEFORE_INACTIVE = 5;
    constructor(x, y, xMin, xMax, yMax) {
        super(x, y);
        this.xMin = xMin;
        this.xMax = xMax;
        this.yMax = yMax;

        this.prevPosition = new Vector(this.position);
        this.renderPosition = new Vector(this.position);
        this.renderPosition.round();
        this.prevRenderPosition = new Vector(this.renderPosition);

        this.slipped = false;

        this.gravity = new Vector(0, 0.1);
    }

    update(deltaTimeMs, othersMap) {
        //let deltaTime = deltaTimeMs / 1000;
        let velocity = Vector.sub(this.position, this.prevPosition);
        if (this.slipped) {
            // Slip friction;
            this.slipped = false;
            //velocity.x *= 0.1;
            velocity.x = 0;
            velocity.y *= 0.25;
        }
        // Friction
        // velocity.mult(0.75);
        // if (velocity.mag() < 0.01) {
        //     velocity.set(0, 0);
        // }
        this.prevPosition.set(this.position);
        this.prevRenderPosition.set(this.renderPosition);

        let deltaTimeSquared = 0.5; //deltaTime * deltaTime;
        let velocityDelta = Vector.mult(this.gravity, deltaTimeSquared);
        let positionDelta = Vector.add(velocity, velocityDelta);
        let newPosition = Vector.add(this.position, positionDelta);
        this.limitToBounds(newPosition);
        let newRenderPosition = new Vector(newPosition);
        newRenderPosition.round();

        let atopAnother = false;
        let key = newRenderPosition.toString();
        // Look upwards until we find a pixel to rest upon.
        while (othersMap.has(key) && othersMap.get(key) !== this) {
            atopAnother = true;
            newRenderPosition.y -= 1;
            key = newRenderPosition.toString();
            if (newRenderPosition.y <= 0) {
                break;
            }
        }
        if (atopAnother) {
            // Now see if we can slip to the left or right.
            let renderPositionsToCheck = [
                new Vector(newRenderPosition.x - 1, newRenderPosition.y + 1),
                new Vector(newRenderPosition.x + 1, newRenderPosition.y + 1),
            ];
            if (Math.random() < 0.5) {
                renderPositionsToCheck.reverse();
            }
            for (const position of renderPositionsToCheck) {
                this.limitToBounds(position);
                if (!othersMap.has(position.toString())) {
                    newRenderPosition.set(position);
                    newPosition.set(position);
                    this.slipped = true;
                    break;
                }
            }
        }
        this.renderPosition.set(newRenderPosition);
        this.position.set(newPosition);
    }

    limitToBounds(position) {
        position.x = MathExtras.clamp(position.x, this.xMin, this.xMax - 1);
        position.y = MathExtras.clamp(position.y, 0, this.yMax);
    }
}

export default class Hourglass {
    static TOP_BOTTOM_HEIGHT_PCT = 5;
    static GLASS_WIDTH_PCT = 90;
    static GLASS_VERTICAL_PCT = 30;
    static GLASS_WAIST_WIDTH_PCT = 0;
    static SAND_FILL_PCT = 70;
    static INITIAL_ALPHA = 0;
    static FINAL_ALPHA = 90;
    static FINAL_ALPHA_PROGRESS = 0.5;

    constructor(width, height, durationSeconds, elapsedSeconds = 0) {
        this.size = new Vector(width, height);
        this.size.round(); // Just in case.
        this.durationSeconds = durationSeconds;
        this.elapsedSeconds = elapsedSeconds;
        this.layer = new Layer("hourglass", width, height);

        this.center = new Vector(width / 2, height / 2);
        this.center.floor();

        this.topBottomHeight = Math.ceil((this.size.y * Hourglass.TOP_BOTTOM_HEIGHT_PCT) / 100);
        this.decorationPixels = [];
        // The position data for the 1-pixel-thick left-side of the symmetric hourglass.
        // Maps y-coord => x-cord
        this.glassPixels = new Map();
        // Layers of sand, mapping y-coords to arrays of staticSandPixels at that layer
        this.staticSandPixels = new Map();
        // Position vector string => PhysicsSandPixel
        this.physicsSandPixels = new Map();
        this.centerKey = this.center.toString();
        this.queuedSandPixels = [];

        // Figured out later during static sand generation.
        this.sandHorizontalMarginMin = 0;

        this.decorationColor = new Color(99, 93, 86);
        this.glassColor = new Color(210, 237, 247);
        this.sandColor = new Color(194, 167, 95);

        this.secondsPerSand = 0;

        this.initialized = false;
    }

    init() {
        this.layer.initOffscreen();
        this.generateDecoration();
        this.generateGlass();
        this.generateSand();
        this.updateRenderData();

        let sandPixelCount = this.staticSandPixels.values().reduce((a, b) => a + b.length, 0);
        this.secondsPerSand = this.durationSeconds / sandPixelCount;
        console.log(sandPixelCount + " sand pixels, so secondsPerSand = " + this.secondsPerSand);

        this.initialized = true;
    }

    generateDecoration() {
        // Draw two rectangles at the top and bottom
        // Horizontal lines
        for (let x = 0; x < this.size.x; x++) {
            this.decorationPixels.push(new Vector(x, 0));
            if (x > 0 && x < this.size.x - 1) {
                this.decorationPixels.push(new Vector(x, this.topBottomHeight - 1));
                this.decorationPixels.push(new Vector(x, this.size.y - this.topBottomHeight));
            }
            this.decorationPixels.push(new Vector(x, this.size.y - 1));
        }
        // Vertical lines
        for (let y = 0; y < this.topBottomHeight - 1; y++) {
            this.decorationPixels.push(new Vector(0, y));
            this.decorationPixels.push(new Vector(this.size.x - 1, y));
            this.decorationPixels.push(new Vector(0, this.size.y - 1 - y));
            this.decorationPixels.push(new Vector(this.size.x - 1, this.size.y - 1 - y));
        }
    }

    generateGlass() {
        let glassWidth = Math.floor((this.size.x * Hourglass.GLASS_WIDTH_PCT) / 100);
        let glassHorizontalMargin = Math.ceil((this.size.x - glassWidth) / 2);
        let glassHeight = this.size.y - 2 * this.topBottomHeight;
        let glassVerticalHeight = Math.ceil((glassHeight * Hourglass.GLASS_VERTICAL_PCT) / 100);
        let glassWaistHeight = glassHeight - 2 * glassVerticalHeight;
        // Draw the vertical sections of the glass
        let x = glassHorizontalMargin;
        for (let j = 0; j < 2; j++) {
            let yOffset = this.topBottomHeight + j * (glassVerticalHeight + glassWaistHeight);
            for (let y = yOffset; y < yOffset + glassVerticalHeight; y++) {
                this.addOutlinePixel(x, y);
            }
        }

        // Draw a parabola stretching from the left of the glass to the right
        let glassWaistWidth = 0; //Math.ceil((this.size.x * Hourglass.GLASS_WAIST_WIDTH_PCT) / 100);
        let glassWaistPtA = new Vector(
            glassHorizontalMargin,
            this.topBottomHeight + glassVerticalHeight
        );
        let glassWaistPtB = new Vector(this.size.x - glassHorizontalMargin - 1, glassWaistPtA.y);

        let a = (-4 * (glassWaistHeight / 2)) / (glassWaistPtA.x - glassWaistPtB.x) ** 2;
        for (let x = glassWaistPtA.x; x < this.center.x - glassWaistWidth / 2 - 1; x += 0.25) {
            let y = glassWaistPtA.y + a * (x - glassWaistPtA.x) * (x - glassWaistPtB.x);
            let position = new Vector(x, y);
            position.round();
            let inverted = new Vector(position.x, this.size.y - position.y - 1);
            this.addOutlinePixel(position.x, position.y);
            this.addOutlinePixel(inverted.x, inverted.y);
        }
    }

    addOutlinePixel(x, y) {
        let key = Math.round(y);
        if (this.glassPixels.has(key)) {
            return;
        }
        this.glassPixels.set(key, Math.round(x));
    }

    generateSand() {
        let yMin = Math.round((this.center.y * (100 - Hourglass.SAND_FILL_PCT)) / 100);
        let yMax = this.center.y;

        let xMin = Infinity;
        for (let y = yMin; y < yMax; y++) {
            let layer = [];
            let leftBound = this.glassPixels.get(y) + 3;
            xMin = Math.min(xMin, leftBound);
            let rightBound = this.size.x - leftBound;
            for (let x = leftBound; x < rightBound; x++) {
                layer.push(new SandPixel(x, y));
            }
            this.staticSandPixels.set(y, layer);
        }
        this.sandHorizontalMarginMin = xMin;
    }

    get progress() {
        return this.durationSeconds > 0 ? this.elapsedSeconds / this.durationSeconds : 1;
    }

    update(elapsedMs) {
        if (!this.initialized) {
            return;
        }
        let elapsedBefore = MathExtras.floorToNearest(this.secondsPerSand, this.elapsedSeconds);
        this.elapsedSeconds += elapsedMs / 1000;
        let elapsedAfter = MathExtras.floorToNearest(this.secondsPerSand, this.elapsedSeconds);

        if (elapsedAfter > elapsedBefore) {
            this.dropSand();
            this.updateRenderData();
        }

        if (this.queuedSandPixels.length > 0) {
            if (!this.physicsSandPixels.has(this.centerKey)) {
                this.physicsSandPixels.set(this.centerKey, this.queuedSandPixels.shift());
            }
        }
        let updatedPhysicsSandPixels = new Map(this.physicsSandPixels);
        let updateCount = 0;
        for (let physicsPixel of this.physicsSandPixels.values()) {
            // if (!physicsPixel.active) {
            //     continue;
            // }
            physicsPixel.update(elapsedMs, updatedPhysicsSandPixels);
            if (!Vector.equals(physicsPixel.renderPosition, physicsPixel.prevRenderPosition)) {
                updatedPhysicsSandPixels.delete(physicsPixel.prevRenderPosition.toString());
                updatedPhysicsSandPixels.set(physicsPixel.renderPosition.toString(), physicsPixel);
                updateCount++;
            }
        }
        if (updateCount > 0) {
            this.physicsSandPixels = updatedPhysicsSandPixels;
            this.updateRenderData();
        }
    }

    dropSand() {
        // Remove a piece of sand from the top layer
        // let smallestKey = this.staticSandPixels.keys().sort()[0];
        // let layer = this.staticSandPixels.get(smallestKey);
        let smallestKey = this.staticSandPixels.keys().reduce((a, b) => Math.min(a, b), Infinity);
        if (smallestKey == Infinity) {
            // Time is up!
            return;
        }
        let layer = this.staticSandPixels.get(smallestKey);
        // Randomly remove one of the pixels, but favor the middle.
        let centeringBiasStrength = 5; // 1 = no bias, 0 = ... broken.
        let rand = 0;
        for (let i = 0; i < centeringBiasStrength; i++) {
            rand += Math.random();
        }
        rand /= centeringBiasStrength;
        let index = Math.floor(rand * layer.length);
        layer.splice(index, 1);
        if (layer.length === 0) {
            this.staticSandPixels.delete(smallestKey);
        }
        // Shift some of the colors slightly to give the effect of the gains of sand shifting
        // as the hourglass drains.
        for (const layer of this.staticSandPixels.values()) {
            for (const sandPixel of layer) {
                if (Math.random() > 0.05) {
                    continue;
                }
                sandPixel.color = Color.wiggle(SandPixel.BASE_COLOR, 5);
            }
        }
        this.queuedSandPixels.push(
            new PhysicsSandPixel(
                this.center.x,
                this.center.y,
                this.sandHorizontalMarginMin,
                this.size.x - this.sandHorizontalMarginMin,
                this.size.y - this.topBottomHeight - 1
            )
        );
    }

    get renderAlpha() {
        return Math.round(
            MathExtras.scaleBetween(
                this.progress,
                0,
                Hourglass.FINAL_ALPHA_PROGRESS,
                Hourglass.INITIAL_ALPHA,
                Hourglass.FINAL_ALPHA
            )
        );
    }

    updateRenderData() {
        let imageData = this.layer
            .getContext()
            .createImageData(this.layer.width, this.layer.height);

        let alpha = this.renderAlpha;
        for (const pixel of this.decorationPixels) {
            let index = (pixel.x + pixel.y * imageData.width) * 4;
            imageData.data[index] = this.decorationColor.r; // Red
            imageData.data[index + 1] = this.decorationColor.g; // Green
            imageData.data[index + 2] = this.decorationColor.b; // Blue
            imageData.data[index + 3] = alpha; // Alpha
        }
        for (const layer of this.staticSandPixels.values()) {
            for (const sandPixel of layer) {
                let index = (sandPixel.position.x + sandPixel.position.y * imageData.width) * 4;
                imageData.data[index] = sandPixel.color.r; // Red
                imageData.data[index + 1] = sandPixel.color.g; // Green
                imageData.data[index + 2] = sandPixel.color.b; // Blue
                imageData.data[index + 3] = alpha; // Alpha
            }
        }
        for (const physicsPixel of this.physicsSandPixels.values()) {
            let index =
                (physicsPixel.renderPosition.x + physicsPixel.renderPosition.y * imageData.width) *
                4;
            imageData.data[index] = physicsPixel.color.r; // Red
            imageData.data[index + 1] = physicsPixel.color.g; // Green
            imageData.data[index + 2] = physicsPixel.color.b; // Blue
            imageData.data[index + 3] = alpha; // Alpha
        }
        for (const [y, x] of this.glassPixels) {
            // Left side
            let index = (x + y * imageData.width) * 4;
            imageData.data[index] = this.glassColor.r; // Red
            imageData.data[index + 1] = this.glassColor.g; // Green
            imageData.data[index + 2] = this.glassColor.b; // Blue
            imageData.data[index + 3] = alpha; // Alpha
            // Mirrored right side
            let mirrorX = this.size.x - x - 1;
            index = (mirrorX + y * imageData.width) * 4;
            imageData.data[index] = this.glassColor.r; // Red
            imageData.data[index + 1] = this.glassColor.g; // Green
            imageData.data[index + 2] = this.glassColor.b; // Blue
            imageData.data[index + 3] = alpha; // Alpha
        }

        this.layer.getContext().putImageData(imageData, 0, 0);
    }
}
