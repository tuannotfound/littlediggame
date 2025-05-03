// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import Layer from "./layer.js";
import LittleGuy from "./little_guy.js";
import MathExtras from "./math_extras.js";
import Vector from "./vector.js";

export default class LittleGuys {
    #littleGuys;
    #layer;
    #listeners;
    #listener;

    constructor() {
        this.#littleGuys = [];
        this.#listener = {
            onDigsComplete: (pixels) => {
                for (const listener of this.#listeners) {
                    listener.onDigsComplete(pixels);
                }
            },
            onDeath: (littleGuy) => {
                for (const listener of this.#listeners) {
                    listener.onDeath(littleGuy);
                }
            },
            onInactive: (littleGuy) => {
                this.#littleGuys.splice(this.#littleGuys.indexOf(littleGuy), 1);
                for (const listener of this.#listeners) {
                    listener.onInactive(littleGuy);
                }
            },
        };
        this.#layer = new Layer("little_guys");
        this.#listeners = [];
    }

    toJSON() {
        return {
            littleGuys: this.#littleGuys,
        };
    }

    static fromJSON(json, activePixelBody, upgrades) {
        const littleGuys = new LittleGuys();
        if (!activePixelBody) {
            return littleGuys;
        }
        for (let littleGuyJson of json.littleGuys) {
            let pixelBeingDug = null;
            if (littleGuyJson.pixelBeingDug) {
                const pixelBeingDugPosition = Vector.fromJSON(littleGuyJson.pixelBeingDug.position);
                pixelBeingDug = activePixelBody.getPixel(pixelBeingDugPosition);
            }
            const littleGuy = LittleGuy.fromJSON(
                littleGuyJson,
                activePixelBody,
                upgrades,
                pixelBeingDug
            );
            littleGuys.#littleGuys.push(littleGuy);
        }
        return littleGuys;
    }

    init(width, height) {
        this.#layer.initOffscreen(width, height);
        for (const littleGuy of this.#littleGuys) {
            littleGuy.init();
            littleGuy.addListener(this.#listener);
        }
    }

    get initialized() {
        return this.#layer.initialized;
    }

    get layer() {
        return this.#layer;
    }

    addListener(listener) {
        this.#listeners.push(listener);
    }

    removeListener(listener) {
        const index = this.#listeners.indexOf(listener);
        if (index > -1) {
            this.#listeners.splice(index, 1);
        }
    }

    onResize(newSize) {
        this.layer.onResize(newSize);
    }

    update() {
        for (const littleGuy of this.#littleGuys) {
            littleGuy.update();
        }
    }

    updateRenderData(pixelBodyPosition, zoomLevel) {
        if (!this.layer.initialized) {
            return;
        }
        const imageData = this.#layer
            .getContext()
            .createImageData(this.#layer.width, this.#layer.height);

        const adjustedPosition = new Vector(
            MathExtras.floorToNearest(zoomLevel, pixelBodyPosition.x),
            MathExtras.floorToNearest(zoomLevel, pixelBodyPosition.y)
        );
        adjustedPosition.div(zoomLevel);
        adjustedPosition.sub(1);
        for (const littleGuy of this.#littleGuys) {
            if (!littleGuy.active) {
                continue;
            }
            this.render(littleGuy, adjustedPosition, imageData);
        }
        this.layer.getContext().putImageData(imageData, 0, 0);
    }

    render(littleGuy, pixelBodyPosition, imageData) {
        const p = Vector.add(pixelBodyPosition, littleGuy.positionInPixelBodySpace);
        // Each little guy is 3x3 pixels.
        if (littleGuy.shielded || window.DEBUG_MODE) {
            const color = littleGuy.shielded
                ? LittleGuy.SHIELDED_OUTLINE_COLOR
                : LittleGuy.DEBUG_OUTLINE_COLOR;
            for (let x = p.x; x < p.x + 3; x++) {
                for (let y = p.y; y < p.y + 3; y++) {
                    const i = (x + y * imageData.width) * 4;
                    imageData.data[i] = color.r; // Red
                    imageData.data[i + 1] = color.g; // Green
                    imageData.data[i + 2] = color.b; // Blue
                    imageData.data[i + 3] = color.a; // Alpha
                }
            }
        }

        const bodyPosition = Vector.add(p, 1);
        const bodyIndex = (bodyPosition.x + bodyPosition.y * imageData.width) * 4;
        const bodyColor = littleGuy.getBodyColor();
        imageData.data[bodyIndex] = bodyColor.r; // Red
        imageData.data[bodyIndex + 1] = bodyColor.g; // Green
        imageData.data[bodyIndex + 2] = bodyColor.b; // Blue
        imageData.data[bodyIndex + 3] = bodyColor.a; // Alpha

        const headPosition = bodyPosition.copy();
        headPosition.add(littleGuy.orientation);
        const headIndex = (headPosition.x + headPosition.y * imageData.width) * 4;
        const headColor = littleGuy.getHeadColor();
        if (headColor) {
            imageData.data[headIndex] = headColor.r; // Red
            imageData.data[headIndex + 1] = headColor.g; // Green
            imageData.data[headIndex + 2] = headColor.b; // Blue
            imageData.data[headIndex + 3] = headColor.a; // Alpha
        }
    }

    spawn(pixelBody, position, upgrades, immaculate) {
        const littleGuy = new LittleGuy(pixelBody, position, upgrades, immaculate);
        littleGuy.addListener(this.#listener);
        littleGuy.init();
        this.#littleGuys.push(littleGuy);
        return littleGuy;
    }

    killAll(durationMs = 0) {
        for (const littleGuy of this.#littleGuys) {
            setTimeout(() => littleGuy.die(), MathExtras.randomBetween(0, durationMs));
        }
    }

    clear() {
        for (const littleGuy of [...this.#littleGuys]) {
            littleGuy.setInactive();
        }
        if (this.#littleGuys.length > 0) {
            console.error(
                `Somehow there are still ${this.#littleGuys.length} little guy(s) remaining after
                setting all inactive.`
            );
            // Hopefully this won't cause problems...
            this.#littleGuys = [];
        }
    }

    get(i) {
        if (i < 0 || i >= this.#littleGuys.length) {
            return null;
        }
        return this.#littleGuys[i];
    }

    onShieldActivated() {
        this.setShielded(true);
    }

    onShieldDeactivated() {
        this.setShielded(false);
    }

    setShielded(shielded) {
        for (const littleGuy of this.#littleGuys) {
            if (!littleGuy.active || !littleGuy.alive) {
                continue;
            }
            littleGuy.shielded = shielded;
        }
    }

    get immaculateCount() {
        return this.#littleGuys.filter((lg) => lg.immaculate).length;
    }

    get maculateCount() {
        // Maculate is the opposite of immaculate. Everybody knows this.
        return this.#littleGuys.length - this.immaculateCount;
    }

    get aliveCount() {
        return this.#littleGuys.filter((lg) => lg.active && lg.alive).length;
    }

    get length() {
        return this.#littleGuys.length;
    }
}
