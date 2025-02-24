import PixelBody from "./pixel_body.js";

export default class Planet extends PixelBody {
    constructor(className, width, height) {
        if (new.target === Planet) {
            throw new Error("Cannot instantiate abstract class Planet directly.");
        }
        super(className, width, height);
        this.radius = Math.max(width, height) / 2;
        // For optimizations
        this.oneOverRadius = 1 / this.radius;
        this.oneOverRadiusSquared = this.oneOverRadius * this.oneOverRadius;
    }

    toJSON() {
        let json = super.toJSON();
        json.radius = this.radius;
        return json;
    }

    updateSurface() {
        let surfacePixelCountBefore = this.surfacePixels.length;
        super.updateSurface();
        if (surfacePixelCountBefore != this.surfacePixels.length) {
            this.updateDarkness();
        }
    }

    updateDarkness() {
        for (const pixel of this.pixels) {
            let nearestSurfacePixel = this.getClosestSurfacePixel(pixel.position);
            if (!nearestSurfacePixel) {
                pixel.darkness = 0;
                continue;
            }
            let distanceToSurface = nearestSurfacePixel.position.dist(pixel.position);
            // Original calculation:
            // pixel.darkness = 1 - (this.radius - distanceToSurface) ** 2 / this.radius ** 2;
            // Optimized to use pre-computed values and reduce division:
            pixel.darkness =
                2 * distanceToSurface * this.oneOverRadius -
                distanceToSurface * distanceToSurface * this.oneOverRadiusSquared;
        }
    }
}
