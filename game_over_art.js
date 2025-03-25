import Layer from "./layer.js";

export default class GameOverArt {
    static SIZE_PX = 256;
    static WON_PATH = "assets/victory_256.png";
    static LOST_PATH = "assets/defeat_256.png";
    // Roughly 5 seconds.
    static FADE_IN_DURATION_FRAMES = 5 * 60;

    constructor() {
        this.artPath = null;
        this.layer = new Layer(GameOverArt.name, GameOverArt.SIZE_PX, GameOverArt.SIZE_PX);
        this.opacity = 0;
        this.initialized = false;
        this.image = new Image();
    }

    initialize(won, initializedCallback) {
        this.artPath = won ? GameOverArt.WON_PATH : GameOverArt.LOST_PATH;
        this.layer.initOffscreen();
        this.layer.getContext().globalAlpha = this.opacity;
        this.image.src = this.artPath;
        this.image.onload = () => {
            this.layer.getContext().drawImage(this.image, 0, 0);
            this.initialized = true;
            initializedCallback();
        };
    }

    update() {
        if (!this.initialized) {
            return;
        }
        if (this.opacity != 1) {
            this.opacity += 1 / GameOverArt.FADE_IN_DURATION_FRAMES;
            if (this.opacity > 1) {
                this.opacity = 1;
            }
        }
        this.layer.getContext().clearRect(0, 0, this.layer.width, this.layer.height);
        this.layer.getContext().globalAlpha = this.opacity;
        this.layer.getContext().drawImage(this.image, 0, 0);
    }
}
