import Layer from "./layer.js";
import Pixel from "./pixel.js";
import Quadtree from "@timohausmann/quadtree-js";
import Vector from "./vector.js";

export default class Planet {
    constructor(gameBounds, width, height) {
        if (new.target === Planet) {
            throw new Error("Cannot instantiate abstract class Planet directly.");
        }
        this.gameBounds = gameBounds;
        this.width = width;
        this.height = height;
        this.radius = Math.max(width, height) / 2;
        this.layer = new Layer("planet", this.gameBounds.x * 1, this.gameBounds.y * 1);
        console.log("Planet layer size: " + this.layer.width + "x" + this.layer.height + "px");
        this.center = new Vector(this.layer.width / 2, this.layer.height / 2);
        this.pixels = [];
        this.pixelPositions = new Map();
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
    }

    init() {
        this.layer.initOffscreen();

        this.createPlanetData();
        this.initialCount = this.pixels.length;
    }

    update() {
        this.pixelPositions.clear();
        this.quadtree.clear();
        for (let pixel of this.pixels) {
            this.quadtree.insert(pixel);
        }
        let imageData = this.layer
            .getContext()
            .createImageData(this.layer.width, this.layer.height);
        for (let pixel of this.pixels) {
            pixel.update();
            pixel.checkCollision(this.quadtree);
            pixel.checkInactive();
            pixel.render(imageData);
            // Optimizations:
            this.pixelPositions.set(pixel.renderPosition.toString(), pixel);
            let distToCenter = pixel.position.dist(this.center);
            if (distToCenter > this.furthestPixelDistance) {
                this.furthestPixelDistance = distToCenter;
            }
        }
        this.layer.getContext().putImageData(imageData, 0, 0);
    }

    addPixel(position, color) {
        if (this.getPixel(position)) {
            return false;
        }
        console.log("addPixel @ " + position.toString());
        let pixel = new Pixel(position, color, this.center);
        this.pixels.push(pixel);
        this.pixelPositions.set(pixel.renderPosition.toString(), pixel);
        return true;
    }

    removePixelAt(position) {
        let pixel = this.pixelPositions.get(position.toString());
        if (pixel) {
            return this.removePixel(pixel);
        }
        return false;
    }

    removePixel(pixel) {
        let index = this.pixels.indexOf(pixel);
        if (index > -1) {
            this.pixels.splice(index, 1);
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

    colorClamp(value) {
        return this.clamp(value, 0, 255);
    }

    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    polarToCartesian(r, theta) {
        return new Vector(
            Math.round(this.center.x + r * Math.cos(theta)),
            Math.round(this.center.y + r * Math.sin(theta))
        );
    }

    cartesianToPolar(cartesianPosition) {
        return {
            r: Math.sqrt(
                Math.pow(cartesianPosition.x - this.center.x, 2) +
                    Math.pow(cartesianPosition.y - this.center.y / 2, 2)
            ),
            theta: Math.atan2(
                cartesianPosition.y - this.center.y / 2,
                cartesianPosition.x - this.center.x / 2
            ),
        };
    }

    // May return None
    getPixel(position) {
        let pixel = this.pixelPositions.get(position.toString());
        return pixel;
    }

    eat(r, theta) {
        let position = this.polarToCartesian(r, theta);
        return this.removePixelAt(position);
    }

    getHealth() {
        return this.pixels.length / this.initialCount;
    }
}
