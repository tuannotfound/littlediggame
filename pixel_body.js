import Vector from "./vector.js";
import Layer from "./layer.js";
import PixelType from "./diggables/pixel_type.js";
import PixelFactory from "./diggables/pixel_factory.js";

export default class PixelBody {
    constructor(width, height, id = "pixel_surface") {
        if (new.target === PixelBody) {
            throw new Error("Cannot instantiate abstract class PixelBody directly.");
        }
        this.width = width;
        this.height = height;
        this.layer = new Layer(id, width, height);
        console.log("PixelBody layer size: " + this.layer.width + "x" + this.layer.height + "px");
        this.center = new Vector(this.layer.width / 2, this.layer.height / 2);
        this.pixels = [];
        this.pixelPositions = new Map();
        this.surfacePixels = [];
        this.upgrades = null;
    }

    toJSON() {
        return {
            width: this.width,
            height: this.height,
            pixels: this.pixels,
        };
    }

    init(upgrades) {
        this.upgrades = upgrades;
        this.layer.initOffscreen();

        if (this.pixels.length == 0) {
            this.createInitialPixels();
        }
        for (const pixel of this.pixels) {
            this.pixelPositions.set(pixel.position.toString(), pixel);
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
        this.pixelPositions.set(pixel.position.toString(), pixel);
    }

    createPixel(position, type = PixelType.DIRT) {
        let pixel = PixelFactory.create(position, this.upgrades, type);
        return pixel;
    }

    addPixel(position, type = PixelType.DIRT) {
        if (this.getPixel(position)) {
            return null;
        }
        if (
            position.x < 0 ||
            position.x >= this.layer.width ||
            position.y < 0 ||
            position.y >= this.layer.height
        ) {
            return null;
        }
        let pixel = this.createPixel(position, type);
        this.pixels.push(pixel);
        this.pixelPositions.set(pixel.position.toString(), pixel);
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
            this.pixelPositions.delete(pixel.position.toString());
            return true;
        }
        return false;
    }

    createInitialPixels() {
        throw new Error("Method 'createInitialPixels()' must be implemented in derived classes.");
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
        if (this.surfacePixels.length === 0) {
            return null;
        }

        let closestPixel = null;
        let minDistance = Infinity;

        for (const pixel of this.surfacePixels) {
            const distance = pixel.position.distSq(position);

            if (distance < minDistance) {
                minDistance = distance;
                closestPixel = pixel;
            }
        }

        return closestPixel;
    }

    updateSurface() {
        if (this.pixels.length === 0) {
            this.surfacePixels = [];
            return;
        }

        const width = this.layer.width;
        const height = this.layer.height;
        const visited = Array(width)
            .fill(null)
            .map(() => Array(height).fill(false));
        this.surfacePixels = []; // Clear surfacePixels directly

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
                    this.surfacePixels.push(pixel);
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
            const x = pixel.position.x;
            const y = pixel.position.y;
            if (!visited[x][y]) {
                dfs(x, y);
            }
        }
    }

    // May return null
    getPixel(position) {
        let pixel = this.pixelPositions.get(position.toString());
        return pixel;
    }

    get health() {
        return this.pixels.length / this.initialCount;
    }
}
