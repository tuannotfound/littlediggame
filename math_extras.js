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

    // Scales 'value', which lies between 'fromRangeMin' and 'fromRangeMax', into the corresponding
    // position between 'toRangeMin' and 'toRangeMax'.
    // e.g. for:
    //   * value = 5
    //   * fromRangeMin = 0
    //   * fromRangeMax = 10
    //   * toRangeMin = 100
    //   * toRangeMax = 200
    // The output would be 150, because 5 is halfway between the 'from range' values -> so the
    // output is halfway between the 'to range' values.
    static scaleBetween(value, fromRangeMin, fromRangeMax, toRangeMin, toRangeMax) {
        value = MathExtras.clamp(value, fromRangeMin, fromRangeMax);
        return (
            ((value - fromRangeMin) / (fromRangeMax - fromRangeMin)) * (toRangeMax - toRangeMin) +
            toRangeMin
        );
    }
}
