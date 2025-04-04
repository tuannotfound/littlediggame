import Panzoom from "@panzoom/panzoom";

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
        });
        this.element.parentElement.addEventListener("pointerdown", this._startDrag.bind(this));
        this.element.parentElement.addEventListener("wheel", this.panzoom.zoomWithWheel);
    }

    _startDrag(e) {
        e.preventDefault();
        console.log("grabbing");
        this.element.parentElement.style.cursor = "grabbing";
        document.addEventListener("pointerup", this._stopDrag.bind(this));
    }

    _stopDrag() {
        console.log("ungrabbing");
        this.element.parentElement.style.cursor = "grab";
        document.removeEventListener("pointerup", this._stopDrag);
    }

    destroy() {
        this.panzoom.destroy();
        this.element.parentElement.removeEventListener("mousedown", this._startDrag);
    }
}
