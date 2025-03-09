import Color from "./color.js";
import Layer from "./layer.js";
import Vector from "./vector.js";

const BLUE_SKY_TOP = new Color(237, 253, 255).immutableCopy();
const BLUE_SKY_BOTTOM = new Color(212, 251, 255).immutableCopy();
const GREY_SKY_TOP = new Color(250, 250, 250).immutableCopy();
const GREY_SKY_BOTTOM = new Color(212, 212, 212).immutableCopy();
const GOOP_SKY_TOP = new Color(238, 219, 255).immutableCopy();
const GOOP_SKY_BOTTOM = new Color(206, 255, 204).immutableCopy();
const BLACK_SKY = new Color(0, 0, 0).immutableCopy();

export default class Sky {
    static TRANSITION_DURATION_FRAMES = 120;
    static DEFAULT_BAND_HEIGHT_PX = 10;

    constructor() {
        this.size = new Vector();
        this.layer = new Layer(this.constructor.name, this.width, this.height);
        this.colorIndex = 0;
        this.colors = [
            {
                from: BLUE_SKY_TOP,
                to: BLUE_SKY_BOTTOM,
            },
            {
                from: GOOP_SKY_TOP,
                to: GOOP_SKY_BOTTOM,
            },
            {
                from: GREY_SKY_TOP,
                to: GREY_SKY_BOTTOM,
            },
            {
                from: BLUE_SKY_TOP,
                to: BLUE_SKY_BOTTOM,
            },
            {
                from: BLACK_SKY,
                to: BLACK_SKY,
            },
        ];
        this.bandCount = 0;
        this.bandHeight = 0;
        this.transitionFrameCount = -1;
    }

    toJSON() {
        return {
            colorIndex: this.colorIndex,
        };
    }

    static fromJSON(json) {
        let sky = new Sky();
        sky.colorIndex = json.colorIndex;
        return sky;
    }

    init() {
        this.layer.initOffscreen();
        this.updateRenderData();
    }

    destroy() {
        this.layer.destroy();
    }

    onResize(newSize) {
        // Some buffer around the edges to ensure resize transitions don't flash any ankle.
        this.size.setXY(newSize.x * 2, newSize.y + 2);
        this.layer.onResize(this.size);
        this.bandCount = Math.max(2, Math.ceil(this.size.y / Sky.DEFAULT_BAND_HEIGHT_PX));
        this.bandHeight = Math.ceil(this.size.y / this.bandCount);
        this.updateRenderData();
    }

    advance() {
        this.transitionFrameCount = 0;
        this.colorIndex = (this.colorIndex + 1) % this.colors.length;
        this.updateRenderData();
    }

    update() {
        if (this.transitionFrameCount < 0) {
            return;
        }
        if (this.transitionFrameCount > Sky.TRANSITION_DURATION_FRAMES) {
            this.transitionFrameCount = -1;
            return;
        }
        this.transitionFrameCount++;
        this.updateRenderData();
    }

    updateRenderData() {
        if (!this.layer.initialized) {
            return;
        }
        let ctx = this.layer.getContext();
        let prevColors = this.colors[(this.colorIndex - 1) % this.colors.length];
        let transitionProgress = this.transitionFrameCount / Sky.TRANSITION_DURATION_FRAMES;
        let colors = this.colors[this.colorIndex];
        for (let i = 0; i < this.bandCount; i++) {
            let factor = i / (this.bandCount - 1);
            let color = Color.lerp(colors.from, colors.to, factor);
            if (transitionProgress >= 0) {
                let prevColorAtBand = Color.lerp(prevColors.from, prevColors.to, factor);
                color = Color.lerp(prevColorAtBand, color, transitionProgress);
            }
            ctx.fillStyle = color.asCssString();
            let bandHeight = Math.min(this.bandHeight, this.size.y - i * this.bandHeight);
            ctx.fillRect(0, i * this.bandHeight, this.size.x, bandHeight);
        }
    }
}
