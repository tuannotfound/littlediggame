import PixelType from "./pixel_type.js";
import Color from "../color.js";
import MathExtras from "../math_extras.js";
import Vector from "../vector.js";
import Constants from "./constants.js";

// Not really a general-purpose pixel. These are the pixels that make up the planet and can be dug.
export default class Pixel {
    static HEALTH_VISUAL_PCT_INTERVAL = 20;

    constructor(position, upgrades, type, initialHealth, initialAlpha = 255) {
        this.position = position.copy();
        this.position.round();
        this.upgrades = upgrades;
        this.type = type;
        this.initialHealth = initialHealth;
        this.health = initialHealth;
        this.initialAlpha = initialAlpha;

        this._color = null;
        this._surfaceColor = null;

        this.isSurface = false;
        // 0-1, where 0 is no change to the color, 1 is fully black
        this._darkness = 0;
        this.bloodiedColor = null;
    }

    toJSON() {
        return {
            position: this.position,
            typeName: this.type.name,
            color: this._color,
            surfaceColor: this._surfaceColor,
            health: this.health,
            isSurface: this.isSurface,
            darkness: this.darkness,
        };
    }

    static fromJSON(json, upgrades) {
        let position = Vector.fromJSON(json.position);
        let type = PixelType[json.typeName];
        let pixel = PixelFactory.create(position, upgrades, type);
        pixel.color = json.color;
        pixel.surfaceColor = json.surfaceColor;
        pixel.health = json.health;
        pixel.isSurface = json.isSurface;
        pixel.darkness = json.darkness;
        return pixel;
    }

    actLikeDirt() {
        throw Exception("Must be implemented by child class");
    }

    getRenderColor() {
        if (this.bloodiedColor) {
            return this.bloodiedColor;
        }
        if (this.actLikeDirt()) {
            return this.isSurface ? Constants.DIRT_SURFACE_COLOR : Constants.DIRT_COLOR;
        }
        return this.isSurface ? this.surfaceColor : this.color;
    }

    getRenderAlpha() {
        let maxAlpha = this.initialAlpha;
        let actLikeDirtDiff = this.actLikeDirt()
            ? this.initialHealth - Constants.DIRT_INITIAL_HEALTH
            : 0;
        let healthPct =
            (100 * (this.health - actLikeDirtDiff)) / (this.initialHealth - actLikeDirtDiff);
        healthPct = MathExtras.ceilToNearest(Pixel.HEALTH_VISUAL_PCT_INTERVAL, healthPct);
        return (maxAlpha * healthPct) / 100;
    }

    render(imageData) {
        let renderPosition = this.position;
        if (renderPosition.x < 0 || renderPosition.x >= imageData.width) {
            return;
        }
        if (renderPosition.y < 0 || renderPosition.y >= imageData.height) {
            return;
        }
        let pixelIndex = (renderPosition.x + renderPosition.y * imageData.width) * 4;
        let color = this.getRenderColor();
        let darkness = window.DEBUG ? 0 : this.darkness;
        imageData.data[pixelIndex] = Math.round(color.r * (1 - darkness)); // Red
        imageData.data[pixelIndex + 1] = Math.round(color.g * (1 - darkness)); // Green
        imageData.data[pixelIndex + 2] = Math.round(color.b * (1 - darkness)); // Blue
        let alpha = this.getRenderAlpha();
        imageData.data[pixelIndex + 3] = Math.round(alpha); // Alpha
    }

    damage(damage) {
        this.health = Math.max(0, this.health - damage);
    }

    // Accounts for if we're acting like dirt.
    getHealth() {
        if (!this.actLikeDirt()) {
            return this.health;
        }
        let actLikeDirtDiff = this.initialHealth - Constants.DIRT_INITIAL_HEALTH;
        return Math.max(0, this.health - actLikeDirtDiff);
    }

    setSurface(isSurface) {
        this.isSurface = isSurface;
    }

    setOpacity(opacity) {
        let alpha = MathExtras.clamp(opacity, 0, 1) * this.initialAlpha;
        this.color.a = alpha;
        this.surfaceColor.a = alpha;
    }

    bloody() {
        if (this.bloodiedColor) {
            return;
        }
        this.bloodiedColor = Color.wiggle(Color.BLOOD, 10);
    }

    get darkness() {
        return this._darkness;
    }

    set darkness(darkness) {
        this._darkness = MathExtras.clamp(darkness, 0, 1);
    }

    get color() {
        return this._color;
    }

    set color(color) {
        this._color = color;
    }

    get surfaceColor() {
        return this._surfaceColor;
    }

    set surfaceColor(surfaceColor) {
        this._surfaceColor = surfaceColor;
    }

    get isBloodied() {
        return !!this.bloodiedColor;
    }

    // Needed for quad tree
    get x() {
        return this.position.x;
    }

    get y() {
        return this.position.y;
    }

    get width() {
        return 1;
    }

    get height() {
        return 1;
    }

    get surface() {
        return this.isSurface;
    }
}
