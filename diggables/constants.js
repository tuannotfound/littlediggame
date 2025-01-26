import Color from "../color.js";

const DIRT_COLOR = new Color(133, 84, 5).immutableCopy();
const DIRT_SURFACE_COLOR = new Color(60, 180, 90).immutableCopy();
const DIRT_INITIAL_HEALTH = 100;

export default class Constants {
    static get DIRT_COLOR() {
        return DIRT_COLOR;
    }
    static get DIRT_SURFACE_COLOR() {
        return DIRT_SURFACE_COLOR;
    }
    static get DIRT_INITIAL_HEALTH() {
        return DIRT_INITIAL_HEALTH;
    }
}
