import Color from "../color.js";
import Pixel from "./pixel.js";
import PixelType from "./pixel_type.js";
import Constants from "./constants.js";

export default class Dirt extends Pixel {
    static COLOR_VARIABILITY = 10;

    constructor(position, upgrades) {
        super(position, upgrades, PixelType.DIRT, Constants.DIRT_INITIAL_HEALTH);

        this.color = Color.wiggle(this.getDirtColor(), Dirt.COLOR_VARIABILITY);
        this.surfaceColor = Color.wiggle(this.getDirtSurfaceColor(), Dirt.COLOR_VARIABILITY);
    }

    actLikeDirt() {
        // We want to use the 'wiggled' dirt colors.
        return false;
    }
}
