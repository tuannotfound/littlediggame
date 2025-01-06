import Planet from "../planet.js";
import Color from "../color.js";

export default class MaskedPlanet extends Planet {
    constructor(maskImgUrl, width, height) {
        console.log("MaskedPlanet ctor");
        super(Math.max(width, height), Math.max(width, height));
        this.maskImgUrl = maskImgUrl;
        this.maskData = null;
    }

    async init() {
        console.log("MaskedPlanet init");
        this.maskData = await this.loadImage(this.maskImgUrl);
        super.init();
    }

    async loadImage(url) {
        console.log("MaskedPlanet loadImage");
        return new Promise((resolve, reject) => {
            console.log("MaskedPlanet promise");
            const img = new Image();
            img.onload = () => {
                console.log(
                    "MaskedPlanet onload - image size = " + img.width + "x" + img.height + "px"
                );
                const canvas = new OffscreenCanvas(img.width, img.height);
                const ctx = canvas.getContext("2d");
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(img, 0, 0, img.width, img.height);
                const imageData = ctx.getImageData(0, 0, img.width, img.height);
                resolve(imageData);
            };
            img.onerror = reject;
            img.src = url;
        });
    }

    createPlanetData() {
        console.log("MaskedPlanet createPlanetData");
        if (!this.maskData) {
            console.error("Mask data not loaded yet.");
            return; // or throw an error, depending on desired behavior
        }

        let color = new Color(255, 0, 0, 255);
        console.log(
            "Drawing mask - dest size = " +
                this.width +
                "x" +
                this.height +
                "px, mask size = " +
                this.maskData.width +
                "x" +
                this.maskData.height +
                "px"
        );
        const thetaIncrementMin = 0.001;
        const thetaIncrementMax = 0.01;
        const colorIncrementMax = 5;

        // Went a little wild here. Unsure if this actually generalizes properly.
        const aspectRatio = this.maskData.width / this.maskData.height;
        const offsetX =
            this.maskData.width > this.maskData.height ? 0 : (this.maskData.width - this.width) / 2;
        const offsetY =
            this.maskData.height > this.maskData.width
                ? 0
                : (this.maskData.height - this.height) / 2;
        const scaleX = this.maskData.width / this.width;
        const scaleY = this.maskData.height / this.height;

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
                let { x, y } = this.polarToCartesian(r, theta);
                // Convert x, y from the destination canvas to x, y in the mask data.
                let maskX = Math.round(((x - offsetX) * scaleX) / aspectRatio);
                let maskY = Math.round((y - offsetY) * scaleY);

                if (
                    maskX < 0 ||
                    maskX >= this.maskData.width ||
                    maskY < 0 ||
                    maskY >= this.maskData.height
                ) {
                    continue;
                }

                let pixelIndex = (maskX + maskY * this.maskData.width) * 4;

                // Check if the mask pixel is opaque
                if (this.maskData.data[pixelIndex + 3] > 0) {
                    this.setPixel(x, y, color);
                }
            }
        }
    }
}
