import Layer from "./layer.js";
import Vector from "./vector.js";
import Pixel from "./pixel.js";
import PixelType from "./pixel_type.js";

export default class Planet {
    PLANET_SURFACE_UPDATE_INTERVAL_MS = 500;

    constructor(gameBounds, width, height) {
        if (new.target === Planet) {
            throw new Error("Cannot instantiate abstract class Planet directly.");
        }
        this.gameBounds = gameBounds;
        this.width = width;
        this.height = height;
        this.radius = Math.max(width, height) / 2;
        // Little bit of buffer around the planet
        this.layer = new Layer("planet", width + 2, height + 2);
        console.log("Planet layer size: " + this.layer.width + "x" + this.layer.height + "px");
        this.center = new Vector(this.layer.width / 2, this.layer.height / 2);
        this.pixels = [];
        this.pixelPositions = new Map();
        this.planetSurface = [];
    }

    toJSON() {
        return {
            gameBounds: this.gameBounds,
            width: this.width,
            height: this.height,
            radius: this.radius,
            pixels: this.pixels,
        };
    }

    init() {
        this.layer.initOffscreen();

        if (this.pixels.length == 0) {
            this.createPlanetData();
        }
        for (const pixel of this.pixels) {
            this.pixelPositions.set(pixel.renderPosition.toString(), pixel);
        }
        this.initialCount = this.pixels.length;
        this.updateSurface();
    }

    update() {
        this.pixelPositions = new Map();
        let imageData = this.layer
            .getContext()
            .createImageData(this.layer.width, this.layer.height);
        for (let pixel of this.pixels) {
            this.updatePixel(pixel, imageData);
        }
        this.layer.getContext().putImageData(imageData, 0, 0);
    }

    updatePixel(pixel, imageData) {
        pixel.render(imageData);
        this.pixelPositions.set(pixel.renderPosition.toString(), pixel);
    }

    createPixel(position, type = PixelType.DIRT) {
        let pixel = new Pixel(position, type);
        return pixel;
    }

    addPixel(position, type = PixelType.DIRT) {
        if (this.getPixel(position)) {
            return null;
        }
        let pixel = this.createPixel(position, type);
        this.pixels.push(pixel);
        this.pixelPositions.set(pixel.renderPosition.toString(), pixel);
        return pixel;
    }

    removePixelAt(position) {
        let pixel = this.pixelPositions.get(position.toString());
        if (pixel) {
            let removed = this.removePixel(pixel);
            if (removed) {
                this.updateSurface();
            }
            return removed;
        }
        return false;
    }

    removePixelsAt(positions) {
        for (let position of positions) {
            let pixel = this.pixelPositions.get(position.toString());
            if (pixel) {
                this.removePixel(pixel);
            }
        }
        this.updateSurface();
    }

    removePixel(pixel) {
        let index = this.pixels.indexOf(pixel);
        if (index > -1) {
            this.pixels.splice(index, 1);
            this.pixelPositions.delete(pixel.renderPosition.toString());
            return true;
        }
        return false;
    }

    createPlanetData() {
        throw new Error("Method 'createPlanetData()' must be implemented in derived classes.");
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

    getSurroundingPixels(position, excludeSelf = true) {
        let pixels = new Map();
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                if (excludeSelf && dx == 0 && dy == 0) {
                    continue;
                }
                let dPos = new Vector(position.x + dx, position.y + dy);
                dPos.round();
                let pixel = this.getPixel(dPos);
                if (pixel) {
                    pixels.set(dPos.toString(), pixel);
                }
            }
        }
        return pixels;
    }

    getClosestSurfacePixel(position) {
        if (this.planetSurface.length === 0) {
            return null;
        }

        let closestPixel = null;
        let minDistance = Infinity;

        for (const pixel of this.planetSurface) {
            const distance = pixel.renderPosition.distSq(position);

            if (distance < minDistance) {
                minDistance = distance;
                closestPixel = pixel;
            }
        }

        return closestPixel;
    }

    updateSurface() {
        if (this.pixels.length === 0) {
            this.planetSurface = [];
            return;
        }

        const width = this.layer.width;
        const height = this.layer.height;
        const visited = Array(width)
            .fill(null)
            .map(() => Array(height).fill(false));
        this.planetSurface = []; // Clear planetSurface directly

        const isIsland = (x, y) => {
            return (
                y >= 0 &&
                y < height &&
                x >= 0 &&
                x < width &&
                this.pixelPositions.has(new Vector(x, y).toString())
            ); // Use pixelPositions map for quicker lookups
        };

        const isSurface = (x, y) => {
            return (
                !isIsland(x - 1, y) ||
                !isIsland(x + 1, y) ||
                !isIsland(x, y - 1) ||
                !isIsland(x, y + 1)
            );
        };

        const dfs = (startX, startY) => {
            const stack = [[startX, startY]];

            while (stack.length > 0) {
                const [x, y] = stack.pop();

                if (
                    x < 0 ||
                    x >= width ||
                    y < 0 ||
                    y >= height ||
                    visited[x][y] ||
                    !isIsland(x, y)
                ) {
                    continue;
                }

                visited[x][y] = true;
                const pixel = this.getPixel(new Vector(x, y)); // Get pixel only when needed
                if (isSurface(x, y)) {
                    this.planetSurface.push(pixel);
                    pixel.setSurface(true);
                } else {
                    pixel.setSurface(false);
                }

                stack.push([x + 1, y]);
                stack.push([x - 1, y]);
                stack.push([x, y + 1]);
                stack.push([x, y - 1]);
            }
        };

        for (const pixel of this.pixels) {
            const x = pixel.renderPosition.x;
            const y = pixel.renderPosition.y;
            if (!visited[x][y]) {
                dfs(x, y);
            }
        }

        this.updateDarkness();
    }

    updateDarkness() {
        for (const pixel of this.pixels) {
            let nearestSurfacePixel = this.getClosestSurfacePixel(pixel.renderPosition);
            if (!nearestSurfacePixel) {
                pixel.setDarkness(0);
                continue;
            }
            let distanceToSurface = nearestSurfacePixel.renderPosition.dist(pixel.renderPosition);
            pixel.setDarkness(1 - (this.radius - distanceToSurface) / this.radius);
        }
    }

    // May return null
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
