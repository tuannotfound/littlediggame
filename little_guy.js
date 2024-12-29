import Layer from "./layer.js";
import Pixel from "./pixel.js";
import Vector from "./vector.js";

export default class LittleGuy {
    HEAD_COLOR = { r: 242, g: 222, b: 187, a: 255 };
    BODY_COLOR = { r: 87, g: 125, b: 180, a: 255 };

    constructor(planet) {
        this.planet = planet;

        // This is relative to the center of the planet
        this.position = new Vector(0, this.planet.radius);
        this.layer = new Layer("little_guy", 3, 3);
        let selfToPlanetVec = planet.center.copy();
        selfToPlanetVec.sub(this.position);
        this.angle = Math.atan2(selfToPlanetVec.y, selfToPlanetVec.x);
    }

    init() {
        this.layer.initOffscreen();
        this.updateBodyPosition();
    }

    updateBodyPosition() {
        let imageData = this.layer
            .getContext()
            .createImageData(this.layer.width, this.layer.height);
        let headIndex = (1 + 1 * imageData.width) * 4;
        imageData.data[headIndex] = this.HEAD_COLOR.r; // Red
        imageData.data[headIndex + 1] = this.HEAD_COLOR.g; // Green
        imageData.data[headIndex + 2] = this.HEAD_COLOR.b; // Blue
        imageData.data[headIndex + 3] = this.HEAD_COLOR.a; // Alpha

        let gridPosition = this.angleToGrid(this.angle);
        let bodyIndex = (gridPosition.x + gridPosition.y * imageData.width) * 4;
        imageData.data[bodyIndex] = this.BODY_COLOR.r; // Red
        imageData.data[bodyIndex + 1] = this.BODY_COLOR.g; // Green
        imageData.data[bodyIndex + 2] = this.BODY_COLOR.b; // Blue
        imageData.data[bodyIndex + 3] = this.BODY_COLOR.a; // Alpha
        this.layer.getContext().putImageData(imageData, 0, 0);
    }

    angleToGrid(angle) {
        const sliceCount = 8;
        const sliceAngle = (2 * Math.PI) / sliceCount;
        const sliceOffset = sliceAngle / 2; // Center the slices

        // Normalize angle to be between 0 and 2*PI
        let normalizedAngle = angle % (2 * Math.PI);
        if (normalizedAngle < 0) {
            normalizedAngle += 2 * Math.PI;
        }

        // Calculate the slice index based on the normalized angle
        let sliceIndex = Math.floor((normalizedAngle + sliceOffset) / sliceAngle);

        // Map slice index to (x, y) coordinates
        switch (sliceIndex) {
            case 0:
                return new Vector(0, 1);
            case 1:
                return new Vector(0, 0);
            case 2:
                return new Vector(1, 0);
            case 3:
                return new Vector(2, 0);
            case 4:
                return new Vector(2, 1);
            case 5:
                return new Vector(2, 2);
            case 6:
                return new Vector(1, 2);
            case 7:
                return new Vector(0, 2);
            // Should never happen, but handle it just in case.
            default:
                return new Vector(1, 1);
        }
    }

    move(direction) {
        this.position.x += direction;
        this.angle += direction * 0.1;
        this.updateBodyPosition();
    }

    update() {}
}
