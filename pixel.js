import PixelType from "./pixel_type.js";
import Color from "./color.js";
import MathExtras from "./math_extras.js";
import Vector from "./vector.js";

export default class Pixel {
    // If darkness is higher than this value then this pixel will appear to be dirt.
    HIDE_THRESHOLD = 0.15;
    DIAMOND_SHIMMER_PCT = 0.2;
    DIAMOND_SHIMMER_FRAMES_MAX = 5;
    DIAMOND_SHIMMER_COLOR_MOD = 1.2;

    constructor(position, type = PixelType.DIRT, upgrades) {
        this.position = position.copy();
        this.type = type;
        this.upgrades = upgrades;
        this.color = type.variableColor ? Color.wiggle(type.color, 10) : new Color(type.color);
        this.surfaceColor = type.variableColor
            ? Color.wiggle(type.surfaceColor, 10)
            : new Color(type.surfaceColor);
        this.altColor = type.altColor ? type.altColor : null;
        this.initialAlpha = this.color.a;
        // It's a diamond thing. You wouldn't understand.
        this.shimmeringFrames = 0;

        this.renderPosition = position.copy();
        this.renderPosition.round();
        this.isSurface = false;
        // 0-1, where 0 is no change to the color, 1 is fully black
        this.darkness = 0;
    }

    toJSON() {
        return {
            position: this.position,
            typeName: this.type.name,
            color: this.color,
            surfaceColor: this.surfaceColor,
            renderPosition: this.renderPosition,
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
        pixel.renderPosition = Vector.fromJSON(json.renderPosition);
        pixel.isSurface = json.isSurface;
        pixel.darkness = json.darkness;
        return pixel;
    }

    actLikeDirt() {
        let actLikeDirt = false;
        if (this.type == PixelType.GOLD && !this.upgrades.gold && !window.DEBUG) {
            actLikeDirt = true;
        } else if (this.type == PixelType.DIAMOND && !this.upgrades.diamonds && !window.DEBUG) {
            actLikeDirt = true;
        } else if (this.darkness >= this.HIDE_THRESHOLD && !window.DEBUG) {
            if (
                (this.type == PixelType.GOLD && !this.upgrades.goldRadar) ||
                (this.type == PixelType.DIAMOND && !this.upgrades.diamondRadar)
            ) {
                actLikeDirt = true;
            }
        }
        return actLikeDirt;
    }

    getRenderColor() {
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

    render(imageData) {
        if (this.renderPosition.x < 0 || this.renderPosition.x >= imageData.width) {
            return;
        }
        if (this.renderPosition.y < 0 || this.renderPosition.y >= imageData.height) {
            return;
        }
        let pixelIndex = (this.renderPosition.x + this.renderPosition.y * imageData.width) * 4;
        let color = this.getRenderColor();
        imageData.data[pixelIndex] = Math.round(color.r * (1 - this.darkness)); // Red
        imageData.data[pixelIndex + 1] = Math.round(color.g * (1 - this.darkness)); // Green
        imageData.data[pixelIndex + 2] = Math.round(color.b * (1 - this.darkness)); // Blue
        imageData.data[pixelIndex + 3] = Math.round(color.a); // Alpha
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

    // Needed for quad tree
    get x() {
        return this.renderPosition.x;
    }

    get y() {
        return this.renderPosition.y;
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
