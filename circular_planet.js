import Planet from "./planet.js";
import PixelType from "./pixel_type.js";
import Vector from "./vector.js";
import Pixel from "./pixel.js";
import MathExtras from "./math_extras.js";

export default class CircularPlanet extends Planet {
    // This controls the range of sizes the planet can take.
    static MAX_RADIUS_DIFF_PX = 3;
    // This controls the planets "spikiness".
    // As a fraction of the radius, e.g. 0.04 means it can change by 4% in either direction.
    MAX_RADIUS_DELTA_PER_STEP = 0.015;

    // Percent chance that a given pixel will be gold.
    NEW_GOLD_PCT = 4;
    // Added to the above percent chance if the previous pixel at that radius was gold.
    CONTINUE_GOLD_PCT_BOOST = 65;

    // Percent chance that a given pixel will be a diamond.
    DIAMOND_PCT = 4;

    constructor(radius) {
        let size = radius * 2;
        super(size, size);
        this.maxRadius = this.radius + CircularPlanet.MAX_RADIUS_DIFF_PX;
        this.minRadius = this.radius - CircularPlanet.MAX_RADIUS_DIFF_PX;
    }

    static fromJSON(json, upgrades) {
        let planet = new CircularPlanet(json.radius);
        let pixels = [];
        for (const pixelJson of json.pixels) {
            pixels.push(Pixel.fromJSON(pixelJson, upgrades));
        }
        planet.pixels = pixels;
        return planet;
    }

    createPlanetData() {
        const thetaIncrement = 0.8 / this.maxRadius;
        let previousRadius = this.radius;

        let typesMap = new Map();
        let theta = 0;
        for (; theta < Math.PI * 1.8; theta += thetaIncrement) {
            let radius = previousRadius;
            radius *=
                1 +
                Math.random() * this.MAX_RADIUS_DELTA_PER_STEP * 2 -
                this.MAX_RADIUS_DELTA_PER_STEP;
            radius = MathExtras.clamp(radius, this.minRadius, this.maxRadius);
            previousRadius = radius;
            typesMap = this.drawRay(radius, theta, typesMap);
        }
        // For the last bit, just make sure we reconnect with the start of the shape
        let stepsRemaining = (Math.PI * 2 - theta) / thetaIncrement;
        let radiusDiff = previousRadius - this.radius;
        let radiusDiffPerStep = radiusDiff / stepsRemaining;
        for (; theta < Math.PI * 2; theta += thetaIncrement) {
            let radius = previousRadius - radiusDiffPerStep;
            previousRadius = radius;
            typesMap = this.drawRay(radius, theta, typesMap);
        }
        this.emplaceEgg();
    }

    // Returns a {radius : PixelType.name} map for the drawn ray.
    drawRay(radius, theta, previousTypeMap) {
        let typesMap = new Map();
        for (let r = 0; r < radius; r += 0.7) {
            let position = this.polarToCartesian(r, theta);
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
                this.NEW_GOLD_PCT + (previousWasGold ? this.CONTINUE_GOLD_PCT_BOOST : 0);
            let isGold = Math.random() * 100 < goldThreshold;
            let isDiamond = isGold ? false : Math.random() * 100 < this.DIAMOND_PCT;
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

    emplaceEgg() {
        const eggWidth = 7;
        const eggHeight = 7;
        const eggPointiness = 1.2;

        let extent = Math.max(eggWidth, eggHeight) + 2;

        function eggValue(x, y) {
            return y ** 2 / eggHeight ** 2 + (x ** 2 * (1 + eggPointiness ** -y)) / eggWidth ** 2;
        }
        for (let x = -extent; x <= extent; x++) {
            for (let y = -extent; y <= extent; y++) {
                if (eggValue(x, y) < 1) {
                    let coords = new Vector(x + this.center.x, y + this.center.y);
                    let existing = this.getPixel(coords);
                    if (existing) {
                        this.removePixel(existing);
                    }
                    this.addPixel(coords, PixelType.EGG);
                }
            }
        }
    }
}
