class Planet {
    constructor(gameContainer, gameWidth, gameHeight, centerX, centerY, radius) {
        this.centerX = centerX;
        this.centerY = centerY;
        this.radius = radius;
        this.layer = new Layer("planet", gameContainer, gameWidth, gameHeight);
        this.layer.init();
        this.imageData = this.layer.getContext().createImageData(this.radius * 2, this.radius * 2);

        console.log("Drawing horizontal lines");
        for (let x = 0; x < this.imageData.width; x += 2) {
            this.setPixel(this.imageData, x, 0, { r: 0, g: 0, b: 0, a: 255 });
            this.setPixel(this.imageData, x, this.imageData.height - 1, {
                r: 0,
                g: 0,
                b: 0,
                a: 255,
            });
        }
        console.log("Drawing vertical lines");
        for (let y = 0; y < this.imageData.height; y += 2) {
            this.setPixel(this.imageData, 0, y, { r: 0, g: 0, b: 0, a: 255 });
            this.setPixel(this.imageData, this.imageData.width - 1, y, {
                r: 0,
                g: 0,
                b: 0,
                a: 255,
            });
        }
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
                let x = Math.round(this.imageData.width / 2 + r * Math.cos(theta));
                let y = Math.round(this.imageData.height / 2 + r * Math.sin(theta));
                this.setPixel(this.imageData, x, y, color);
            }
        }
        this.draw();
        this.initialOpaqueCount = this.getOpaqueCount();
    }

    colorClamp(value) {
        return this.clamp(value, 0, 255);
    }

    clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    getPixel(imageData, x, y) {
        let pixelIndex = (x + y * imageData.width) * 4;
        return {
            r: imageData.data[pixelIndex],
            g: imageData.data[pixelIndex + 1],
            b: imageData.data[pixelIndex + 2],
            a: imageData.data[pixelIndex + 3],
        };
    }

    setPixel(imageData, x, y, color) {
        let pixelIndex = (x + y * imageData.width) * 4;
        imageData.data[pixelIndex] = color.r; // Red
        imageData.data[pixelIndex + 1] = color.g; // Green
        imageData.data[pixelIndex + 2] = color.b; // Blue
        imageData.data[pixelIndex + 3] = color.a; // Alpha
    }

    eat(r, theta) {
        let x = Math.round(this.imageData.width / 2 + r * Math.cos(theta));
        let y = Math.round(this.imageData.height / 2 + r * Math.sin(theta));
        let ate = this.getPixel(this.imageData, x, y).a > 0;
        if (ate) {
            this.setPixel(this.imageData, x, y, { r: 0, g: 0, b: 0, a: 0 });
        }
        return ate;
    }

    getHealth() {
        let currentOpaqueCount = this.getOpaqueCount();
        return currentOpaqueCount / this.initialOpaqueCount;
    }

    draw() {
        this.layer
            .getContext()
            .putImageData(
                this.imageData,
                this.centerX - this.imageData.width / 2,
                this.centerY - this.imageData.height / 2
            );
    }

    getOpaqueCount() {
        let count = 0;
        for (let x = 0; x < this.imageData.width; x++) {
            for (let y = 0; y < this.imageData.height; y++) {
                let pixel = this.getPixel(this.imageData, x, y);
                if (pixel.a > 0) {
                    count++;
                }
            }
        }
        return count;
    }
}
