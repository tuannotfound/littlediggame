import Vector from "./vector.js";

export default class Pixel {
    constructor(initialPosition, bounds) {
        this.bounds = bounds.copy();

        this.position = initialPosition.copy();
        this.oldPosition = initialPosition.copy();
        this.renderPosition = initialPosition.copy();
        this.renderPosition.round();

        this.friction = 1;
        this.groundFriction = 0.1;

        this.gravity = new Vector(0, 0);

        this.color = {
            r: 255,
            g: 0,
            b: 0,
            a: 255,
        };
        this.mass = 1;
    }

    updateGravity() {
        this.gravity.setXY(
            this.bounds.x / 2 - this.position.x,
            this.bounds.y / 2 - this.position.y
        );
        this.gravity.normalize();
    }

    update() {
        this.updateGravity();
        let velocity = Vector.sub(this.position, this.oldPosition);
        velocity.mult(this.friction);

        this.oldPosition.setXY(this.position.x, this.position.y);
        this.position.add(velocity);
        this.position.add(this.gravity);
        this.renderPosition.setXY(Math.round(this.position.x), Math.round(this.position.y));
    }

    constrain() {
        if (this.position.x > this.bounds.x - 1) {
            this.position.x = this.bounds.x - 1;
        }
        if (this.position.x < 1) {
            this.position.x = 1;
        }
        if (this.position.y > this.bounds.y - 1) {
            this.position.y = this.bounds.y - 1;
        }
        if (this.position.y < 1) {
            this.position.y = 1;
        }
    }

    updatePosition(newPosition) {
        this.position.set(newPosition);
        this.renderPosition.set(newPosition);
        this.renderPosition.round();
    }

    checkCollision(quadtree) {
        let others = quadtree.retrieve({
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
        });
        for (let other of others) {
            if (this == other) {
                continue;
            }
            if (this.x == other.x && this.y == other.y) {
                this.updatePosition(this.oldPosition);
                return;
            }
        }
    }

    render(imageData) {
        let pixelIndex = (this.renderPosition.x + this.renderPosition.y * imageData.width) * 4;
        imageData.data[pixelIndex] = this.color.r; // Red
        imageData.data[pixelIndex + 1] = this.color.g; // Green
        imageData.data[pixelIndex + 2] = this.color.b; // Blue
        imageData.data[pixelIndex + 3] = this.color.a; // Alpha
    }

    // Needed for quad tree
    get x() {
        return this.renderPosition.x;
    }

    get y() {
        return this.renderPosition.y;
    }

    get width() {
        return 1;
    }

    get height() {
        return 1;
    }
}
