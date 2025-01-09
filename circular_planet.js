import Planet from "./planet.js";
import PixelType from "./pixel_type.js";
import Vector from "./vector.js";
import Pixel from "./pixel.js";

import PhysicsPixel from "./archive/physics_pixel.js";

export default class CircularPlanet extends Planet {
    NEW_GOLD_PCT = 5;
    CONTINUE_GOLD_PCT_BOOST = 30;

    constructor(gameBounds, radius) {
        let size = radius * 2;
        super(gameBounds, size, size);
    }

    static fromJSON(json) {
        let planet = new CircularPlanet(Vector.fromJSON(json.gameBounds), json.radius);
        let pixels = [];
        for (const pixelJson of json.pixels) {
            pixels.push(Pixel.fromJSON(pixelJson));
        }
        planet.pixels = pixels;
        return planet;
    }

    createPlanetData() {
        console.log("Drawing circle");
        const thetaIncrementMin = 0.001;
        const thetaIncrementMax = 0.01;
        let previousWasGold = false;
        for (let r = 0; r < this.radius; r += 0.5) {
            const thetaIncrement =
                thetaIncrementMax + (thetaIncrementMin - thetaIncrementMax) * (r / this.radius);

            for (let theta = 0; theta < 2 * Math.PI; theta += thetaIncrement) {
                let position = this.polarToCartesian(r, theta);
                position.round();
                if (this.getPixel(position)) {
                    continue;
                }
                let threshold =
                    this.NEW_GOLD_PCT + (previousWasGold ? this.CONTINUE_GOLD_PCT_BOOST : 0);
                let isGold = Math.random() * 100 < threshold;
                let pixel = this.addPixel(position, isGold ? PixelType.GOLD : PixelType.DIRT);
                previousWasGold = isGold;
                if (pixel && pixel instanceof PhysicsPixel) {
                    pixel.setActive(false);
                }
            }
        }
    }
}
