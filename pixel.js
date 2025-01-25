import PixelType from "./pixel_type.js";
import Color from "./color.js";
import MathExtras from "./math_extras.js";
import Vector from "./vector.js";

// Not really a general-purpose pixel. These are the pixels that make up the planet and can be dug.
export default class Pixel {
    // If darkness is higher than this value then this pixel will appear to be dirt.
    HIDE_THRESHOLD = 0.15;
    HIDE_THRESHOLD_EGG = 0.3;
    DIAMOND_SHIMMER_PCT = 0.2;
    DIAMOND_SHIMMER_FRAMES_MAX = 5;
    DIAMOND_SHIMMER_COLOR_MOD = 1.2;
    HEALTH_VISUAL_PCT_INTERVAL = 20;
    EGG_SPECKLE_CHANCE_PCT = 8;

    constructor(position, type = PixelType.DIRT, upgrades) {
        this.position = position.copy();
        this.position.round();
        this.type = type;
        this.upgrades = upgrades;

        // Maybe introduce a speckle on an egg?
        if (this.type == PixelType.EGG && 100 * Math.random() < this.EGG_SPECKLE_CHANCE_PCT) {
            this.color = Color.wiggle(type.altColor, 10);
        } else {
            this.color = type.variableColor ? Color.wiggle(type.color, 10) : new Color(type.color);
        }
        this.hideThreshold =
            this.type == PixelType.EGG ? this.HIDE_THRESHOLD_EGG : this.HIDE_THRESHOLD;
        this.surfaceColor = type.variableColor
            ? Color.wiggle(type.surfaceColor, 10)
            : new Color(type.surfaceColor);
        this.health = type.health;
        this.altColor = type.altColor ? type.altColor : null;
        this.initialAlpha = this.color.a;
        // It's a diamond thing. You wouldn't understand.
        this.shimmeringFrames = 0;

        this.isSurface = false;
        // 0-1, where 0 is no change to the color, 1 is fully black
        this.darkness = 0;
        this.bloodiedColor = null;
    }

    toJSON() {
        return {
            position: this.position,
            typeName: this.type.name,
            color: this.color,
            surfaceColor: this.surfaceColor,
            health: this.health,
            isSurface: this.isSurface,
            darkness: this.darkness,
        };
    }

    static fromJSON(json, upgrades) {
        let position = Vector.fromJSON(json.position);
        let type = PixelType[json.typeName];
        let pixel = new Pixel(position, type, upgrades);
        pixel.color = json.color;
        pixel.surfaceColor = json.surfaceColor;
        pixel.health = json.health;
        pixel.isSurface = json.isSurface;
        pixel.darkness = json.darkness;
        return pixel;
    }

    actLikeDirt() {
        let actLikeDirt = false;
        if (this.type == PixelType.GOLD && !this.upgrades.unlock_gold && !window.DEBUG) {
            actLikeDirt = true;
        } else if (
            this.type == PixelType.DIAMOND &&
            !this.upgrades.unlock_diamonds &&
            !window.DEBUG
        ) {
            actLikeDirt = true;
        } else if (this.darkness >= this.hideThreshold && !window.DEBUG) {
            if (
                (this.type == PixelType.GOLD && !this.upgrades.goldRadar) ||
                (this.type == PixelType.DIAMOND && !this.upgrades.diamondRadar) ||
                this.type == PixelType.EGG
            ) {
                actLikeDirt = true;
            }
        }
        return actLikeDirt;
    }

    getRenderColor() {
        if (this.bloodiedColor) {
            return this.bloodiedColor;
        }
        if (this.actLikeDirt()) {
            return this.isSurface ? PixelType.DIRT.surfaceColor : PixelType.DIRT.color;
        } else if (
            this.type == PixelType.DIAMOND &&
            (this.shimmeringFrames > 0 || Math.random() * 100 < this.DIAMOND_SHIMMER_PCT)
        ) {
            if (this.shimmeringFrames >= this.DIAMOND_SHIMMER_FRAMES_MAX) {
                this.shimmeringFrames = 0;
            } else {
                this.shimmeringFrames++;
                return this.altColor;
            }
        }
        return this.isSurface ? this.surfaceColor : this.color;
    }

    getRenderAlpha() {
        let maxAlpha = this.initialAlpha;
        let actLikeDirtDiff = this.actLikeDirt() ? this.type.health - PixelType.DIRT.health : 0;
        let healthPct =
            (100 * (this.health - actLikeDirtDiff)) / (this.type.health - actLikeDirtDiff);
        healthPct = MathExtras.ceilToNearest(this.HEALTH_VISUAL_PCT_INTERVAL, healthPct);
        return (maxAlpha * healthPct) / 100;
    }

    render(imageData, offset) {
        let renderPosition = offset ? Vector.add(this.position, offset) : this.position;
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
        let actLikeDirt = this.actLikeDirt();
        if (!actLikeDirt) {
            return this.health;
        }
        let actLikeDirtDiff = this.type.health - PixelType.DIRT.health;
        return Math.max(0, this.health - actLikeDirtDiff);
    }

    setSurface(isSurface) {
        this.isSurface = isSurface;
    }

    setDarkness(darkness) {
        this.darkness = MathExtras.clamp(darkness, 0, 1);
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
