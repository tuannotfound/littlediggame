import CircularPlanet from "./circular_planet.js";

// Doesn't really work well with a radius < 20 or so.
export default class SpikyPlanet extends CircularPlanet {
    constructor(radius) {
        super(
            radius,
            CircularPlanet.MAX_RADIUS_DIFF_FACTOR * 3,
            CircularPlanet.MAX_RADIUS_DELTA_PER_STEP_FACTOR * 20
        );
        this.circumferenceBeforeMatchup = 2 * Math.PI;
    }
}
