import Color from "../color.js";
import Pixel from "./pixel.js";
import PixelType from "./pixel_type.js";
import Constants from "./constants.js";

export default class Serpent extends Pixel {
    static SURFACE_COLOR = new Color(85, 51, 97).immutableCopy();
    static COLOR_VARIABILITY = 5;
    // Unused so far
    static SPECKLE_COLOR = new Color(134, 250, 57).immutableCopy();

    static HEALTH = 100;

    constructor(position, upgrades) {
        super(position, upgrades, PixelType.SERPENT, Serpent.HEALTH);

        this.color = Color.wiggle(Constants.SERPENT_COLOR, Serpent.COLOR_VARIABILITY);
        this.surfaceColor = Color.wiggle(Serpent.SURFACE_COLOR, Serpent.COLOR_VARIABILITY);
    }

    actLikeDirt() {
        return false;
    }
}
