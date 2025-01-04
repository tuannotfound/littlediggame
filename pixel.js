import Vector from "./vector.js";

export default class Pixel {
    UNMOVED_FRAMES_BEFORE_INACTIVE = 30;
    INACTIVE_COLOR = { r: 125, g: 125, b: 125, a: 255 };
    SURFACE_COLOR = { r: 60, g: 180, b: 90, a: 255 };

    constructor(position, color, gravityCenter) {
        this.position = position.copy();
        this.color = color;
        this.gravityCenter = gravityCenter.copy();

        this.renderPosition = position.copy();
        this.renderPosition.round();
        this.isSurface = false;

        this.surfaceColor = this.generateSurfaceColor();
    }

    generateSurfaceColor() {
        let surfaceColor = {
            r: this.SURFACE_COLOR.r,
            g: this.SURFACE_COLOR.g,
            b: this.SURFACE_COLOR.b,
            a: this.SURFACE_COLOR.a,
        };

        surfaceColor.r += Math.min(255, Math.max(0, (Math.random() * 2 - 1) * 10));
        surfaceColor.g += Math.min(255, Math.max(0, (Math.random() * 2 - 1) * 10));
        surfaceColor.b += Math.min(255, Math.max(0, (Math.random() * 2 - 1) * 10));
        return surfaceColor;
    }

    getRenderColor() {
        return this.isSurface ? this.surfaceColor : this.color;
    }

    render(imageData) {
        if (this.renderPosition.x < 0 || this.renderPosition.x >= imageData.width) {
            return;
        }
        if (this.renderPosition.y < 0 || this.renderPosition.y >= imageData.height) {
            return;
        }
        let pixelIndex = (this.renderPosition.x + this.renderPosition.y * imageData.width) * 4;
        let color = this.getRenderColor();
        imageData.data[pixelIndex] = color.r; // Red
        imageData.data[pixelIndex + 1] = color.g; // Green
        imageData.data[pixelIndex + 2] = color.b; // Blue
        imageData.data[pixelIndex + 3] = color.a; // Alpha
    }

    setSurface(isSurface) {
        this.isSurface = isSurface;
    }

    // Needed for quad tree
    get x() {
        return this.renderPosition.x;
    }

    get y() {
        return this.renderPosition.y;
    }

    get width() {
        return 1;
    }

    get height() {
        return 1;
    }

    get surface() {
        return this.isSurface;
    }
}
