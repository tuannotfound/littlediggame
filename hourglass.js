import Vector from "./vector.js";
import Layer from "./layer.js";
import Color from "./color.js";
import MathExtras from "./math_extras.js";

class SandPixel {
    static BASE_COLOR = new Color(194, 167, 95).immutableCopy();

    constructor(x, y) {
        this.position = new Vector(x, y);
        this.color = Color.wiggle(SandPixel.BASE_COLOR, 5);
    }
}

class PhysicsSandPixel extends SandPixel {
    static UNMOVED_FRAMES_BEFORE_INACTIVE = 5;
    constructor(x, y, xMin, xMax, yMax) {
        super(x, y);
        this.xMin = xMin;
        this.xMax = xMax;
        this.yMax = yMax;
        this.prevPosition = this.position.copy();
        this.renderPosition = this.position.copy();
        this.renderPosition.round();
        this.prevRenderPosition = this.renderPosition.copy();

        this.friction = 0.5;
        this.groundFriction = 0.25;
        this.slipped = false;

        this.gravity = new Vector(0, 1);

        this.mass = 1;
        this.unmovedFrames = 0;
        this.active = true;
    }

    update() {
        if (!this.active) {
            return;
        }
        let velocity = Vector.sub(this.position, this.prevPosition);
        velocity.mult(this.friction);

        if (this.slipped) {
            velocity.mult(this.groundFriction);
            this.slipped = false;
        }

        let newPosition = this.position.copy();
        this.prevPosition.setXY(this.position.x, this.position.y);
        newPosition.add(velocity);
        newPosition.add(this.gravity);

        this.position.set(newPosition);
        this.prevRenderPosition = this.renderPosition.copy();
        this.renderPosition.set(newPosition);
        this.renderPosition.round();
    }
    setActive(active) {
        if (this.active == active) {
            return;
        }
        this.active = active;
        if (active) {
            this.unmovedFrames = 0;
        }
    }

    checkCollision(othersMap) {
        if (!this.active) {
            return;
        }

        // Check collision against others
        let key = this.renderPosition.toString();
        let didCollide = othersMap.has(key);
        if (didCollide) {
            this.checkSlipCollision(othersMap);
        }
    }

    checkSlipCollision(othersMap) {
        let positionsToCheck = [
            new Vector(this.renderPosition.x - 1, this.renderPosition.y + 1),
            new Vector(this.renderPosition.x + 1, this.renderPosition.y + 1),
        ];
        for (const position of positionsToCheck) {
            if (!othersMap.has(position.toString())) {
                this.slipped = true;
                this.position.set(position);
                this.renderPosition.set(position);
                return;
            }
        }
        // Didn't find a spot to slip into, just revert back to the previous position.
        this.position.set(this.prevPosition);
        this.renderPosition.set(this.prevRenderPosition);
    }

    checkBounds() {
        if (this.renderPosition.x < this.xMin || this.renderPosition.x > this.xMax) {
            this.renderPosition.x = MathExtras.clamp(this.renderPosition.x, this.xMin, this.xMax);
            this.position.x = this.renderPosition.x;
        } else if (this.renderPosition.y > this.yMax) {
            this.renderPosition.y = this.yMax;
            this.position.y = this.renderPosition.y;
        }
    }

    checkInactive() {
        if (
            this.renderPosition.x == this.prevRenderPosition.x &&
            this.renderPosition.y == this.prevRenderPosition.y
        ) {
            if (this.active) {
                this.unmovedFrames++;
            }
        } else {
            this.unmovedFrames = 0;
            this.setActive(true);
        }
        if (this.unmovedFrames >= PhysicsSandPixel.UNMOVED_FRAMES_BEFORE_INACTIVE) {
            this.setActive(false);
        }
    }
}

export default class Hourglass {
    static TOP_BOTTOM_HEIGHT_PCT = 5;
    static GLASS_WIDTH_PCT = 90;
    static GLASS_VERTICAL_PCT = 30;
    static GLASS_WAIST_WIDTH_PCT = 0;
    static SAND_FILL_PCT = 80;

    constructor(width, height, durationSeconds, elapsedSeconds = 0) {
        this.size = new Vector(width, height);
        this.size.round(); // Just in case.
        this.durationSeconds = durationSeconds;
        this.elapsedSeconds = elapsedSeconds;
        this.layer = new Layer("hourglass", width, height);

        this.center = new Vector(width / 2, height / 2);
        this.center.ceil();

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

        this.decorationColor = new Color(99, 93, 86);
        this.glassColor = new Color(210, 237, 247);
        this.sandColor = new Color(194, 167, 95);

        this.secondsPerSand = 0;

        this.initialized = false;

        // tmp
        this.dropped = 0;
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
        let yMin = (this.center.y * (100 - Hourglass.SAND_FILL_PCT)) / 100;
        let yMax = this.center.y;

        for (let y = yMin; y < yMax; y++) {
            let layer = [];
            let leftBound = this.glassPixels.get(y) + 3;
            let rightBound = this.size.x - leftBound;
            for (let x = leftBound; x < rightBound; x++) {
                layer.push(new SandPixel(x, y));
            }
            this.staticSandPixels.set(y, layer);
        }
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
            if (!physicsPixel.active) {
                continue;
            }
            physicsPixel.update();
            physicsPixel.checkBounds();
            physicsPixel.checkCollision(updatedPhysicsSandPixels);
            //physicsPixel.checkBounds();
            physicsPixel.checkInactive();
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
        if (this.dropped == 2) {
            return;
        }
        this.dropped++;
        console.log("dropSand");
        // Remove a piece of sand from the top layer
        // let smallestKey = this.staticSandPixels.keys().sort()[0];
        // let layer = this.staticSandPixels.get(smallestKey);
        let smallestKey = this.staticSandPixels.keys().reduce((a, b) => Math.min(a, b), Infinity);
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
        // Shift the colors slightly to give the effect of the sand shifting
        for (const layer of this.staticSandPixels.values()) {
            for (const sandPixel of layer) {
                sandPixel.color = Color.wiggle(sandPixel.color, 2);
            }
        }
        this.queuedSandPixels.push(
            new PhysicsSandPixel(
                this.center.x,
                this.center.y,
                0,
                this.size.x,
                this.size.y - this.topBottomHeight - 1
            )
        );
    }

    updateRenderData() {
        let imageData = this.layer
            .getContext()
            .createImageData(this.layer.width, this.layer.height);

        for (const pixel of this.decorationPixels) {
            let index = (pixel.x + pixel.y * imageData.width) * 4;
            imageData.data[index] = this.decorationColor.r; // Red
            imageData.data[index + 1] = this.decorationColor.g; // Green
            imageData.data[index + 2] = this.decorationColor.b; // Blue
            imageData.data[index + 3] = this.decorationColor.a; // Alpha
        }
        for (const layer of this.staticSandPixels.values()) {
            for (const sandPixel of layer) {
                let index = (sandPixel.position.x + sandPixel.position.y * imageData.width) * 4;
                imageData.data[index] = sandPixel.color.r; // Red
                imageData.data[index + 1] = sandPixel.color.g; // Green
                imageData.data[index + 2] = sandPixel.color.b; // Blue
                imageData.data[index + 3] = sandPixel.color.a; // Alpha
            }
        }
        for (const physicsPixel of this.physicsSandPixels.values()) {
            let index =
                (physicsPixel.renderPosition.x + physicsPixel.renderPosition.y * imageData.width) *
                4;
            imageData.data[index] = physicsPixel.color.r; // Red
            imageData.data[index + 1] = physicsPixel.color.g; // Green
            imageData.data[index + 2] = physicsPixel.color.b; // Blue
            imageData.data[index + 3] = physicsPixel.color.a; // Alpha
        }
        for (const [y, x] of this.glassPixels) {
            // Left side
            let index = (x + y * imageData.width) * 4;
            imageData.data[index] = this.glassColor.r; // Red
            imageData.data[index + 1] = this.glassColor.g; // Green
            imageData.data[index + 2] = this.glassColor.b; // Blue
            imageData.data[index + 3] = this.glassColor.a; // Alpha
            // Mirrored right side
            let mirrorX = this.size.x - x - 1;
            index = (mirrorX + y * imageData.width) * 4;
            imageData.data[index] = this.glassColor.r; // Red
            imageData.data[index + 1] = this.glassColor.g; // Green
            imageData.data[index + 2] = this.glassColor.b; // Blue
            imageData.data[index + 3] = this.glassColor.a; // Alpha
        }

        this.layer.getContext().putImageData(imageData, 0, 0);
    }
}
