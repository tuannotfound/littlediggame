import CircularPlanet from "./circular_planet.js";
import Vector from "../vector.js";
import PixelType from "../diggables/pixel_type.js";

export default class EggPlanet extends CircularPlanet {
    static EGG_WIDTH = 7;
    static EGG_HEIGHT = 7;
    static EGG_POINTINESS = 1.2;

    createInitialPixels() {
        super.createInitialPixels();
        this.emplaceEgg();
    }

    emplaceEgg() {
        let extent = Math.max(EggPlanet.EGG_WIDTH, EggPlanet.EGG_HEIGHT) + 2;

        function eggValue(x, y) {
            return (
                y ** 2 / EggPlanet.EGG_HEIGHT ** 2 +
                (x ** 2 * (1 + EggPlanet.EGG_POINTINESS ** -y)) / EggPlanet.EGG_WIDTH ** 2
            );
        }
        for (let x = -extent; x <= extent; x++) {
            for (let y = -extent; y <= extent; y++) {
                if (eggValue(x, y) < 1) {
                    let coords = new Vector(x + this.center.x, y + this.center.y);
                    let existing = this.getPixel(coords);
                    if (existing) {
                        this.removePixel(existing, false);
                    }
                    this.addPixel(coords, PixelType.EGG);
                }
            }
        }
    }
}
