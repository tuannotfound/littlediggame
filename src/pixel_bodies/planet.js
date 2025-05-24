// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import Color from "../color.js";
import PixelBody from "./pixel_body.js";

export default class Planet extends PixelBody {
    static SKY_TOP = new Color(237, 253, 255).immutableCopy();
    static SKY_BOTTOM = new Color(185, 230, 250).immutableCopy();
    static MIN_DARKNESS_UPDATE_INTERVAL_MS = 500;

    constructor(width, height) {
        if (new.target === Planet) {
            throw new Error("Cannot instantiate abstract class Planet directly.");
        }
        super(width, height);
        this.radius = Math.max(width, height) / 2;
        // For optimizations
        this.oneOverRadius = 1 / this.radius;
        this.oneOverRadiusSquared = this.oneOverRadius * this.oneOverRadius;

        this.lastDarknessUpdate = 0;
    }

    toJSON() {
        let json = super.toJSON();
        json.radius = this.radius;
        return json;
    }

    get skyColors() {
        return {
            top: Planet.SKY_TOP,
            bottom: Planet.SKY_BOTTOM,
        };
    }

    updateSurface() {
        super.updateSurface();
        const now = performance.now();
        if (now - this.lastDarknessUpdate > Planet.MIN_DARKNESS_UPDATE_INTERVAL_MS) {
            this.lastDarknessUpdate = now;
            this.updateDarkness();
        }
    }

    updateDarkness() {
        for (const pixel of this.pixels) {
            const nearestSurfacePixel = this.getClosestSurfacePixel(pixel.position);
            if (!nearestSurfacePixel) {
                pixel.darkness = 0;
                continue;
            }
            const distanceToSurface = nearestSurfacePixel.position.dist(pixel.position);
            // Original calculation:
            // pixel.darkness = 1 - (this.radius - distanceToSurface) ** 2 / this.radius ** 2;
            // Optimized to use pre-computed values and reduce division:
            pixel.darkness =
                2 * distanceToSurface * this.oneOverRadius -
                distanceToSurface * distanceToSurface * this.oneOverRadiusSquared;
        }
    }
}
