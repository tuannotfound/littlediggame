// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

export default class Layer {
    constructor(name) {
        this.name = name;
        this.container = null;
        this.canvas = null;
        this.initialized = false;
    }

    initCommon(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.getContext("2d").imageSmoothingEnabled = false;
    }

    initOffscreen(width, height) {
        this.canvas = new OffscreenCanvas(width, height);
        this.initCommon(width, height);
        this.initialized = true;
    }

    initOnscreen(width, height, container) {
        this.canvas = document.createElement("canvas");
        this.initCommon(width, height);
        this.canvas.id = "layer_" + this.name;

        this.canvas.onselectstart = function () {
            return false;
        };
        this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
        this.container = container;
        this.container.appendChild(this.canvas);
        this.initialized = true;
    }

    onResize(newSize) {
        this.destroy();
        if (this.initialized) {
            if (this.container) {
                this.initOnscreen(newSize.x, newSize.y, this.container);
            } else {
                this.initOffscreen(newSize.x, newSize.y);
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

    get width() {
        return this.canvas.width;
    }

    get height() {
        return this.canvas.height;
    }
}
