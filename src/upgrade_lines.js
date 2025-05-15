// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import Color from "./color.js";

export default class UpgradeLines {
    #containerSvg;
    #lines = [];

    constructor(containerSvg) {
        this.#containerSvg = containerSvg;
    }

    addLine(startEl, endEl, color, dashed) {
        const line = new UpgradeLine(this.#containerSvg, startEl, endEl, color, dashed);
        this.#lines.push(line);
        return line;
    }

    positionAll() {
        const parent = this.#containerSvg.parentElement;
        this.#containerSvg.style.width = parent.scrollWidth + "px";
        this.#containerSvg.style.height = parent.scrollHeight + "px";
        for (const line of this.#lines) {
            line.position();
        }
    }
}

class UpgradeLine {
    #startEl;
    #endEl;

    #lineEl;

    #color;
    #dashed;

    constructor(containerSvg, startEl, endEl, color, dashed) {
        this.#startEl = startEl;
        this.#endEl = endEl;
        this.#color = color || Color.BLACK;
        this.#dashed = dashed || false;
        this.#lineEl = this.#create();
        containerSvg.appendChild(this.#lineEl);
    }

    #create() {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
        line.setAttribute("fill", "transparent");
        line.setAttribute("stroke", this.#color.asCssString());
        line.setAttribute("stroke-width", 2);
        if (this.#dashed) {
            line.setAttribute("stroke-dasharray", "3");
        }
        return line;
    }

    position() {
        const x1 = this.#startEl.offsetLeft + this.#startEl.offsetWidth;
        const y1 = this.#startEl.offsetTop + Math.round(this.#startEl.offsetHeight / 2);
        const x2 = this.#endEl.offsetLeft;
        const y2 = this.#endEl.offsetTop + Math.round(this.#endEl.offsetHeight / 2);
        const dx = x2 - x1;
        const dy = y2 - y1;
        this.#lineEl.setAttribute(
            "d",
            `M ${x1} ${y1} Q ${x1 + dx / 4} ${y1}, ${x1 + dx / 2} ${y1 + dy / 2} T ${x2} ${y2}`
        );
    }

    set color(color) {
        if (Color.equals(this.#color, color)) {
            return;
        }
        this.#color = color.immutableCopy();

        this.#lineEl.setAttribute("stroke", this.#color.asCssString());
    }

    get color() {
        return this.#color;
    }

    set dashed(dashed) {
        if (this.#dashed === dashed) {
            return;
        }
        this.#dashed = dashed;
        if (this.#dashed) {
            this.#lineEl.setAttribute("stroke-dasharray", "3");
        } else {
            this.#lineEl.removeAttribute("stroke-dasharray");
        }
    }

    get dashed() {
        return this.#dashed;
    }

    get line() {
        return this.#lineEl;
    }
}
