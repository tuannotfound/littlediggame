// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import Planet from "./planet.js";
import PixelType from "../diggables/pixel_type.js";
import Pixel from "../diggables/pixel.js";
import MathExtras from "../math_extras.js";

export default class CircularPlanet extends Planet {
    // This controls the range of sizes the planet can take. Larger = less variation.
    static MAX_RADIUS_DIFF_FACTOR = 3 / 35;
    // This controls the planets "spikiness".
    static MAX_RADIUS_DELTA_PER_STEP_FACTOR = 0.015 / 35;

    // Percent chance that a given pixel will be gold.
    static NEW_GOLD_PCT_MIN = 6;
    static NEW_GOLD_PCT_MAX = 8;
    // Added to the above percent chance if the previous pixel at that radius was gold.
    static CONTINUE_GOLD_PCT_BOOST = 65;

    // Percent chance that a given pixel will be a diamond.
    static DIAMOND_PCT_MIN = 3;
    static DIAMOND_PCT_MAX = 40;

    constructor(
        radius,
        maxRadiusDiffFactor = CircularPlanet.MAX_RADIUS_DIFF_FACTOR,
        maxRadiusDeltaPerStepFactor = CircularPlanet.MAX_RADIUS_DELTA_PER_STEP_FACTOR
    ) {
        let maxRadiusDiffPx = Math.round(radius * maxRadiusDiffFactor);
        let size = Math.round(2 * (radius + maxRadiusDiffPx + 1));
        super(size, size);
        this.baseRadius = radius;
        this.maxRadiusDiffPx = maxRadiusDiffPx;
        this.maxRadius = radius + maxRadiusDiffPx;
        this.minRadius = radius - maxRadiusDiffPx;
        this.maxRadiusDeltaPerStep = this.radius * maxRadiusDeltaPerStepFactor;
        // The amount of the circumference we'll traverse before starting to attempt to match up
        // the radius to the start radius. Can be set to 2π for no matchup.
        this.circumferenceBeforeMatchup = 1.8 * Math.PI;
    }

    toJSON() {
        let json = super.toJSON();
        json.baseRadius = this.baseRadius;
        json.maxRadiusDiffPx = this.maxRadiusDiffPx;
        json.maxRadius = this.maxRadius;
        json.minRadius = this.minRadius;
        json.maxRadiusDeltaPerStep = this.maxRadiusDeltaPerStep;
        json.circumferenceBeforeMatchup = this.circumferenceBeforeMatchup;
        return json;
    }

    static fromJSON(json, upgrades, planet = null) {
        if (planet == null) {
            planet = new CircularPlanet(json.baseRadius);
        }
        planet.width = json.width;
        planet.height = json.height;
        planet.maxRadiusDiffPx = json.maxRadiusDiffPx;
        planet.maxRadius = json.maxRadius;
        planet.minRadius = json.minRadius;
        planet.maxRadiusDeltaPerStep = json.maxRadiusDeltaPerStep;
        planet.circumferenceBeforeMatchup = json.circumferenceBeforeMatchup;
        for (const pixelJson of json.pixels) {
            planet.pixels.push(Pixel.fromJSON(pixelJson, upgrades));
        }
        return planet;
    }

    createInitialPixels() {
        const thetaIncrement = 0.7 / this.maxRadius;
        let previousRadius = this.radius;

        let typesMap = new Map();
        let theta = 0;
        for (; theta < this.circumferenceBeforeMatchup; theta += thetaIncrement) {
            let radius = previousRadius;
            radius *=
                1 + Math.random() * this.maxRadiusDeltaPerStep * 2 - this.maxRadiusDeltaPerStep;
            radius = MathExtras.clamp(radius, this.minRadius, this.maxRadius);
            previousRadius = radius;
            typesMap = this.drawRay(radius, theta, typesMap);
        }
        // For the last bit, just make sure we reconnect with the start of the shape
        let stepsRemaining = (2 * Math.PI - theta) / thetaIncrement;
        let radiusDiff = previousRadius - this.radius;
        let radiusDiffPerStep = radiusDiff / stepsRemaining;
        for (; theta < 2 * Math.PI; theta += thetaIncrement) {
            let radius = previousRadius - radiusDiffPerStep;
            previousRadius = radius;
            typesMap = this.drawRay(radius, theta, typesMap);
        }
    }

    // Returns a {radius : PixelType.name} map for the drawn ray.
    drawRay(radius, theta, previousTypeMap) {
        let typesMap = new Map();
        for (let r = 0; r < radius; r += 0.7) {
            let position = MathExtras.polarToCartesian(r, theta, this.center);
            position.round();
            let existingPixel = this.getPixel(position);
            if (existingPixel) {
                typesMap.set(r, existingPixel.type.name);
                continue;
            }
            r = Math.round(r * 100) / 100;
            let previousType = previousTypeMap.get(r);
            let previousWasGold = previousType == PixelType.GOLD.name;
            let goldThreshold =
                MathExtras.scaleBetween(
                    radius - r,
                    0,
                    radius,
                    CircularPlanet.NEW_GOLD_PCT_MIN,
                    CircularPlanet.NEW_GOLD_PCT_MAX
                ) + (previousWasGold ? CircularPlanet.CONTINUE_GOLD_PCT_BOOST : 0);
            let isGold = Math.random() * 100 < goldThreshold;
            let diamondThreshold = MathExtras.scaleBetween(
                radius - r,
                0,
                radius,
                CircularPlanet.DIAMOND_PCT_MIN,
                CircularPlanet.DIAMOND_PCT_MAX
            );
            let isDiamond = isGold ? false : Math.random() * 100 < diamondThreshold;
            let pixelType = PixelType.DIRT;
            if (isGold) {
                pixelType = PixelType.GOLD;
            } else if (isDiamond) {
                pixelType = PixelType.DIAMOND;
            }
            typesMap.set(r, pixelType.name);

            this.addPixel(position, pixelType);
        }
        return typesMap;
    }
}
