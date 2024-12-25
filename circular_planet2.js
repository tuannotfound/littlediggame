import Planet from "./planet2.js";

export default class CircularPlanet extends Planet {
    constructor(radius) {
        let size = radius * 2;
        super(size, size);
    }

    createPlanetData() {
        let color = { r: 255, g: 0, b: 0, a: 255 };
        console.log("Drawing circle");
        const thetaIncrementMin = 0.001;
        const thetaIncrementMax = 0.01;
        const colorIncrementMax = 5;
        for (let r = 0; r < this.radius; r += 0.5) {
            const thetaIncrement =
                thetaIncrementMax + (thetaIncrementMin - thetaIncrementMax) * (r / this.radius);
            color.r = this.colorClamp(
                color.r + Math.round(colorIncrementMax * (Math.random() * 2 - 1))
            );
            color.g = this.colorClamp(
                color.g + Math.round(colorIncrementMax * (Math.random() * 2 - 1))
            );
            color.b = this.colorClamp(
                color.b + Math.round(colorIncrementMax * (Math.random() * 2 - 1))
            );

            for (let theta = 0; theta < 2 * Math.PI; theta += thetaIncrement) {
                let position = this.polarToCartesian(r, theta);
                position.round();
                this.addPixel(position, color);
                this.getPixel(position).setActive(false);
            }
        }
    }
}
