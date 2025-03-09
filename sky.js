import Color from "./color.js";
import Layer from "./layer.js";
import Vector from "./vector.js";

export default class Sky {
    static TRANSITION_DURATION_FRAMES = 120;
    static DEFAULT_BAND_HEIGHT_PX = 10;

    constructor() {
        this.size = new Vector();
        this.layer = new Layer(this.constructor.name, this.width, this.height);
        this.colors = null;
        this.prevColors = null;
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

    setColors(colors) {
        this.transitionFrameCount = 0;
        this.prevColors = this.colors;
        this.colors = colors;
        if (this.prevColors == null) {
            this.prevColors = colors;
        }
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
        if (this.colors == null) {
            return;
        }
        let ctx = this.layer.getContext();
        let transitionProgress = this.transitionFrameCount / Sky.TRANSITION_DURATION_FRAMES;
        for (let i = 0; i < this.bandCount; i++) {
            let factor = i / (this.bandCount - 1);
            let color = Color.lerp(this.colors.top, this.colors.bottom, factor);
            if (transitionProgress >= 0) {
                let prevColorAtBand = Color.lerp(
                    this.prevColors.top,
                    this.prevColors.bottom,
                    factor
                );
                color = Color.lerp(prevColorAtBand, color, transitionProgress);
            }
            ctx.fillStyle = color.asCssString();
            let bandHeight = Math.min(this.bandHeight, this.size.y - i * this.bandHeight);
            ctx.fillRect(0, i * this.bandHeight, this.size.x, bandHeight);
        }
    }
}
