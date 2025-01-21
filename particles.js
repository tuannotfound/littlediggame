import Particle from "./particle.js";
import Layer from "./layer.js";
import Vector from "./vector.js";
import Color from "./color.js";
import MathExtras from "./math_extras.js";
import PixelType from "./pixel_type.js";

export default class Particles {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.particles = [];
        this.layer = null;
    }

    init() {
        this.layer = new Layer("particles", this.width, this.height);
        this.layer.initOffscreen();
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
        // Dig speed currently ranges from 0.5 to 3.75
        let count = MathExtras.clamp(digSpeed * 2, 1, 10);
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
        let count = 25 * (Math.random() + 1);
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

    coinEffect(position, value) {
        if (value == 0) {
            return;
        }
        // TBD: Could probably use some tweaking.
        let count = MathExtras.clamp(value / 50, 1, 10);
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                let particle = new Particle(position, PixelType.GOLD.color, new Vector(0, -0.8));
                particle.fadeSpeed = 10;
                this.particles.push(particle);
            }, i * 100);
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
