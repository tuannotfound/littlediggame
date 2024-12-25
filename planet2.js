import Layer from "./layer.js";
import Pixel from "./pixel.js";
import Quadtree from "@timohausmann/quadtree-js";
import Vector from "./vector.js";

export default class Planet {
    constructor(width, height) {
        if (new.target === Planet) {
            throw new Error("Cannot instantiate abstract class Planet directly.");
        }
        this.width = width;
        this.height = height;
        this.bounds = new Vector(width, height);
        this.radius = Math.max(width, height) / 2;
        this.layer = new Layer("planet", this.width, this.height);
        this.pixels = [];
        this.pixelPositions = new Map();
        // https://github.com/timohausmann/quadtree-js
        this.quadtree = new Quadtree(
            {
                x: 0,
                y: 0,
                width: this.width,
                height: this.height,
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
        let imageData = this.layer.getContext().createImageData(this.width, this.height);
        for (let pixel of this.pixels) {
            pixel.update();
            pixel.constrain();
            pixel.checkCollision(this.quadtree);
            pixel.checkInactive();
            pixel.render(imageData);
            this.pixelPositions.set(pixel.renderPosition.toString(), pixel);
        }
        this.layer.getContext().putImageData(imageData, 0, 0);
    }

    addPixel(position, color) {
        if (this.getPixel(position)) {
            return false;
        }
        let pixel = new Pixel(position, color, this.bounds);
        this.pixels.push(pixel);
        this.pixelPositions.set(position.toString(), pixel);
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
        let radialVec = new Vector(
            reactivationPosition.x - this.width / 2,
            reactivationPosition.y - this.height / 2
        );
        let minRadius = radialVec.mag();

        // Calculate the angle of the radialVec
        const angle = Math.atan2(radialVec.y, radialVec.x);
        for (let r = minRadius; r < Math.max(this.width, this.height); r += 0.5) {
            let x = Math.round(this.width / 2 + r * Math.cos(angle));
            let y = Math.round(this.height / 2 + r * Math.sin(angle));
            let position = new Vector(x, y);
            let pixel = this.pixelPositions.get(position.toString());
            if (pixel) {
                pixel.setActive(true);
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
            Math.round(this.width / 2 + r * Math.cos(theta)),
            Math.round(this.height / 2 + r * Math.sin(theta))
        );
    }

    cartesianToPolar(cartesianPosition) {
        return {
            r: Math.sqrt(
                Math.pow(cartesianPosition.x - this.width / 2, 2) +
                    Math.pow(cartesianPosition.y - this.height / 2, 2)
            ),
            theta: Math.atan2(
                cartesianPosition.y - this.height / 2,
                cartesianPosition.x - this.width / 2
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
