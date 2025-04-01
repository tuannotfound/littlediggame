import MathExtras from "./math_extras.js";
export default class Draggable {
    static ZOOM_MIN = 0.5;
    static ZOOM_MAX = 1;
    static ZOOM_INCREMENT = 0.2;
    constructor(element) {
        this.element = element;
        this.isDragging = false;
        this.initialX = 0;
        this.initialY = 0;
        this.initialChildX = 0;
        this.initialChildY = 0;
        this.scale = 1;

        this.element.parentElement.addEventListener("mousedown", this._startDrag.bind(this));
        this.element.parentElement.addEventListener("touchstart", this._startDrag.bind(this));
        this.element.parentElement.addEventListener("wheel", this._zoom.bind(this)); // Add wheel event listener
    }

    destroy() {
        this.element.parentElement.removeEventListener("mousedown", this._startDrag);
        this.element.parentElement.removeEventListener("touchstart", this._startDrag);
        this.element.parentElement.removeEventListener("wheel", this._zoom); // Remove wheel event listener
    }

    _startDrag(e) {
        this.isDragging = true;
        this.element.parentElement.style.cursor = "grabbing";
        const event = e.touches ? e.touches[0] : e;

        this.initialX = event.clientX;
        this.initialY = event.clientY;

        const childStyles = window.getComputedStyle(this.element);
        this.initialChildX = parseInt(childStyles.left, 10);
        this.initialChildY = parseInt(childStyles.top, 10);

        document.addEventListener("mousemove", this._move.bind(this));
        document.addEventListener("touchmove", this._move.bind(this));
        document.addEventListener("mouseup", this._stopDrag.bind(this));
        document.addEventListener("touchend", this._stopDrag.bind(this));
        document.addEventListener("mouseleave", this._stopDrag.bind(this));
    }

    _move(e) {
        if (!this.isDragging) return;
        const event = e.touches ? e.touches[0] : e;
        const deltaX = event.clientX - this.initialX;
        const deltaY = event.clientY - this.initialY;
        this.element.style.left = `${this.initialChildX + deltaX}px`;
        this.element.style.top = `${this.initialChildY + deltaY}px`;
    }

    _stopDrag() {
        this.isDragging = false;
        this.element.parentElement.style.cursor = "grab";
        document.removeEventListener("mousemove", this._move);
        document.removeEventListener("touchmove", this._move);
        document.removeEventListener("mouseup", this._stopDrag);
        document.removeEventListener("touchend", this._stopDrag);
        document.removeEventListener("mouseleave", this._stopDrag);
    }

    // This just really doesn't work right.
    _zoom(e) {
        e.preventDefault(); // Prevent the default scroll behavior
        const newScale = MathExtras.clamp(
            e.deltaY < 0
                ? this.scale + Draggable.ZOOM_INCREMENT
                : this.scale - Draggable.ZOOM_INCREMENT,
            Draggable.ZOOM_MIN,
            Draggable.ZOOM_MAX
        );
        if (this.scale == newScale) {
            return;
        }

        //const previousScale = this.scale;
        this.scale = newScale;

        const mouseX = e.clientX - this.element.getBoundingClientRect().left;
        const mouseY = e.clientY - this.element.getBoundingClientRect().top;

        const originX = mouseX;
        const originY = mouseY;
        // Make the transform origin the cursor position relative to the element to ensure that
        // whatever is under the cursor is still under the cursor after the zoom.
        this.element.style.transformOrigin = `${originX}px ${originY}px`;
        this.element.style.transform = `scale(${this.scale})`;
    }
}
