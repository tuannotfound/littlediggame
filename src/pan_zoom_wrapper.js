// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import Panzoom from "@panzoom/panzoom";

import Vector from "./vector.js";
import MathExtras from "./math_extras.js";

export default class PanZoomWrapper {
    static ZOOM_MIN = 0.5;
    static ZOOM_MAX = 1;
    static ZOOM_INCREMENT = 0.2;
    constructor(element) {
        this.element = element;
        this.panzoom = Panzoom(this.element, {
            minScale: PanZoomWrapper.ZOOM_MIN,
            maxScale: PanZoomWrapper.ZOOM_MAX,
            canvas: true,
            cursor: "grab",
            disableZoom: true,
        });
        this.element.parentElement.addEventListener("pointerdown", this.#startDrag.bind(this));
        // Couldn't quite get this working with the upgrades UI :(
        //this.element.parentElement.addEventListener("wheel", this.panzoom.zoomWithWheel);

        //this.element.addEventListener("panzoomchange", this.#onPanZoomChange.bind(this));
        this.element.addEventListener("panzoomend", this.#onPanZoomEnd.bind(this));
    }

    #startDrag(e) {
        e.preventDefault();
        this.element.parentElement.style.cursor = "grabbing";
        document.addEventListener("pointerup", this.#stopDrag.bind(this));
    }

    #stopDrag() {
        this.element.parentElement.style.cursor = "grab";
        document.removeEventListener("pointerup", this.#stopDrag);
    }

    // #onPanZoomChange() {
    //     // This makes for very choppy panning
    //     LinkerLine.positionAll();
    // }

    #onPanZoomEnd() {
        // Prevent the user from panning too far away from the content.
        const parentRect = this.element.parentElement.getBoundingClientRect();

        const buffer = new Vector(50, 25);

        const currentPan = this.panzoom.getPan();

        let clampedLeft = MathExtras.clamp(
            currentPan.x,
            -this.element.scrollWidth + parentRect.width - buffer.x,
            buffer.x
        );
        let clampedTop = MathExtras.clamp(
            currentPan.y,
            -this.element.scrollHeight + parentRect.height - buffer.y,
            buffer.y
        );

        const delta = new Vector(clampedLeft - currentPan.x, clampedTop - currentPan.y);
        delta.div(this.panzoom.getScale());
        if (delta.x != 0 || delta.y != 0) {
            const newPan = new Vector(currentPan.x + delta.x, currentPan.y + delta.y);
            this.panzoom.pan(newPan.x, newPan.y, {
                animate: true,
            });
        }
    }

    destroy() {
        this.panzoom.destroy();
        this.element.parentElement.removeEventListener("mousedown", this.#startDrag);
    }
}
