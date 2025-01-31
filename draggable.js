// Makes an element draggable within its parent window.
// 'element' should have:
//   * position: relative;
//   * touch-action: pan-x pan-y;
// and its parent should have:
//   * overflow: none;
export default class Draggable {
    constructor(element) {
        this.element = element;
        this.isDragging = false;
        this.initialX = 0;
        this.initialY = 0;
        this.initialChildX = 0;
        this.initialChildY = 0;

        this.element.parentElement.addEventListener("mousedown", this._startDrag.bind(this));
        this.element.parentElement.addEventListener("touchstart", this._startDrag.bind(this));
    }

    destroy() {
        this.element.parentElement.removeEventListener("mousedown", this._startDrag);
        this.element.parentElement.removeEventListener("touchstart", this._startDrag);
    }

    _startDrag(e) {
        e.preventDefault(); // Prevent default touch scrolling behavior if needed.
        this.isDragging = true;
        this.element.parentElement.style.cursor = "grabbing";
        const event = e.touches ? e.touches[0] : e;

        this.initialX = event.clientX;
        this.initialY = event.clientY;

        const childStyles = window.getComputedStyle(this.element);
        this.initialChildX = parseInt(childStyles.left, 10);
        this.initialChildY = parseInt(childStyles.top, 10);

        // Add move listeners only while dragging to optimize performance.
        document.addEventListener("mousemove", this._move.bind(this));
        document.addEventListener("touchmove", this._move.bind(this));
        document.addEventListener("mouseup", this._stopDrag.bind(this));
        document.addEventListener("touchend", this._stopDrag.bind(this));
        document.addEventListener("mouseleave", this._stopDrag.bind(this)); // Stop dragging if the mouse leaves the area
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
}
