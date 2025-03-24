import Color from "../color.js";
import Pixel from "./pixel.js";
import PixelType from "./pixel_type.js";
import Constants from "./constants.js";

export default class Diamond extends Pixel {
    static SURFACE_COLOR = new Color(155, 232, 250).immutableCopy();
    static DARKNESS_HIDE_THRESHOLD = 0.15;

    static HEALTH = 250;

    constructor(position, upgrades) {
        super(position, upgrades, PixelType.DIAMOND, Diamond.HEALTH);

        this.color = Constants.DIAMOND_COLOR.copy();
        this.surfaceColor = Diamond.SURFACE_COLOR.copy();
    }

    actLikeDirt() {
        if (window.DEBUG) {
            return false;
        }
        if (!this.upgrades.unlockDiamonds) {
            return true;
        }
        return this.darkness >= Diamond.DARKNESS_HIDE_THRESHOLD;
    }
}
