import Layer from "./layer.js";
import Pixel from "./pixel.js";
import Vector from "./vector.js";

export default class LittleGuy {
    HEAD_COLOR = { r: 242, g: 222, b: 187, a: 255 };
    BODY_COLOR = { r: 87, g: 125, b: 180, a: 255 };

    constructor(planet) {
        this.planet = planet;

        // This is relative to the center of the planet
        this.position = new Vector(0, 0);
        this.layer = new Layer("little_guy", 3, 3);
    }

    init() {
        this.layer.initOffscreen();
        let planetPosition = this.planet.getClosestSurfacePixel(
            new Vector(this.planet.center.x, this.planet.center.y - this.planet.radius)
        ).position;
        this.position.set(planetPosition.sub(this.planet.center));
        this.position.x -= 1;
        this.position.y -= 1;
        this.updateBodyPosition();
    }

    updateBodyPosition() {
        //bodyVec) {
        let imageData = this.layer
            .getContext()
            .createImageData(this.layer.width, this.layer.height);
        let headIndex = (1 + 1 * imageData.width) * 4;
        imageData.data[headIndex] = this.HEAD_COLOR.r; // Red
        imageData.data[headIndex + 1] = this.HEAD_COLOR.g; // Green
        imageData.data[headIndex + 2] = this.HEAD_COLOR.b; // Blue
        imageData.data[headIndex + 3] = this.HEAD_COLOR.a; // Alpha

        // let bodyIndex = (bodyVec.x + bodyVec.y * imageData.width) * 4;
        // imageData.data[bodyIndex] = this.BODY_COLOR.r; // Red
        // imageData.data[bodyIndex + 1] = this.BODY_COLOR.g; // Green
        // imageData.data[bodyIndex + 2] = this.BODY_COLOR.b; // Blue
        // imageData.data[bodyIndex + 3] = this.BODY_COLOR.a; // Alpha
        this.layer.getContext().putImageData(imageData, 0, 0);
    }

    angleToBodyVec(angle) {
        const sliceCount = 8;
        const sliceAngle = (2 * Math.PI) / sliceCount;
        const sliceOffset = sliceAngle / 2; // Center the slices

        // Normalize angle to be between 0 and 2*PI
        let normalizedAngle = (angle - sliceOffset) % (2 * Math.PI);
        if (normalizedAngle < 0) {
            normalizedAngle += 2 * Math.PI;
        }

        // Calculate the slice index based on the normalized angle
        let sliceIndex = Math.floor(normalizedAngle / sliceAngle);
        // Map slice index to (x, y) coordinates
        switch (sliceIndex) {
            case 0:
                // E
                return new Vector(0, 1);
            case 1:
                // SE
                return new Vector(0, 0);
            case 2:
                // S
                return new Vector(1, 0);
            case 3:
                // SW
                return new Vector(2, 0);
            case 4:
                // W
                return new Vector(2, 1);
            case 5:
                // NW
                return new Vector(2, 2);
            case 6:
                // N
                return new Vector(1, 2);
            case 7:
                // NE
                return new Vector(0, 2);
            // Should never happen, but handle it just in case.
            default:
                return new Vector(1, 1);
        }
    }

    move(direction) {
        let selfToPlanetVec = planet.center.copy();
        selfToPlanetVec.sub(this.position);
        let angle = Math.atan2(selfToPlanetVec.y, selfToPlanetVec.x);
        // Increment the angle either CW or CCW until we find another surface pixel
        // TBD
    }

    moveCW() {}

    moveCCW() {}

    update() {}
}
