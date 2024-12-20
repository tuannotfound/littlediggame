class Layer {
    constructor(name, width, height) {
        this.name = name;
        this.container = null;
        this.width = width;
        this.height = height;
        this.canvas = null;
    }

    initCommon() {
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.canvas.getContext("2d").imageSmoothingEnabled = false;
    }

    initOffscreen() {
        this.canvas = new OffscreenCanvas(this.width, this.height);
        this.initCommon();
    }

    initOnscreen(container) {
        this.canvas = document.createElement("canvas");
        this.initCommon();
        this.canvas.id = this.name;

        this.canvas.onselectstart = function () {
            return false;
        };
        this.container = container;
        this.container.appendChild(this.canvas);
    }

    getContext() {
        return this.canvas.getContext("2d");
    }
}
