import PhysicsPixel from "./physics_pixel.js";
import Quadtree from "@timohausmann/quadtree-js";
import Vector from "./vector.js";
import Planet from "./planet2.js";

export default class PhysicsPlanet extends Planet {
    PLANET_SURFACE_UPDATE_INTERVAL_MS = 500;

    constructor(gameBounds, width, height) {
        super(gameBounds, width, height);
        this.furthestPixelDistance = 0;
        // https://github.com/timohausmann/quadtree-js
        this.quadtree = new Quadtree(
            {
                x: 0,
                y: 0,
                width: this.layer.width,
                height: this.layer.height,
            },
            10,
            20
        );
        this.surfaceUpdateTimeoutId = null;
    }

    update() {
        this.quadtree.clear();
        for (let pixel of this.pixels) {
            this.quadtree.insert(pixel);
        }
        super.update();
    }

    updatePixel(pixel, imageData) {
        pixel.update();
        pixel.checkCollision(this.quadtree);
        pixel.checkInactive();
        super.updatePixel(pixel, imageData);
        // Optimizations:
        let distToCenter = pixel.position.dist(this.center);
        if (distToCenter > this.furthestPixelDistance) {
            this.furthestPixelDistance = distToCenter;
        }
    }

    createPixel(position, color) {
        let pixel = new PhysicsPixel(position, color, this.center);
        pixel.addListener({
            onActiveStateChanged: (pixel) => {
                this.updatePlanetSurfaceOnQuiescence();
            },
        });
        return pixel;
    }

    updatePlanetSurfaceOnQuiescence() {
        if (this.surfaceUpdateTimeoutId) {
            clearTimeout(this.surfaceUpdateTimeoutId);
        }
        this.surfaceUpdateTimeoutId = setTimeout(() => {
            this.updatePlanetSurface();
        }, this.PLANET_SURFACE_UPDATE_INTERVAL_MS);
    }

    removePixel(pixel) {
        if (super.removePixel(pixel)) {
            this.reactivateFrom(pixel.position);
            return true;
        }
        return false;
    }

    reactivateFrom(reactivationPosition) {
        // Reactivate pixels that are radially outward from the removed pixel
        let radialVec = reactivationPosition.copy();
        radialVec.sub(this.center);
        let minRadius = radialVec.mag();

        // Calculate the angle of the radialVec
        const angle = Math.atan2(radialVec.y, radialVec.x);
        for (let r = minRadius; r <= this.furthestPixelDistance; r += 0.25) {
            for (let theta = angle - 0.01; theta < angle + 0.01; theta += 0.001) {
                let x = Math.round(this.center.x + r * Math.cos(theta));
                let y = Math.round(this.center.y + r * Math.sin(theta));
                let position = new Vector(x, y);
                let pixel = this.pixelPositions.get(position.toString());
                if (pixel) {
                    pixel.setActive(true);
                }
            }
        }
    }

    createPlanetData() {
        throw new Error("Method 'createPlanetData()' must be implemented in derived classes.");
    }
}
