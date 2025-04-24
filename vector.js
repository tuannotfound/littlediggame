export default class Vector {
    constructor(x, y) {
        if (typeof x === "number" || x == null) {
            this.x = x || 0;
            this.y = y || 0;
        } else {
            // Copy ctor
            this.x = x.x || 0;
            this.y = x.y || 0;
        }
    }

    static fromJSON(json) {
        return Object.assign(new Vector(), json);
    }

    copy() {
        return new Vector(this);
    }

    set(x, y) {
        if (x instanceof Vector) {
            this.x = x.x;
            this.y = x.y;
        } else {
            this.x = x;
            this.y = y;
        }
        return this;
    }

    equals(other) {
        if (other instanceof Vector) {
            return this.x === other.x && this.y === other.y;
        }
        return false;
    }

    static equals(v1, v2) {
        if (v1 instanceof Vector) {
            return v1.equals(v2);
        }
        return false;
    }

    toString() {
        return "[" + this.x + ", " + this.y + "]";
    }

    // Rounding
    round() {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        return this;
    }

    floor() {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        return this;
    }

    ceil() {
        this.x = Math.ceil(this.x);
        this.y = Math.ceil(this.y);
        return this;
    }

    // Basic math
    add(x, y) {
        if (typeof x === "number" && y == null) {
            this.x += x;
            this.y += x;
        } else if (x instanceof Vector) {
            this.x += x.x;
            this.y += x.y;
        } else {
            this.x += x;
            this.y += y;
        }
        return this;
    }

    static add(v1, v2) {
        if (v2 instanceof Vector) {
            return new Vector(v1.x + v2.x, v1.y + v2.y);
        }

        return new Vector(v1.x + v2, v1.y + v2);
    }

    sub(x, y) {
        if (typeof x === "number" && y == null) {
            this.x -= x;
            this.y -= x;
        } else if (x instanceof Vector) {
            this.x -= x.x;
            this.y -= x.y;
        } else {
            this.x -= x;
            this.y -= y;
        }
        return this;
    }

    static sub(v1, v2) {
        if (v2 instanceof Vector) {
            return new Vector(v1.x - v2.x, v1.y - v2.y);
        }

        return new Vector(v1.x - v2, v1.y - v2);
    }

    mult(x, y) {
        if (typeof x === "number") {
            this.x *= x;
            this.y *= x;
        } else if (x instanceof Vector) {
            this.x *= x.x;
            this.y *= x.y;
        } else {
            this.x *= x;
            this.y *= y;
        }
        return this;
    }

    static mult(v1, v2) {
        if (v2 instanceof Vector) {
            return new Vector(v1.x * v2.x, v1.y * v2.y);
        }

        return new Vector(v1.x * v2, v1.y * v2);
    }

    div(x, y) {
        if (typeof x === "number") {
            this.x /= x;
            this.y /= x;
        } else if (x instanceof Vector) {
            this.x /= x.x;
            this.y /= x.y;
        } else {
            this.x /= x;
            this.y /= y;
        }
        return this;
    }

    static div(v1, v2) {
        if (v2 instanceof Vector) {
            return new Vector(v1.x / v2.x, v1.y / v2.y);
        }

        return new Vector(v1.x / v2, v1.y / v2);
    }

    // Geometry
    mag() {
        return Math.sqrt(this.magSq());
    }

    magSq() {
        return this.x * this.x + this.y * this.y;
    }

    dist(other) {
        return Math.sqrt(this.distSq(other));
    }

    distSq(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return dx * dx + dy * dy;
    }

    static rotate90CW(v, height) {
        return new Vector(height - 1 - v.y, v.x);
    }

    static rotate90CCW(v, width) {
        return new Vector(v.y, width - 1 - v.x);
    }

    static rotate180(v, width, height) {
        return new Vector(width - 1 - v.x, height - 1 - v.y);
    }
}
