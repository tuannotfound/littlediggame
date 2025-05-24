// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import Pixel from "../diggables/pixel.js";
import PixelFactory from "../diggables/pixel_factory.js";
import PixelType from "../diggables/pixel_type.js";
import Layer from "../layer.js";
import MathExtras from "../math_extras.js";
import Vector from "../vector.js";

// Base class for things that are composed of diggable pixels.
export default class PixelBody {
    constructor(width, height, allowOverlap = false) {
        if (new.target === PixelBody) {
            throw new Error("Cannot instantiate abstract class PixelBody directly.");
        }
        this.className = new.target.name;
        this.width = width;
        this.height = height;
        this.allowOverlap = allowOverlap;
        this.layer = new Layer(this.className);
        this.center = new Vector(this.width / 2, this.height / 2);
        this.pixels = [];
        // Pixel.position.toString() -> [Pixel]
        // Will only contain a single pixel in the array if overlap is not allowed.
        this.pixelPositions = new Map();
        this.surfacePixels = [];
        this.upgrades = null;
        this.needsUpdate = false;
        this.initialCount = 0;
    }

    toJSON() {
        return {
            className: this.className,
            width: this.width,
            height: this.height,
            allowOverlap: this.allowOverlap,
            pixels: this.pixels,
        };
    }

    init(upgrades) {
        this.upgrades = upgrades;
        this.layer.initOffscreen(this.width, this.height);

        Pixel.setDirtType(this.dirtVariant);
        if (this.pixels.length == 0) {
            this.createInitialPixels();
        }
        for (const pixel of this.pixels) {
            let key = pixel.position.toString();
            if (!this.pixelPositions.has(key)) {
                this.pixelPositions.set(key, []);
            }
            this.pixelPositions.get(key).push(pixel);
        }
        this.initialCount = this.pixels.length;
        this.updateSurface();
    }

    destroy() {
        this.layer.destroy();
        this.layer = null;
        this.pixels = [];
        this.pixelPositions.clear();
        this.surfacePixels = [];
        this.upgrades = null;
        this.needsUpdate = false;
    }

    onResize(newSize) {
        // Optional for children to implement this to update their layer if needed.
    }

    get skyColors() {
        // Should return an object like:
        // {
        //     top: Color,
        //     bottom: Color,
        // }
        throw new Error("Getter for 'sky' must be implemented in derived classes.");
    }

    get dirtVariant() {
        return Pixel.DIRT;
    }

    get healthModifier() {
        return 1;
    }

    update() {
        if (!this.needsUpdate) {
            // Check if any of the pixels need to be updated.
            for (const pixel of this.pixels) {
                if (pixel.needsUpdate) {
                    this.needsUpdate = true;
                    break;
                }
            }
        }
        if (!this.needsUpdate) {
            return;
        }
        this.needsUpdate = false;
        this.pixelPositions = new Map();
        let imageData = this.layer
            .getContext()
            .createImageData(this.layer.width, this.layer.height);
        for (let pixel of this.pixels) {
            this.updatePixel(pixel, imageData);
        }
        this.layer.getContext().putImageData(imageData, 0, 0);
    }

    // Expected that the pixelPositions map was cleared just prior to this.
    updatePixel(pixel, imageData) {
        pixel.render(imageData);

        // Doing this work to update pixelPositions is ending up fairly expensive.
        // TODO: Optimize this or eliminate the need for it.
        let key = pixel.position.toString();
        if (!this.pixelPositions.has(key)) {
            this.pixelPositions.set(key, []);
        }
        this.pixelPositions.get(key).push(pixel);
    }

    createPixel(position, type = PixelType.DIRT) {
        let pixel = PixelFactory.create(position, this.upgrades, type, this.healthModifier);
        return pixel;
    }

    addPixel(position, type = PixelType.DIRT) {
        if (!this.allowOverlap && this.getPixel(position)) {
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

        let key = pixel.position.toString();
        if (!this.pixelPositions.has(key)) {
            this.pixelPositions.set(key, []);
        }
        this.pixelPositions.get(key).push(pixel);
        this.needsUpdate = true;
        return pixel;
    }

    removePixelsAt(positions) {
        for (let position of positions) {
            let pixels = this.pixelPositions.get(position.toString());
            if (pixels) {
                for (let pixel of pixels) {
                    this.removePixel(pixel, false);
                }
            }
        }
        this.updateSurface();
    }

    removePixels(pixels) {
        if (pixels.length == 0) {
            return;
        }

        for (const pixel of pixels) {
            this.removePixel(pixel, false);
        }
        this.updateSurface();
    }

    removePixel(pixel, updateSurface = true) {
        let index = this.pixels.indexOf(pixel);
        if (index < 0) {
            return false;
        }
        this.pixels.splice(index, 1);
        let pixels = this.pixelPositions.get(pixel.position.toString());
        if (!pixels) {
            return false;
        }
        let positionsIndex = pixels.indexOf(pixel);
        if (positionsIndex > -1) {
            pixels.splice(positionsIndex, 1);
        }
        if (pixels.length == 0) {
            this.pixelPositions.delete(pixel.position.toString());
        }
        if (updateSurface) {
            this.updateSurface();
        }
        this.needsUpdate = true;
        return true;
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

    getPixelsAround(center, radius) {
        const pixelsAround = [];
        for (let x = center.x - radius; x < center.x + radius; x++) {
            for (let y = center.y - radius; y < center.y + radius; y++) {
                const dist = new Vector(center.x - x, center.y - y).mag();
                if (dist > radius) {
                    continue;
                }
                const pixel = this.getPixel(new Vector(x, y));
                if (!pixel) {
                    continue;
                }
                pixelsAround.push(pixel);
            }
        }
        return pixelsAround;
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

    getRandomSurfacePixel() {
        if (this.surfacePixels.length === 0) {
            return null;
        }

        const index = Math.round(MathExtras.randomBetween(0, this.surfacePixels.length - 1));
        return this.surfacePixels[index];
    }

    findSurfacePixels(pixels, width, height) {
        if (window.DEBUG_MODE) {
            console.log("PixelBody: findSurfacePixels for " + pixels.length + " pixels");
        }
        const pixelPositions = new Map();

        const xyToKey = (x, y) => `${x}x${y}`;
        for (const pixel of pixels) {
            pixelPositions.set(xyToKey(pixel.position.x, pixel.position.y), pixel);
        }
        const surfacePixels = [];
        if (pixels.length === 0) {
            return surfacePixels;
        }

        const visited = Array(width)
            .fill(null)
            .map(() => Array(height).fill(false));

        const isIsland = (x, y) => {
            return y >= 0 && y < height && x >= 0 && x < width && pixelPositions.has(xyToKey(x, y));
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
                let key = xyToKey(x, y);
                if (!pixelPositions.has(key)) {
                    continue;
                }
                const pixel = pixelPositions.get(key); // Get pixel only when needed
                if (isSurface(x, y)) {
                    surfacePixels.push(pixel);
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

        for (const pixel of pixels) {
            const x = pixel.position.x;
            if (x < 0 || x >= width) {
                continue;
            }
            const y = pixel.position.y;
            if (y < 0 || y >= height) {
                continue;
            }
            if (!visited[x][y]) {
                dfs(x, y);
            }
        }

        return surfacePixels;
    }

    updateSurface() {
        if (this.pixels.length == 0) {
            return;
        }

        this.surfacePixels = this.findSurfacePixels(
            this.pixels,
            this.layer.width,
            this.layer.height
        );

        this.needsUpdate = true;
    }

    // May return null
    getPixel(position) {
        let pixels = this.pixelPositions.get(position.toString());
        if (!pixels) {
            return null;
        }
        return pixels[0];
    }

    hasPixel(pixel) {
        if (pixel.isSurface) {
            return this.surfacePixels.indexOf(pixel) >= 0;
        }
        return this.pixels.indexOf(pixel) >= 0;
    }

    get health() {
        if (this.initialCount == 0) {
            return 1;
        }
        return this.pixels.length / this.initialCount;
    }

    get renderBufferPct() {
        return 0.2;
    }
}
