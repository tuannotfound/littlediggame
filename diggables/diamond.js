import Color from "../color.js";
import Pixel from "./pixel.js";
import PixelType from "./pixel_type.js";
import Constants from "./constants.js";

export default class Diamond extends Pixel {
    static SURFACE_COLOR = new Color(155, 232, 250).immutableCopy();
    static SHIMMER_COLOR = new Color(200, 250, 254).immutableCopy();
    static DARKNESS_HIDE_THRESHOLD = 0.15;
    static DIAMOND_SHIMMER_PCT = 0.2;
    static DIAMOND_SHIMMER_FRAMES_MAX = 5;
    static DIAMOND_SHIMMER_COLOR_MOD = 1.2;

    static HEALTH = 250;

    constructor(position, upgrades) {
        super(position, upgrades, PixelType.DIAMOND, Diamond.HEALTH);

        this.color = Constants.DIAMOND_COLOR.copy();
        this.surfaceColor = Diamond.SURFACE_COLOR.copy();

        this.shimmeringFrames = 0;
        this.shimmerColor = Diamond.SHIMMER_COLOR.copy();
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

    getRenderColor() {
        if (this.bloodiedColor || this.actLikeDirt()) {
            return super.getRenderColor();
        }
        if (this.shimmeringFrames > 0 || Math.random() * 100 < Diamond.DIAMOND_SHIMMER_PCT) {
            if (this.shimmeringFrames >= Diamond.DIAMOND_SHIMMER_FRAMES_MAX) {
                this.shimmeringFrames = 0;
            } else {
                this.shimmeringFrames++;
                return Diamond.SHIMMER_COLOR;
            }
        }
        return super.getRenderColor();
    }
}
