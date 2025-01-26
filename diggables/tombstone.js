import Color from "../color.js";
import Pixel from "./pixel.js";
import PixelType from "./pixel_type.js";

export default class Tombstone extends Pixel {
    static COLOR = new Color(170, 170, 170).immutableCopy();
    static COLOR_VARIABILITY = 5;
    static DARKNESS_HIDE_THRESHOLD = 0.15;

    static HEALTH = 125;

    constructor(position, upgrades) {
        super(position, upgrades, PixelType.TOMBSTONE, Tombstone.HEALTH);

        this.color = Color.wiggle(Tombstone.COLOR, Tombstone.COLOR_VARIABILITY);
        this.surfaceColor = this.color.copy();
    }

    actLikeDirt() {
        return false;
    }
}
