import PixelBody from "./pixel_body.js";
import Color from "../color.js";

export default class Planet extends PixelBody {
    static SKY_TOP = new Color(237, 253, 255).immutableCopy();
    static SKY_BOTTOM = new Color(185, 230, 250).immutableCopy();

    constructor(width, height) {
        if (new.target === Planet) {
            throw new Error("Cannot instantiate abstract class Planet directly.");
        }
        super(width, height);
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

    get skyColors() {
        return {
            top: Planet.SKY_TOP,
            bottom: Planet.SKY_BOTTOM,
        };
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
