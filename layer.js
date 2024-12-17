class Layer {
    constructor(name, container, width, height) {
        this.name = name;
        this.container = container;
        this.width = width;
        this.height = height;
        this.canvas = null;
    }

    init() {
        this.canvas = document.createElement("canvas");
        this.canvas.id = this.name;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.container.appendChild(this.canvas);
    }

    getContext() {
        return this.canvas.getContext("2d");
    }
}
