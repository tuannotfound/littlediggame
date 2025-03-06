/**
 * Vector.js v1.0.0
 * @author Anurag Hazra
 * @borrows p5.Vector
 * @param {number} x
 * @param {number} y
 */
export default function Vector(x, y) {
    if (typeof x === "number" || x == null) {
        this.x = x || 0;
        this.y = y || 0;
    } else {
        this.x = x.x || 0;
        this.y = x.y || 0;
    }
}

Vector.prototype = {
    add: function (x, y) {
        if (arguments.length === 1) {
            if (typeof x === "number") {
                this.x += x;
                this.y += x;
            } else {
                this.x += x.x;
                this.y += x.y;
            }
        } else if (arguments.length === 2) {
            this.x += x;
            this.y += y;
        }
        return this;
    },
    sub: function (x, y) {
        if (arguments.length === 1) {
            if (typeof x === "number") {
                this.x -= x;
                this.y -= x;
            } else {
                this.x -= x.x;
                this.y -= x.y;
            }
        } else if (arguments.length === 2) {
            this.x -= x;
            this.y -= y;
        }
        return this;
    },
    mult: function (v) {
        if (typeof v === "number") {
            this.x *= v;
            this.y *= v;
        } else {
            this.x *= v.x;
            this.y *= v.y;
        }
        return this;
    },
    div: function (v) {
        if (typeof v === "number") {
            this.x /= v;
            this.y /= v;
        } else {
            this.x /= v.x;
            this.y /= v.y;
        }
        return this;
    },
    setAngle: function (angle) {
        var len = this.mag();
        this.x = Math.cos(angle) * len;
        this.y = Math.sin(angle) * len;
    },
    mag: function () {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    },
    magSq: function () {
        return this.x * this.x + this.y * this.y;
    },
    set: function (v) {
        return this.setXY(v.x, v.y);
    },
    setXY: function (x, y) {
        this.x = x;
        this.y = y;
        return this;
    },
    setMag: function (value) {
        this.normalize();
        this.mult(value);
        return this;
    },
    normalize: function () {
        let m = this.mag();
        if (m > 0) {
            this.div(m);
        }
        return this;
    },
    round: function () {
        this.x = Math.round(this.x);
        this.y = Math.round(this.y);
        return this;
    },
    floor: function () {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        return this;
    },
    ceil: function () {
        this.x = Math.ceil(this.x);
        this.y = Math.ceil(this.y);
        return this;
    },
    limit: function (max) {
        if (this.mag() > max) {
            this.normalize();
            this.mult(max);
        }
        return this;
    },
    heading: function () {
        return -Math.atan2(-this.y, this.x);
    },
    dist: function (v) {
        let dx = this.x - v.x;
        let dy = this.y - v.y;
        return Math.sqrt(dx * dx + dy * dy);
    },
    distSq: function (v) {
        let dx = this.x - v.x;
        let dy = this.y - v.y;
        return dx * dx + dy * dy;
    },
    copy: function () {
        return new Vector(this.x, this.y);
    },
    negative: function () {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    },
    array: function () {
        return [this.x, this.y];
    },
    toString: function () {
        return "[" + this.x + ", " + this.y + "]";
    },
    equals: function (v) {
        if (v == null) {
            return false;
        }
        return this.x === v.x && this.y === v.y;
    },
    project: function (v) {
        var coeff = (this.x * v.x + this.y * v.y) / (v.x * v.x + v.y * v.y);
        this.x = coeff * v.x;
        this.y = coeff * v.y;
        return this;
    },
    rotate: function (a) {
        var b = this.heading() + a;
        var c = this.mag();
        this.x = Math.cos(b) * c;
        this.y = Math.sin(b) * c;
        return this;
    },
    rotate90CW: function (height) {
        let prevY = this.y;
        this.y = this.x;
        this.x = height - 1 - prevY;
        return this;
    },
    rotate90CCW: function (width) {
        let prevX = this.x;
        this.x = this.y;
        this.y = width - 1 - prevX;
        return this;
    },
    rotate180: function (width, height) {
        this.x = width - 1 - this.x;
        this.y = height - 1 - this.y;
        return this;
    },
};

// Static Functions
Vector.dist = function (v1, v2) {
    return v1.dist(v2);
};
Vector.distSq = function (v1, v2) {
    return v1.distSq(v2);
};
Vector.sub = function (v1, v2) {
    if (typeof v2 === "number") {
        return new Vector(v1.x - v2, v1.y - v2);
    }
    return new Vector(v1.x - v2.x, v1.y - v2.y);
};
Vector.add = function (v1, v2) {
    if (typeof v2 === "number") {
        return new Vector(v1.x + v2, v1.y + v2);
    }
    return new Vector(v1.x + v2.x, v1.y + v2.y);
};
// Second arg can be either a Vector or a scalar
Vector.mult = function (v1, v2) {
    if (typeof v2 === "number") {
        return new Vector(v1.x * v2, v1.y * v2);
    }
    return new Vector(v1.x * v2.x, v1.y * v2.y);
};
// Second arg can be either a Vector or a scalar
Vector.divide = function (v1, v2) {
    if (typeof v2 === "number") {
        return new Vector(v1.x / v2, v1.y / v2);
    }
    return new Vector(v1.x / v2.x, v1.y / v2.y);
};
Vector.fromAngle = function (angle) {
    let v = new Vector(0, 0);
    v.x = Math.cos(angle);
    v.y = Math.sin(angle);
    return v;
};
Vector.equals = function (v1, v2) {
    if (v1 == null && v2 == null) {
        return true;
    }
    if (v1 == null || v2 == null) {
        return false;
    }
    return v1.x == v2.x && v1.y == v2.y;
};
Vector.random2D = function () {
    return Vector.fromAngle(Math.random() * Math.PI * 180);
};
Vector.fromJSON = function (json) {
    return Object.assign(new Vector(), json);
};
Vector.swapXY = function (v) {
    return new Vector(v.y, v.x);
};
Vector.rotate90CW = function (v, height) {
    return new Vector(height - 1 - v.y, v.x);
};
Vector.rotate90CCW = function (v, width) {
    return new Vector(v.y, width - 1 - v.x);
};
Vector.rotate180 = function (v, width, height) {
    return new Vector(width - 1 - v.x, height - 1 - v.y);
};
