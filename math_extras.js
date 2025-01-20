import Vector from "./vector.js";

export default class MathExtras {
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    static getRandomPointInCircle(center, radius) {
        // Generate a random angle in radians
        const angle = Math.random() * 2 * Math.PI;

        // Generate a random radius within the circle
        const randomRadius = Math.sqrt(Math.random()) * radius;

        // Calculate the x and y coordinates
        const x = center.x + randomRadius * Math.cos(angle);
        const y = center.y + randomRadius * Math.sin(angle);

        return new Vector(x, y);
    }

    static randomBetween(min, max) {
        return Math.random() * (max - min) + min;
    }

    static ceilToNearest(nearest, value) {
        return Math.ceil(value / nearest) * nearest;
    }
}
