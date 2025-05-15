// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import Panzoom from "@panzoom/panzoom";

export default class PanZoomWrapper {
    static ZOOM_MIN = 0.3;
    static ZOOM_MAX = 1;
    static ZOOM_INCREMENT = 0.2;

    constructor(element) {
        this.element = element;
        this.panzoom = Panzoom(this.element, {
            minScale: PanZoomWrapper.ZOOM_MIN,
            maxScale: PanZoomWrapper.ZOOM_MAX,
            canvas: true,
            cursor: "grab",
            disableZoom: false,
        });
        this.element.parentElement.addEventListener("pointerdown", this.#startDrag.bind(this));
        this.element.parentElement.addEventListener("wheel", this.panzoom.zoomWithWheel);
    }

    #startDrag(e) {
        e.preventDefault();
        this.element.parentElement.style.cursor = "grabbing";
        document.addEventListener("pointerup", this.#stopDrag.bind(this));
    }

    #stopDrag(e) {
        this.element.parentElement.style.cursor = "grab";
        document.removeEventListener("pointerup", this.#stopDrag);
    }

    getZoom() {
        return 1 / this.getScale();
    }

    getScale() {
        return this.panzoom.getScale();
    }

    destroy() {
        this.panzoom.destroy();
        this.element.parentElement.removeEventListener("mousedown", this.#startDrag);
    }
}
