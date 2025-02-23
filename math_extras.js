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

    static roundToNearest(nearest, value) {
        return Math.round(value / nearest) * nearest;
    }

    static floorToNearest(nearest, value) {
        return Math.floor(value / nearest) * nearest;
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

    static polarToCartesian(r, theta, center = new Vector(0, 0)) {
        return new Vector(
            Math.round(center.x + r * Math.cos(theta)),
            Math.round(center.y + r * Math.sin(theta))
        );
    }

    static cartesianToPolar(cartesianPosition, center = new Vector(0, 0)) {
        return {
            r: Math.sqrt(
                Math.pow(cartesianPosition.x - center.x, 2) +
                    Math.pow(cartesianPosition.y - center.y / 2, 2)
            ),
            theta: Math.atan2(
                cartesianPosition.y - center.y / 2,
                cartesianPosition.x - center.x / 2
            ),
        };
    }
    /**
     * Interpolates between two values with a quadratic ease-out effect.
     *
     * @param {number} a - The starting value.
     * @param {number} b - The ending value.
     * @param {number} t - The interpolation factor (0.0 to 1.0).
     * @returns {number} The interpolated value.
     */
    static easeOutQuad(a, b, t) {
        t = Math.max(0, Math.min(1, t));
        return MathExtras.lerp(a, b, t * (2 - t));
    }

    /**
     * Interpolates between two values with a cubic ease-out effect.
     *
     * @param {number} a - The starting value.
     * @param {number} b - The ending value.
     * @param {number} t - The interpolation factor (0.0 to 1.0).
     * @returns {number} The interpolated value.
     */
    static easeOutCubic(a, b, t) {
        t = Math.max(0, Math.min(1, t));
        t--;
        return MathExtras.lerp(a, b, t * t * t + 1);
    }

    /**
     * Interpolates between two values with a quadratic ease-in-out effect.
     *
     * @param {number} a - The starting value.
     * @param {number} b - The ending value.
     * @param {number} t - The interpolation factor (0.0 to 1.0).
     * @returns {number} The interpolated value.
     */
    static easeInOutQuad(a, b, t) {
        t = Math.max(0, Math.min(1, t));
        return t < 0.5
            ? MathExtras.lerp(a, b, 2 * t * t)
            : MathExtras.lerp(a, b, -1 + (4 - 2 * t) * t);
    }

    /**
     * Interpolates between two values with a cubic ease-in-out effect.
     *
     * @param {number} a - The starting value.
     * @param {number} b - The ending value.
     * @param {number} t - The interpolation factor (0.0 to 1.0).
     * @returns {number} The interpolated value.
     */
    static easeInOutCubic(a, b, t) {
        t = Math.max(0, Math.min(1, t));
        return t < 0.5
            ? MathExtras.lerp(a, b, 4 * t * t * t)
            : MathExtras.lerp(a, b, (t - 1) * (2 * t - 2) * (2 * t - 2) + 1);
    }

    /**
     * Interpolates between two values with a sinosoidal ease-in-out effect
     *
     * @param {number} a - The starting value.
     * @param {number} b - The ending value.
     * @param {number} t - The interpolation factor (0.0 to 1.0).
     * @returns {number} The interpolated value.
     */
    static easeInOutSine(a, b, t) {
        t = Math.max(0, Math.min(1, t));
        return MathExtras.lerp(a, b, -0.5 * (Math.cos(Math.PI * t) - 1));
    }

    /**
     * Linearly interpolates between two values.
     *
     * @param {number} a - The starting value.
     * @param {number} b - The ending value.
     * @param {number} t - The interpolation factor (0.0 to 1.0).
     * @returns {number} The interpolated value.
     */
    static lerp(a, b, t) {
        return a + (b - a) * t;
    }
}
