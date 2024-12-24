import Layer from "./layer.js";
import Vector from "./vector.js";
import Pixel from "./pixel.js";
import Quadtree from "@timohausmann/quadtree-js";
import Stats from "stats.js";

export default class Game {
    INITIAL_COUNT = 1000;

    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.bounds = new Vector(width, height);
        const targetFps = 60;
        this.frameInterval = 1000 / targetFps;
        this.now = 0;
        this.then = 0;
        this.containerElement = null;
        this.layer = null;
        this.pixels = [];
        // https://github.com/timohausmann/quadtree-js
        this.quadtree = new Quadtree(
            {
                x: 0,
                y: 0,
                width: this.width,
                height: this.height,
            },
            10,
            20
        );
        this.stats = new Stats();
        this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
        document.body.appendChild(this.stats.dom);
    }

    init(containerElement) {
        this.containerElement = containerElement;
        this.layer = new Layer("main", this.width, this.height);
        this.layer.initOnscreen(containerElement);

        this.initHandlers();

        let center = new Vector(this.width / 2, this.height / 2);
        this.addAt(center, this.width / 2, this.INITIAL_COUNT);

        this.then = window.performance.now();
        this.tick(this.then);
    }

    initHandlers() {
        this.containerElement.addEventListener("click", this.handleMouseEvent.bind(this), {
            passive: true,
        });
    }

    handleMouseEvent(event) {
        if (event.button != 0) {
            return;
        }
        let mousePos = new Vector(event.offsetX, event.offsetY);
        if (event.shiftKey) {
            this.addAt(mousePos, 5, 10);
        } else {
            this.removeAt(mousePos, 5);
        }
    }

    getRandomPointInCircle(center, radius) {
        // Generate a random angle in radians
        const angle = Math.random() * 2 * Math.PI;

        // Generate a random radius within the circle
        const randomRadius = Math.sqrt(Math.random()) * radius;

        // Calculate the x and y coordinates
        const x = center.x + randomRadius * Math.cos(angle);
        const y = center.y + randomRadius * Math.sin(angle);

        return new Vector(x, y);
    }

    addAt(pos, radius, count) {
        for (let i = 0; i < count; i++) {
            this.pixels.push(new Pixel(this.getRandomPointInCircle(pos, radius), this.bounds));
        }
    }

    removeAt(position, radius) {
        let toRemove = [];
        for (let d of this.pixels) {
            let dist = new Vector(position.x - d.position.x, position.y - d.position.y).mag();
            if (dist < radius) {
                toRemove.push(d);
            }
        }
        for (let d of toRemove) {
            let index = this.pixels.indexOf(d);
            if (index > -1) {
                this.pixels.splice(index, 1);
            }
        }
    }

    tick(newtime) {
        requestAnimationFrame(this.tick.bind(this));
        this.now = newtime;
        let elapsed = this.now - this.then;

        // if enough time has elapsed, draw the next frame
        if (elapsed > this.frameInterval) {
            this.then = this.now - (elapsed % this.frameInterval);

            this.stats.begin();

            this.quadtree.clear();
            for (let pixel of this.pixels) {
                this.quadtree.insert(pixel);
            }
            let imageData = this.layer.getContext().createImageData(this.width, this.height);
            for (let pixel of this.pixels) {
                pixel.update();
                pixel.constrain();
                pixel.checkCollision(this.quadtree);
                pixel.render(imageData);
            }
            this.layer.getContext().putImageData(imageData, 0, 0);
            this.stats.end();
        }
        // requestAnimationFrame(this.tick.bind(this));

        // this.frameEndTime = Date.now();
        // setTimeout(() => {
        //     const currentTime = Date.now();
        //     const deltaTime = currentTime - this.frameEndTime;
        //     this.tick(deltaTime);
        // }, this.frameTime);
    }
}
