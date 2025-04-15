import Color from "../color.js";
import Pixel from "./pixel.js";
import PixelType from "./pixel_type.js";
import MathExtras from "../math_extras.js";

export default class Magic extends Pixel {
    static FRAMES_PER_COLOR_CHANGE = 15;

    static SURFACE_COLORS = [
        Color.RED,
        Color.YELLOW,
        Color.GREEN,
        Color.BLUE,
        Color.PURPLE,
        Color.YELLOW,
        Color.PINK,
    ];

    static HEALTH = 6000;

    static DARKNESS_HIDE_THRESHOLD = 0.25;

    constructor(position, upgrades) {
        super(position, upgrades, PixelType.MAGIC, Magic.HEALTH);

        this.colorIndex = 0;
        this.nextColorIndex = 1;
        this.framesSinceLastColorChange = 0;

        this.color = Magic.SURFACE_COLORS[this.colorIndex];
        this.surfaceColor = this.color;
    }

    actLikeDirt() {
        if (window.DEBUG) {
            return false;
        }
        return this.darkness >= Magic.DARKNESS_HIDE_THRESHOLD;
    }

    getRenderColor() {
        if (this.actLikeDirt()) {
            return this.isSurface ? this.getDirtSurfaceColor() : this.getDirtColor();
        }
        return this.isSurface ? this.surfaceColor : this.color;
    }

    render(imageData) {
        if (this.framesSinceLastColorChange >= Magic.FRAMES_PER_COLOR_CHANGE) {
            this.colorIndex = this.nextColorIndex;
            this.nextColorIndex = Math.round(
                MathExtras.randomBetween(0, Magic.SURFACE_COLORS.length - 1)
            );
            if (this.nextColorIndex === this.colorIndex) {
                this.nextColorIndex = (this.nextColorIndex + 1) % Magic.SURFACE_COLORS.length;
            }
            this.framesSinceLastColorChange = 0;
        } else {
            this.framesSinceLastColorChange++;
        }
        const progress = this.framesSinceLastColorChange / Magic.FRAMES_PER_COLOR_CHANGE;
        this.color = Color.lerp(
            Magic.SURFACE_COLORS[this.colorIndex],
            Magic.SURFACE_COLORS[this.nextColorIndex],
            progress
        );
        this.surfaceColor = this.color;
        super.render(imageData);
        if (!this.actLikeDirt()) {
            this.needsUpdate = true;
        }
    }
}
