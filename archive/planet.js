import Layer from "./layer.js";

export default class Planet {
    constructor(width, height) {
        if (new.target === Planet) {
            throw new Error("Cannot instantiate abstract class Planet directly.");
        }
        this.width = width;
        this.height = height;
        this.radius = Math.max(width, height) / 2;
        this.layer = new Layer("planet", this.width, this.height);
    }

    init() {
        this.layer.initOffscreen();
        this.imageData = this.layer.getContext().getImageData(0, 0, this.width, this.height);

        this.createPlanetData();
        this.initialOpaqueCount = this.getOpaqueCount();
        this.draw();
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
        return {
            x: Math.round(this.imageData.width / 2 + r * Math.cos(theta)),
            y: Math.round(this.imageData.height / 2 + r * Math.sin(theta)),
        };
    }

    cartesianToPolar(x, y) {
        return {
            r: Math.sqrt(
                Math.pow(x - this.imageData.width / 2, 2) +
                    Math.pow(y - this.imageData.height / 2, 2)
            ),
            theta: Math.atan2(y - this.imageData.height / 2, x - this.imageData.width / 2),
        };
    }

    getPixel(x, y) {
        let pixelIndex = (x + y * this.imageData.width) * 4;
        return {
            r: this.imageData.data[pixelIndex],
            g: this.imageData.data[pixelIndex + 1],
            b: this.imageData.data[pixelIndex + 2],
            a: this.imageData.data[pixelIndex + 3],
        };
    }

    setPixel(x, y, color) {
        let pixelIndex = (x + y * this.imageData.width) * 4;
        this.imageData.data[pixelIndex] = color.r; // Red
        this.imageData.data[pixelIndex + 1] = color.g; // Green
        this.imageData.data[pixelIndex + 2] = color.b; // Blue
        this.imageData.data[pixelIndex + 3] = color.a; // Alpha
    }

    eat(r, theta) {
        let { x, y } = this.polarToCartesian(r, theta);
        let ate = this.getPixel(x, y).a > 0;
        if (ate) {
            this.setPixel(x, y, { r: 0, g: 0, b: 0, a: 0 });
        }
        return ate;
    }

    getHealth() {
        let currentOpaqueCount = this.getOpaqueCount();
        return currentOpaqueCount / this.initialOpaqueCount;
    }

    draw() {
        //this.collapse();
        this.layer.getContext().putImageData(this.imageData, 0, 0);
    }

    collapse() {
        const radiusIncrement = 1;
        for (let x = 0; x < this.imageData.width; x++) {
            for (let y = 0; y < this.imageData.height; y++) {
                let pixel = this.getPixel(x, y);
                if (pixel.a > 0) {
                    continue;
                }
                // Look outwards radially until we get a new pixel
                let { r, theta } = this.cartesianToPolar(x, y);
                r += radiusIncrement;
                let { x: newX, y: newY } = this.polarToCartesian(r, theta);
                // let newX = x;
                // let newY = y;
                // for (let newR = r + radiusIncrement; newR < this.radius; newR += radiusIncrement) {
                //     ({ x: newX, y: newY } = this.polarToCartesian(newR, theta));
                //     if (newX != x || newY != y) {
                //         break;
                //     }
                // }
                if (newX == x && newY == y) {
                    continue;
                }
                this.setPixel(x, y, this.getPixel(newX, newY));
                this.setPixel(newX, newY, { r: 0, g: 0, b: 0, a: 0 });
            }
        }
    }

    getOpaqueCount() {
        let count = 0;
        for (let x = 0; x < this.imageData.width; x++) {
            for (let y = 0; y < this.imageData.height; y++) {
                let pixel = this.getPixel(x, y);
                if (pixel.a > 0) {
                    count++;
                }
            }
        }
        return count;
    }
}
