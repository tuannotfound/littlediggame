import Vector from "./vector.js";

export default class Pixel {
    UNMOVED_FRAMES_BEFORE_INACTIVE = 10;
    INACTIVE_COLOR = { r: 125, g: 125, b: 125, a: 255 };

    constructor(initialPosition, color, bounds) {
        this.bounds = bounds.copy();

        this.position = initialPosition.copy();
        this.oldPosition = initialPosition.copy();
        this.renderPosition = initialPosition.copy();
        this.renderPosition.round();
        this.oldRenderPosition = this.renderPosition.copy();

        this.previousNeighbours = [];

        this.friction = 0.5;
        this.groundFriction = 0.1;
        this.slipped = false;

        this.gravity = new Vector(0, 0);

        this.activeColor = color;
        this.color = this.activeColor;
        this.mass = 1;
        this.unmovedFrames = 0;
        this.active = true;
    }

    updateGravity() {
        this.gravity.setXY(
            this.bounds.x / 2 - this.position.x,
            this.bounds.y / 2 - this.position.y
        );
        this.gravity.normalize();
    }

    update() {
        if (!this.active) {
            return;
        }
        this.updateGravity();
        let velocity = Vector.sub(this.position, this.oldPosition);
        velocity.mult(this.friction);

        if (this.slipped) {
            velocity.mult(this.groundFriction);
            this.slipped = false;
        }

        let newPosition = this.position.copy();
        this.oldPosition.setXY(this.position.x, this.position.y);
        newPosition.add(velocity);
        newPosition.add(this.gravity);

        this.position.set(newPosition);
        this.oldRenderPosition = this.renderPosition.copy();
        this.renderPosition.set(newPosition);
        this.renderPosition.round();
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

    setActive(active) {
        if (this.active == active) {
            return;
        }
        this.active = active;
        if (active) {
            this.unmovedFrames = 0;
            this.color = this.activeColor;
        } else {
            this.color = this.INACTIVE_COLOR;
        }
    }

    checkCollision(quadtree) {
        if (!this.active) {
            return;
        }
        let others = quadtree.retrieve({
            x: this.renderPosition.x,
            y: this.renderPosition.y,
            width: 1,
            height: 1,
        });

        let didCollide = false;
        for (let other of others) {
            if (this == other) {
                continue;
            }

            if (other.renderPosition.x == this.x && other.renderPosition.y == this.y) {
                didCollide = true;
                break;
            }
        }

        if (didCollide) {
            this.checkSlipCollision(quadtree);
        }
    }

    checkSlipCollision(quadtree) {
        let spotsToCheck = [];
        spotsToCheck.push(this.renderPosition);
        let vecToCenter = new Vector(this.x - this.bounds.x / 2, this.y - this.bounds.y / 2);
        vecToCenter.normalize();
        // Also check spots just to the left and right of the render position along a vector perpendicular to vecToCenter
        spotsToCheck.push(
            new Vector(
                this.renderPosition.x + vecToCenter.y,
                this.renderPosition.y - vecToCenter.x
            ).round()
        );
        spotsToCheck.push(
            new Vector(
                this.renderPosition.x - vecToCenter.y,
                this.renderPosition.y + vecToCenter.x
            ).round()
        );

        let othersArray = [];
        for (let spot of spotsToCheck) {
            let spotOthers = quadtree.retrieve({
                x: spot.x,
                y: spot.y,
                width: 1,
                height: 1,
            });
            othersArray.push(...spotOthers);
        }
        let others = new Set(othersArray);

        for (let other of others) {
            if (this == other) {
                continue;
            }

            let spotsToRemove = [];
            for (let spot of spotsToCheck) {
                if (other.renderPosition.x == spot.x && other.renderPosition.y == spot.y) {
                    spotsToRemove.push(spot);
                }
            }
            for (let spot of spotsToRemove) {
                let index = spotsToCheck.indexOf(spot);
                if (index > -1) {
                    spotsToCheck.splice(index, 1);
                }
            }
            if (spotsToCheck.length == 0) {
                break;
            }
        }
        if (spotsToCheck.length == 0) {
            this.position.set(this.oldPosition);
            this.renderPosition.set(this.oldRenderPosition);
        } else {
            this.slipped = true;
            this.position.set(spotsToCheck[0]);
            this.renderPosition.set(spotsToCheck[0]);
        }
    }

    checkInactive() {
        if (
            this.renderPosition.x == this.oldRenderPosition.x &&
            this.renderPosition.y == this.oldRenderPosition.y
        ) {
            if (this.active) {
                this.unmovedFrames++;
            }
        } else {
            this.unmovedFrames = 0;
            this.setActive(true);
        }
        if (this.unmovedFrames >= this.UNMOVED_FRAMES_BEFORE_INACTIVE) {
            this.setActive(false);
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
