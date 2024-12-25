import Layer from "./layer.js";
import Vector from "./vector.js";
import Stats from "stats.js";
import CircularPlanet from "./circular_planet2.js";

export default class Game {
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
        this.planet = new CircularPlanet(30);
        this.zoomLevel = 1;
        this.planetX = 0;
        this.planetY = 0;
        this.currentPlanetWidth = this.planet.width * this.zoomLevel;
        this.currentPlanetHeight = this.planet.height * this.zoomLevel;

        this.zoomPctElement = null;
        this.gold = 0;
        this.goldElement = null;

        this.stats = new Stats();
        this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
        document.body.appendChild(this.stats.dom);
    }

    init(containerElement) {
        this.containerElement = containerElement;
        this.layer = new Layer("main", this.width, this.height);
        this.layer.initOnscreen(containerElement);

        this.initUi();
        this.initHandlers();

        let center = new Vector(this.width / 2, this.height / 2);
        this.planet.init();

        this.then = window.performance.now();
        this.tick(this.then);
    }

    initUi() {
        let speedBtn = document.getElementById("speed");
        speedBtn.addEventListener("click", () => {
            this.upgrades.speed += 1;
            console.log("Speed: " + this.upgrades.speed);
        });
        let widthBtn = document.getElementById("width");
        widthBtn.addEventListener("click", () => {
            this.upgrades.width += 1;
            console.log("Width: " + this.upgrades.width);
        });
        let durabilityBtn = document.getElementById("durability");
        durabilityBtn.addEventListener("click", () => {
            this.upgrades.durability += 1;
            console.log("Durability: " + this.upgrades.durability);
        });
        let zoomInBtn = document.getElementById("zoom_in");
        zoomInBtn.addEventListener("click", () => this.zoom(0.25));
        let zoomOutBtn = document.getElementById("zoom_out");
        zoomOutBtn.addEventListener("click", () => this.zoom(-0.25));

        this.zoomPctElement = document.getElementById("zoom_pct");

        this.goldElement = document.getElementById("gold");
        this.updateGold(0);
    }

    initHandlers() {
        this.containerElement.addEventListener("click", this.handleMouseEvent.bind(this), {
            passive: true,
        });
    }

    updateGold(amount) {
        this.gold += amount;
        this.goldElement.innerHTML = this.gold;
    }

    zoom(amount) {
        if (this.zoomLevel + amount < this.MIN_ZOOM) {
            return;
        }
        if (this.zoomLevel + amount > this.MAX_ZOOM) {
            return;
        }
        this.zoomLevel += amount;
        this.currentPlanetWidth = this.planet.width * this.zoomLevel;
        this.currentPlanetHeight = this.planet.height * this.zoomLevel;
        this.zoomPctElement.innerHTML = (this.zoomLevel * 100).toFixed(0);
    }

    handleMouseEvent(event) {
        if (event.button != 0) {
            return;
        }
        let mousePos = new Vector(event.offsetX, event.offsetY);
        // this is broken, need to translate from canvas coordinates to planet coordinates
        // let planetCenterX = this.planetX + this.currentPlanetWidth / 2;
        // let planetCenterY = this.planetY + this.currentPlanetHeight / 2;
        // mousePos.x -= planetCenterX;
        // mousePos.y -= planetCenterY;

        if (event.shiftKey) {
            this.addAround(mousePos, 5, 10);
        } else {
            this.removeAround(mousePos, 5);
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

    addAround(pos, radius, count) {
        for (let i = 0; i < count; i++) {
            this.planet.addPixel(this.getRandomPointInCircle(pos, radius), {
                r: 255,
                g: 0,
                b: 0,
                a: 255,
            });
        }
    }

    removeAround(center, radius) {
        for (let x = center.x - radius; x < center.x + radius; x++) {
            for (let y = center.y - radius; y < center.y + radius; y++) {
                let dist = new Vector(center.x - x, center.y - y).mag();
                if (dist < radius) {
                    this.planet.removePixelAt(new Vector(x, y));
                }
            }
        }
    }

    tick(newtime) {
        requestAnimationFrame(this.tick.bind(this));
        this.now = newtime;
        let elapsed = this.now - this.then;

        if (elapsed <= this.frameInterval) {
            return;
        }
        this.then = this.now - (elapsed % this.frameInterval);

        this.stats.begin();
        this.planet.update();

        this.layer.getContext().clearRect(0, 0, this.width, this.height);

        this.layer.getContext().drawImage(
            this.planet.layer.canvas,
            0, // source x
            0, // source y
            this.planet.width, // source width
            this.planet.height, // source height
            this.planetX, // destination x
            this.planetY, // destination y
            this.currentPlanetWidth,
            this.currentPlanetHeight
        );
        this.stats.end();
    }
}
