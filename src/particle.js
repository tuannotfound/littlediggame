// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import Color from "./color.js";
import Vector from "./vector.js";

export default class Particle {
    constructor(position, color, initialVelocity, gravity) {
        this.position = position.copy();
        this.renderPosition = position.copy();
        this.renderPosition.floor();

        this.color = new Color(color);

        this.lastUpdateTimeMs = 0;

        let velocity = initialVelocity ?? new Vector(0, 0);
        this.oldPosition = position.copy();
        this.oldPosition.sub(velocity);
        this.oldRenderPosition = this.renderPosition.copy();

        // How many render passes before the fade begins
        this.fadeDelay = 0;
        // Subtracted from the alpha every render pass
        this.fadeSpeed = 0;

        this.renderCount = 0;

        this.gravity = gravity ?? new Vector(0, 1);

        this.listeners = [];

        this.active = true;
    }

    render(imageData) {
        if (!this.active) {
            return;
        }
        if (
            this.renderPosition.x < 0 ||
            this.renderPosition.x >= imageData.width ||
            this.renderPosition.y < 0 ||
            this.renderPosition.y >= imageData.height
        ) {
            this.active = false;
            return;
        }
        let pixelIndex = (this.renderPosition.x + this.renderPosition.y * imageData.width) * 4;

        if (this.renderCount >= this.fadeDelay) {
            this.color.a = Math.max(this.color.a - this.fadeSpeed, 0);
        }
        if (this.color.a <= 0) {
            this.active = false;
        }
        imageData.data[pixelIndex] = Math.round(this.color.r); // Red
        imageData.data[pixelIndex + 1] = Math.round(this.color.g); // Green
        imageData.data[pixelIndex + 2] = Math.round(this.color.b); // Blue
        imageData.data[pixelIndex + 3] = Math.round(this.color.a); // Alpha

        this.renderCount++;
    }

    update() {
        if (!this.active) {
            return;
        }
        let now = performance.now();
        let dt = this.lastUpdateTimeMs > 0 ? (now - this.lastUpdateTimeMs) / 100 : 0;
        this.lastUpdateTimeMs = now;

        let tempPosition = this.position.copy();
        this.position.mult(2).sub(this.oldPosition);
        this.position.add(this.gravity.copy().mult(dt * dt));
        this.oldPosition = tempPosition;
        this.renderPosition.set(this.position);
        this.renderPosition.floor();
    }
}
