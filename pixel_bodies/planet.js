import PixelBody from "./pixel_body.js";

export default class Planet extends PixelBody {
    constructor(className, width, height) {
        if (new.target === Planet) {
            throw new Error("Cannot instantiate abstract class Planet directly.");
        }
        super(className, width, height);
        this.radius = Math.max(width, height) / 2;
    }

    toJSON() {
        let json = super.toJSON();
        json.radius = this.radius;
        return json;
    }

    updateSurface() {
        super.updateSurface();
        this.updateDarkness();
    }

    updateDarkness() {
        for (const pixel of this.pixels) {
            let nearestSurfacePixel = this.getClosestSurfacePixel(pixel.position);
            if (!nearestSurfacePixel) {
                pixel.darkness = 0;
                continue;
            }
            let distanceToSurface = nearestSurfacePixel.position.dist(pixel.position);
            pixel.darkness = 1 - (this.radius - distanceToSurface) ** 2 / this.radius ** 2;
        }
    }
}
