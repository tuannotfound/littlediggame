// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import Color from "../color.js";
import Pixel from "../diggables/pixel.js";
import MathExtras from "../math_extras.js";
import Vector from "../vector.js";
import CircularPlanet from "./circular_planet.js";

export default class SwissPlanet extends CircularPlanet {
    static GOOP_SKY_TOP = new Color(238, 219, 255).immutableCopy();
    static GOOP_SKY_BOTTOM = new Color(206, 255, 204).immutableCopy();

    static fromJSON(json, upgrades) {
        let planet = new SwissPlanet(json.baseRadius);
        return CircularPlanet.fromJSON(json, upgrades, planet);
    }

    get skyColors() {
        return {
            top: SwissPlanet.GOOP_SKY_TOP,
            bottom: SwissPlanet.GOOP_SKY_BOTTOM,
        };
    }

    get dirtVariant() {
        return Pixel.GOOP_DIRT;
    }

    get healthModifier() {
        return 1.5;
    }

    createInitialPixels() {
        super.createInitialPixels();
        this.swissify();
    }

    swissify() {
        let minHoleRadius = this.radius / 12;
        let maxHoleRadius = this.radius / 6;
        let holeCount = Math.floor(MathExtras.randomBetween(12, 16));
        console.log(
            "Swissify - creating " +
                holeCount +
                " holes with radii between " +
                minHoleRadius +
                " and " +
                maxHoleRadius +
                " pixels"
        );
        let xMin = this.center.x - this.radius;
        let xMax = this.center.x + this.radius;
        let yMin = this.center.y - this.radius;
        let yMax = this.center.y + this.radius;
        for (let i = 0; i < holeCount; i++) {
            let holeRadius = MathExtras.randomBetween(minHoleRadius, maxHoleRadius);
            let holePosition = new Vector(
                MathExtras.randomBetween(xMin + holeRadius, xMax - holeRadius),
                MathExtras.randomBetween(yMin + holeRadius, yMax - holeRadius)
            );
            console.log(
                "  creating hole w/ radius " + holeRadius + " @ " + holePosition.toString()
            );
            for (let dx = -holeRadius; dx < holeRadius; dx++) {
                for (let dy = -holeRadius; dy < holeRadius; dy++) {
                    let dist = new Vector(dx, dy).mag();
                    if (dist > holeRadius) {
                        continue;
                    }
                    let position = new Vector(holePosition.x + dx, holePosition.y + dy);
                    position.round();
                    let pixel = this.getPixel(position);
                    if (pixel) {
                        this.removePixel(pixel, false);
                    }
                }
            }
        }
        this.updateSurface();
    }
}
