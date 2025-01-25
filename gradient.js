import Color from "./color.js";

export default class Gradient {
    constructor(startColor, endColor) {
        this.startColor = startColor.copy();
        this.endColor = endColor.copy();

        this.diff = Color.diff(startColor, endColor);
    }

    get(percent) {
        if (percent <= 0) {
            return this.startColor.copy();
        } else if (percent >= 100) {
            return this.endColor.copy();
        }
        let r = this.startColor.r + (this.diff.r * percent) / 100;
        let g = this.startColor.g + (this.diff.g * percent) / 100;
        let b = this.startColor.b + (this.diff.b * percent) / 100;
        let a = this.startColor.a + (this.diff.a * percent) / 100;
        return new Color(r, g, b, a);
    }
}
