// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import MathExtras from "./math_extras.js";

export default class Color {
    static WHITE = new Color(255, 255, 255).immutableCopy();
    static BLACK = new Color(0, 0, 0).immutableCopy();
    static BLOOD = new Color(168, 37, 37).immutableCopy();
    static FIRE_START = new Color(237, 65, 7).immutableCopy();
    static FIRE_END = new Color(252, 244, 91).immutableCopy();
    static DARK_ORANGE = new Color(214, 98, 26).immutableCopy();
    static RED = new Color(247, 70, 57).immutableCopy();
    static ORANGE = new Color(235, 148, 35).immutableCopy();
    static LIGHT_ORANGE = new Color(247, 172, 52).immutableCopy();
    static YELLOW = new Color(235, 245, 56).immutableCopy();
    static GREEN = new Color(50, 230, 59).immutableCopy();
    static BLUE = new Color(39, 97, 245).immutableCopy();
    static PURPLE = new Color(210, 60, 240).immutableCopy();
    static PINK = new Color(252, 50, 205).immutableCopy();

    constructor(r, g, b, a) {
        if (
            arguments.length === 1 &&
            typeof r === "object" &&
            r.hasOwnProperty("r") &&
            r.hasOwnProperty("g") &&
            r.hasOwnProperty("b") &&
            r.hasOwnProperty("a")
        ) {
            // Copy constructor - invoked if a single object is passed
            this.r = r.r;
            this.g = r.g;
            this.b = r.b;
            this.a = r.a;
        } else if (arguments.length === 4) {
            // invoked if 4 numbers are passed as parameters, for RGBA.
            this.r = r;
            this.g = g;
            this.b = b;
            this.a = a;
        } else if (arguments.length === 3) {
            // invoked if 3 numbers are passed as parameters, RGB, and alpha defaults to 255.
            this.r = r;
            this.g = g;
            this.b = b;
            this.a = 255; // Default alpha
        } else if (arguments.length === 0) {
            // Default to black
            this.r = 0;
            this.g = 0;
            this.b = 0;
            this.a = 255;
        } else {
            throw new Error("Invalid arguments for Color constructor");
        }
    }

    clamp() {
        Color.clamp(this);
    }

    copy() {
        return new Color(this);
    }

    immutableCopy() {
        return Object.freeze(new Color(this));
    }

    asCssString() {
        return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
    }

    static fromJSON(json) {
        return Object.assign(new Color(), json);
    }

    static clampValue(value) {
        return MathExtras.clamp(Math.round(value), 0, 255);
    }

    static clamp(color) {
        color.r = Color.clampValue(color.r);
        color.g = Color.clampValue(color.g);
        color.b = Color.clampValue(color.b);
        color.a = Color.clampValue(color.a);
    }

    static wiggle(color, maxChange = 5) {
        let wiggled = new Color(color);
        wiggled.r += Math.round((Math.random() * 2 - 1) * maxChange);
        wiggled.g += Math.round((Math.random() * 2 - 1) * maxChange);
        wiggled.b += Math.round((Math.random() * 2 - 1) * maxChange);
        wiggled.clamp();
        return wiggled;
    }

    static diff(c1, c2) {
        return new Color(c2.r - c1.r, c2.g - c1.g, c2.b - c1.b, c2.a - c1.a);
    }

    static lerp(color1, color2, factor) {
        let result = new Color();
        result.r = color1.r + factor * (color2.r - color1.r);
        result.g = color1.g + factor * (color2.g - color1.g);
        result.b = color1.b + factor * (color2.b - color1.b);
        result.a = color1.a + factor * (color2.a - color1.a);
        result.clamp();
        return result;
    }

    equals(other) {
        if (other instanceof Color) {
            return (
                this.r === other.r && this.g === other.g && this.b === other.b && this.a === other.a
            );
        }
        return false;
    }

    static equals(c1, c2) {
        if (c1 instanceof Color) {
            return c1.equals(c2);
        }
        return false;
    }
}
