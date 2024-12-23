import CircularPlanet from "./circular_planet.js";
import MaskedPlanet from "./masked_planet.js";
import Eaters from "./eaters.js";
import Layer from "./layer.js";

export default class Game {
    MAX_ZOOM = 4;
    MIN_ZOOM = 0.25;

    constructor(width, height) {
        this.width = width;
        this.height = height;
        const targetFps = 60;
        this.frameTime = 1000 / targetFps;
        this.lastFrameTime = 0;
        this.containerElement = null;
        this.zoomLevel = 1;
        this.planet = new CircularPlanet(250);
        //this.planet = new MaskedPlanet("assets/skull.png", 229, 300);
        this.currentPlanetWidth = this.planet.width * this.zoomLevel;
        this.currentPlanetHeight = this.planet.height * this.zoomLevel;
        this.eaters = new Eaters(this);
        this.layer = null;
        this.planetX = 0;
        this.planetY = 0;

        this.gold = 0;
        this.goldElement = null;
        this.zoomPctElement = null;

        this.upgrades = {
            speed: 0,
            width: 0,
            durability: 0,
            gold: 1,
        };
    }

    async init(containerElement) {
        this.containerElement = containerElement;
        this.layer = new Layer("main", this.width, this.height);
        this.layer.initOnscreen(containerElement);
        await this.planet.init();
        this.eaters.init();
        this.initUi();
        this.initHandlers();
        this.tick(0);
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

    // Main game loop
    tick(deltaTime) {
        this.eaters.tick(deltaTime);
        this.planet.draw();

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
        this.drawDebugBorder();

        this.lastFrameTime = Date.now();
        setTimeout(() => {
            const currentTime = Date.now();
            const deltaTime = currentTime - this.lastFrameTime;
            this.tick(deltaTime);
        }, this.frameTime);
    }

    drawDebugBorder() {
        let ctx = this.layer.getContext();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "black";
        ctx.rect(0, 0, this.planet.width, this.planet.height);
        ctx.stroke();
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

    updateGold(amount) {
        this.gold += amount;
        this.goldElement.innerHTML = this.gold;
    }

    handleMouseEvent(event) {
        if (event.button != 0) {
            return;
        }
        let planetCenterX = this.planetX + this.currentPlanetWidth / 2;
        let planetCenterY = this.planetY + this.currentPlanetHeight / 2;
        // Get the angle between the mouse event and the center of the planet
        let angle = Math.atan2(event.offsetY - planetCenterX, event.offsetX - planetCenterY);
        this.eaters.spawn(angle);
        console.log("Health: " + (this.planet.getHealth() * 100).toFixed(2) + "%");
    }
}
