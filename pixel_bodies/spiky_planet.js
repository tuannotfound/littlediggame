// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import CircularPlanet from "./circular_planet.js";
import Pixel from "../diggables/pixel.js";
import Color from "../color.js";
import Vector from "../vector.js";
import PixelType from "../diggables/pixel_type.js";

// Doesn't really work well with a radius < 20 or so.
export default class SpikyPlanet extends CircularPlanet {
    static GREY_SKY_TOP = new Color(250, 250, 250).immutableCopy();
    static GREY_SKY_BOTTOM = new Color(212, 212, 212).immutableCopy();

    constructor(radius) {
        super(
            radius,
            CircularPlanet.MAX_RADIUS_DIFF_FACTOR * 3,
            CircularPlanet.MAX_RADIUS_DELTA_PER_STEP_FACTOR * 20
        );
        this.circumferenceBeforeMatchup = 2 * Math.PI;
    }

    static fromJSON(json, upgrades) {
        let planet = new SpikyPlanet(json.baseRadius);
        return CircularPlanet.fromJSON(json, upgrades, planet);
    }

    createInitialPixels() {
        super.createInitialPixels();
        this.emplaceMagic();
    }

    emplaceMagic() {
        // Put a single magic pixel near the center of the planet.
        let magicRadius = Math.round(this.radius * 0.25);
        let magicTheta = Math.random() * 2 * Math.PI;
        const coords = new Vector(
            magicRadius * Math.cos(magicTheta),
            magicRadius * Math.sin(magicTheta)
        );
        coords.add(this.center);
        coords.round();
        let existing = this.getPixel(coords);
        if (existing) {
            this.removePixel(existing, false);
        } else {
            throw new Error("SpikyPlanet: emplaceMagic() failed.");
        }
        this.addPixel(coords, PixelType.MAGIC);
    }

    get skyColors() {
        return {
            top: SpikyPlanet.GREY_SKY_TOP,
            bottom: SpikyPlanet.GREY_SKY_BOTTOM,
        };
    }

    get dirtVariant() {
        return Pixel.ICE_DIRT;
    }

    get healthModifier() {
        return 2;
    }
}
