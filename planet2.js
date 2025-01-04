import Layer from "./layer.js";
import Vector from "./vector.js";
import Pixel from "./pixel.js";

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
        this.layer = new Layer("planet", this.gameBounds.x * 1, this.gameBounds.y * 1);
        console.log("Planet layer size: " + this.layer.width + "x" + this.layer.height + "px");
        this.center = new Vector(this.layer.width / 2, this.layer.height / 2);
        this.pixels = [];
        this.pixelPositions = new Map();
        this.planetSurface = [];
    }

    init() {
        this.layer.initOffscreen();

        this.createPlanetData();
        this.initialCount = this.pixels.length;
        this.updatePlanetSurface();
    }

    update() {
        this.pixelPositions.clear();
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

    createPixel(position, color) {
        let pixel = new Pixel(position, color, this.center);
        return pixel;
    }

    addPixel(position, color) {
        if (this.getPixel(position)) {
            return false;
        }
        let pixel = this.createPixel(position, color);
        this.pixels.push(pixel);
        this.pixelPositions.set(pixel.renderPosition.toString(), pixel);
        return true;
    }

    updatePlanetSurfaceOnQuiescence() {
        if (this.surfaceUpdateTimeoutId) {
            clearTimeout(this.surfaceUpdateTimeoutId);
        }
        this.surfaceUpdateTimeoutId = setTimeout(() => {
            this.updatePlanetSurface();
        }, this.PLANET_SURFACE_UPDATE_INTERVAL_MS);
    }

    removePixelAt(position) {
        let pixel = this.pixelPositions.get(position.toString());
        if (pixel) {
            let removed = this.removePixel(pixel);
            if (removed) {
                this.updatePlanetSurface();
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
        this.updatePlanetSurface();
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
        if (this.planetSurface.length == 0) {
            return null;
        }
        this.planetSurface.sort((a, b) => {
            return a.position.dist(position) - b.position.dist(position);
        });
        console.log("Closest surface pixel: " + this.planetSurface[0].position.toString());
        return this.planetSurface[0];
    }

    updatePlanetSurface() {
        if (this.pixels.length == 0) {
            this.planetSurface = [];
        }
        const width = this.layer.width;
        const height = this.layer.height;
        const visited = Array(width)
            .fill(null)
            .map(() => Array(height).fill(false));
        const planetSurfaces = [];
        const self = this; // Avoid issues with 'this' inside nested functions

        const isIsland = (pos) => {
            return (
                pos.y >= 0 && pos.y < height && pos.x >= 0 && pos.x < width && self.getPixel(pos)
            );
        };

        const isSurface = (pos) => {
            const neighbors = [
                new Vector(pos.x - 1, pos.y),
                new Vector(pos.x + 1, pos.y),
                new Vector(pos.x, pos.y - 1),
                new Vector(pos.x, pos.y + 1),
            ];
            return neighbors.some((neighbor) => !isIsland(neighbor));
        };

        function dfs(startPos) {
            const stack = [startPos];
            const currentPlanet = [];

            while (stack.length > 0) {
                const pos = stack.pop();
                let pixel = self.getPixel(pos);

                if (
                    pos.y < 0 ||
                    pos.y >= height ||
                    pos.x < 0 ||
                    pos.x >= width ||
                    visited[pos.x][pos.y] ||
                    !pixel
                ) {
                    continue; // Skip invalid or visited positions
                }

                visited[pos.x][pos.y] = true;

                if (isSurface(pos)) {
                    currentPlanet.push(pixel);
                    pixel.setSurface(true);
                } else {
                    pixel.setSurface(false);
                }

                // Push neighbors onto the stack (order determines search direction)
                stack.push(new Vector(pos.x + 1, pos.y));
                stack.push(new Vector(pos.x - 1, pos.y));
                stack.push(new Vector(pos.x, pos.y + 1));
                stack.push(new Vector(pos.x, pos.y - 1));
            }
            return currentPlanet;
        }

        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                let position = new Vector(x, y);
                if (self.getPixel(position) && !visited[x][y]) {
                    const currentPlanet = dfs(position);
                    if (currentPlanet.length > 0) {
                        planetSurfaces.push(currentPlanet);
                    }
                }
            }
        }

        this.planetSurface = [];
        for (const planetSurface of planetSurfaces) {
            this.planetSurface.push(...planetSurface);
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
