import CircularPlanet from "./circular_planet.js";
import Pixel from "../diggables/pixel.js";
import Color from "../color.js";

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
        this.className = "SpikyPlanet";
    }

    static fromJSON(json, upgrades) {
        let planet = new SpikyPlanet(json.baseRadius);
        return CircularPlanet.fromJSON(json, upgrades, planet);
    }

    get skyColors() {
        return {
            top: SpikyPlanet.GREY_SKY_TOP,
            bottom: SpikyPlanet.GREY_SKY_BOTTOM,
        };
    }

    getDirtVariant() {
        return Pixel.ICE_DIRT;
    }
}
