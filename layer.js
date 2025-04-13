export default class Layer {
    constructor(name, width, height) {
        this.name = name;
        this.container = null;
        this.width = width;
        this.height = height;
        this.canvas = null;
        this.initialized = false;
    }

    initCommon() {
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.getContext("2d").imageSmoothingEnabled = false;
    }

    initOffscreen() {
        this.canvas = new OffscreenCanvas(this.width, this.height);
        this.initCommon();
        this.initialized = true;
    }

    initOnscreen(container) {
        this.canvas = document.createElement("canvas");
        this.initCommon();
        this.canvas.id = "layer_" + this.name;

        this.canvas.onselectstart = function () {
            return false;
        };
        this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
        this.container = container;
        this.container.appendChild(this.canvas);
        this.initialized = true;
    }

    onResize(newBounds) {
        this.destroy();
        this.width = newBounds.x;
        this.height = newBounds.y;
        if (this.initialized) {
            if (this.container) {
                this.initOnscreen(this.container);
            } else {
                this.initOffscreen();
            }
        }
    }

    getContext() {
        return this.canvas.getContext("2d");
    }

    destroy() {
        if (this.container) {
            this.container.removeChild(this.canvas);
        }
        this.canvas = null;
    }
}
