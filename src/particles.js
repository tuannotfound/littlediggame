// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import Particle from "./particle.js";
import Layer from "./layer.js";
import Vector from "./vector.js";
import Color from "./color.js";
import Gradient from "./gradient.js";
import MathExtras from "./math_extras.js";
import { default as PixelConstants } from "./diggables/constants.js";

export default class Particles {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.particles = [];
        this.layer = new Layer("particles", this.width, this.height);
    }

    init() {
        this.layer.initOffscreen();
    }

    onResize(newSize) {
        this.width = newSize.width;
        this.height = newSize.height;
        this.layer.onResize(newSize);
    }

    spawn(position, color, initialVelocity, gravity, count, delayMs) {
        for (let i = 0; i < count; i++) {
            if (delayMs > 0) {
                setTimeout(() => {
                    let particle = new Particle(position, color, initialVelocity, gravity);
                    this.particles.push(particle);
                }, i * delayMs);
            } else {
                let particle = new Particle(position, color, initialVelocity, gravity);
                this.particles.push(particle);
            }
        }
    }

    digEffect(position, color, digSpeed) {
        // Dig speed currently ranges from 0.5 to 18
        let count = Math.floor(MathExtras.scaleBetween(digSpeed, 0.5, 18, 1, 3));
        let minInitialVelocity = new Vector(-0.25, -0.5);
        let maxInitialVelocity = new Vector(0.25, -0.1);
        for (let i = 0; i < count; i++) {
            let initialVelocity = new Vector(
                MathExtras.randomBetween(minInitialVelocity.x, maxInitialVelocity.x),
                MathExtras.randomBetween(minInitialVelocity.y, maxInitialVelocity.y)
            );
            let particle = new Particle(position, color, initialVelocity);
            this.particles.push(particle);
        }
    }

    bloodEffect(position) {
        let count = Math.round(MathExtras.randomBetween(12, 18));
        let minInitialVelocity = new Vector(-0.4, -0.6);
        let maxInitialVelocity = new Vector(0.4, -0.2);
        for (let i = 0; i < count; i++) {
            let initialVelocity = new Vector(
                MathExtras.randomBetween(minInitialVelocity.x, maxInitialVelocity.x),
                MathExtras.randomBetween(minInitialVelocity.y, maxInitialVelocity.y)
            );
            let particle = new Particle(position, Color.wiggle(Color.BLOOD, 10), initialVelocity);
            this.particles.push(particle);
        }
    }

    fireEffect(position) {
        let count = Math.round(MathExtras.randomBetween(15, 20));
        let smokeCount = Math.round(count * 0.4);
        let smokeGradient = new Gradient(new Color(190, 190, 190, 150), new Color(40, 40, 40, 200));
        let fireCount = count - smokeCount;
        let fireGradient = new Gradient(Color.FIRE_START, Color.FIRE_END);
        for (let i = 0; i < count; i++) {
            let color;
            let fadeSpeed;
            if (i < smokeCount) {
                color = smokeGradient.get((100 * i) / smokeCount);
                fadeSpeed = 6;
            } else {
                color = fireGradient.get((100 * (i - smokeCount)) / fireCount);
                fadeSpeed = 10;
            }
            setTimeout(() => {
                // Causes the fire to shift left/right over time
                let xShift = Math.floor(MathExtras.randomBetween(0, 3)) - 1;
                for (let j = 0; j < 2; j++) {
                    let particlePosition = position.copy();
                    particlePosition.x += j - 1 + xShift;
                    if (j == 1) {
                        particlePosition.y -= 1;
                    } else {
                        particlePosition.y += 2;
                    }
                    let particle = new Particle(
                        particlePosition,
                        color,
                        new Vector(0.1 * (j - 1), -0.8)
                    );
                    particle.fadeSpeed = fadeSpeed;
                    this.particles.push(particle);
                }
            }, i * 20);
        }
    }

    coinEffect(position, value) {
        if (value == 0) {
            return;
        }
        // TBD: Could probably use some tweaking.
        let count = MathExtras.clamp(value / 50, 1, 10);
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                let particle = new Particle(
                    position,
                    PixelConstants.GOLD_COLOR,
                    new Vector(0, -0.8)
                );
                particle.fadeSpeed = 10;
                this.particles.push(particle);
            }, i * 100);
        }
    }

    explosionEffect(position) {
        const waveColors = [
            [Color.BLACK, Color.DARK_ORANGE],
            [Color.DARK_ORANGE, Color.ORANGE],
            [Color.ORANGE, Color.YELLOW],
        ];
        for (let i = 0; i < waveColors.length; i++) {
            setTimeout(() => {
                let colors = waveColors[i];
                let color = colors[Math.round(MathExtras.randomBetween(0, colors.length - 1))];
                let count = Math.round(MathExtras.randomBetween(12, 18));
                let minInitialVelocity = new Vector(-0.7, -1);
                let maxInitialVelocity = new Vector(0.7, 1);
                for (let i = 0; i < count; i++) {
                    let initialVelocity = new Vector(
                        MathExtras.randomBetween(minInitialVelocity.x, maxInitialVelocity.x),
                        MathExtras.randomBetween(minInitialVelocity.y, maxInitialVelocity.y)
                    );
                    let particle = new Particle(position, Color.wiggle(color, 3), initialVelocity);
                    particle.fadeDelay = 8;
                    particle.fadeSpeed = 30;
                    this.particles.push(particle);
                }
            }, i * 80);
        }
    }

    update() {
        let imageData = this.layer
            .getContext()
            .createImageData(this.layer.width, this.layer.height);
        let inactiveParticles = [];
        for (let particle of this.particles) {
            particle.update();
            particle.render(imageData);
            if (!particle.active) {
                inactiveParticles.push(particle);
            }
        }
        for (let particle of inactiveParticles) {
            this.particles.splice(this.particles.indexOf(particle), 1);
        }
        this.layer.getContext().putImageData(imageData, 0, 0);
    }
}
