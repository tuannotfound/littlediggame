import Layer from "./layer.js";
import Vector from "./vector.js";
import Stats from "stats.js";
import CircularPlanet from "./circular_planet.js";
import LittleGuy from "./little_guy.js";
import Upgrades from "./upgrades.js";
import MathExtras from "./math_extras.js";
import SaveLoad from "./save_load.js";

export default class Game {
    TARGET_FPS = 60;
    FRAME_INTERVAL = 1000 / this.TARGET_FPS;
    PULSE_ANIMATION_NAME = "pulsing";
    PULSE_ANIMATION_DURATION_MS = 1000 * 0.5 * 4;

    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.zoomLevel = 7;

        // Unset or derived from ctor args
        this.bounds = new Vector(width, height);
        this.layer = new Layer("main", this.width, this.height);
        this.now = 0;
        this.then = 0;
        this.currentPlanetWidth = 0;
        this.currentPlanetHeight = 0;

        // Created during init()
        this.containerElement = null;
        this.upgrades = null;
        this.planet = null;
        this.planetPosition = null;

        this.littleGuys = [];

        this.zoomPctElement = null;

        this.gold = 0;
        this.goldElement = null;
        this.spawnCost = 0;
        this.spawnCostElement = null;

        this.littleGuyListener = {
            onDigComplete: (pixel) => {
                this.gold += this.upgrades.goldPer[pixel.type];
                this.updateGold();
            },
        };

        this.stats = new Stats();
        this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
        this.stats.dom.style.left = "90%";
        console.log("Appending stats panel");
        document.body.appendChild(this.stats.dom);

        this.paused = true;
    }

    toJSON() {
        return {
            className: this.constructor.name,
            width: this.width,
            height: this.height,
            zoomLevel: this.zoomLevel,
            upgrades: this.upgrades,
            planet: this.planet,
            planetPosition: this.planetPosition,
            littleGuys: this.littleGuys,
            gold: this.gold,
        };
    }

    static fromJSON(json) {
        let game = new Game(json.width, json.height);
        let upgrades = Upgrades.fromJSON(json.upgrades);
        let planet = CircularPlanet.fromJSON(json.planet);

        game.upgrades = upgrades;
        game.planet = planet;
        game.planetPosition = Vector.fromJSON(json.planetPosition);
        for (let littleGuyJson of json.littleGuys) {
            let pixelBeingDug = null;
            if (littleGuyJson.pixelBeingDug) {
                let pixelBeingDugPosition = Vector.fromJSON(
                    littleGuyJson.pixelBeingDug.renderPosition
                );
                pixelBeingDug = planet.getPixel(pixelBeingDugPosition);
            }
            let littleGuy = LittleGuy.fromJSON(littleGuyJson, game, pixelBeingDug);
            game.littleGuys.push(littleGuy);
        }
        game.gold = json.gold;

        return game;
    }

    init(containerElement) {
        this.containerElement = containerElement;
        this.layer.initOnscreen(containerElement);

        if (!this.upgrades) {
            this.upgrades = new Upgrades();
        }

        this.initUi();
        this.initHandlers();

        if (!this.planet) {
            this.planet = new CircularPlanet(this.bounds, 20);
        }
        this.currentPlanetWidth = this.planet.layer.width * this.zoomLevel;
        this.currentPlanetHeight = this.planet.layer.height * this.zoomLevel;
        this.planetPosition = new Vector(
            (this.width - this.planet.layer.width * this.zoomLevel) / 2,
            (this.height - this.planet.layer.height * this.zoomLevel) / 2
        );
        console.log("planet position = " + this.planetPosition.toString());
        this.planet.init();
        console.log(
            "Main canvas bounds: " + new Vector(this.layer.width, this.layer.height).toString()
        );
        console.log(
            "Planet canvas bounds: " +
                new Vector(this.planet.layer.width, this.planet.layer.height).toString()
        );

        for (const littleGuy of this.littleGuys) {
            littleGuy.init();
            littleGuy.addListener(this.littleGuyListener);
        }

        this.zoom(0);

        this.setPaused(false);
    }

    initUi() {
        let saveGameBtn = document.getElementById("save_game");
        saveGameBtn.addEventListener("click", () => {
            console.log("Saving...");
            SaveLoad.save(this);
            console.log("Saved");
        });
        saveGameBtn.removeAttribute("disabled");

        let digSpeedBtn = document.getElementById("digspeed");
        digSpeedBtn.addEventListener("click", () => {
            this.upgrades.digSpeed += 1;
            console.log("Dig speed: " + this.upgrades.digSpeed);
        });
        let digCountBtn = document.getElementById("digcount");
        digCountBtn.addEventListener("click", () => {
            this.upgrades.digCount += 1;
            console.log("Dig count: " + this.upgrades.digCount);
        });
        let goldPerDigBtn = document.getElementById("diggold");
        goldPerDigBtn.addEventListener("click", () => {
            this.upgrades.goldPerDig += 1;
            console.log("Gold per dig: " + this.upgrades.goldPerDig);
        });
        let seekGoldBtn = document.getElementById("seek_gold");
        seekGoldBtn.addEventListener("change", () => {
            this.upgrades.goldSeeker = seekGoldBtn.checked;
            console.log("Seek gold: " + seekGoldBtn.checked);
        });
        let afterlifeBtn = document.getElementById("afterlife");
        afterlifeBtn.addEventListener("change", () => {
            this.upgrades.afterlife = afterlifeBtn.checked;
            console.log("Afterlife: " + afterlifeBtn.checked);
        });

        let zoomInBtn = document.getElementById("zoom_in");
        zoomInBtn.addEventListener("click", () => this.zoom(0.25));
        let zoomOutBtn = document.getElementById("zoom_out");
        zoomOutBtn.addEventListener("click", () => this.zoom(-0.25));

        this.zoomPctElement = document.getElementById("zoom_pct");

        this.goldElement = document.getElementById("gold");
        this.updateGold();

        this.littleGuyCountElement = document.getElementById("little_guy_count");
        this.spawnCostElement = document.getElementById("spawn_cost");
        this.updateSpawnCost();

        let debugCheckbox = document.getElementById("debug_checkbox");
        window.DEBUG = debugCheckbox.checked;
        debugCheckbox.addEventListener("change", () => {
            if (window.DEBUG == debugCheckbox.checked) {
                return;
            }
            window.DEBUG = debugCheckbox.checked;
            let debugDiv = document.getElementById("debug");
            if (window.DEBUG) {
                debugDiv.classList.remove("hidden");
            } else {
                debugDiv.classList.add("hidden");
            }
            console.log("Debug: " + window.DEBUG);
        });
    }

    initHandlers() {
        this.containerElement.addEventListener("click", this.handleMouseEvent.bind(this), {
            passive: true,
        });
        window.addEventListener("keydown", this.handleKeyEvent.bind(this), {
            passive: true,
        });
    }

    updateGold() {
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
        this.currentPlanetWidth = this.planet.layer.width * this.zoomLevel;
        this.currentPlanetHeight = this.planet.layer.height * this.zoomLevel;
        this.zoomPctElement.innerHTML = (this.zoomLevel * 100).toFixed(0);
    }

    gameToPlanetCoords(gameCoords) {
        return new Vector(
            (gameCoords.x - this.planetPosition.x) / this.zoomLevel,
            (gameCoords.y - this.planetPosition.y) / this.zoomLevel
        ).round();
    }

    handleKeyEvent(event) {
        let direction = 0;
        if (event.key == "ArrowLeft" || event.key == "a") {
            direction = -1;
        } else if (event.key == "ArrowRight" || event.key == "d") {
            direction = 1;
        }
        if (direction == 0) {
            return;
        }
    }

    handleMouseEvent(event) {
        if (event.button != 0) {
            return;
        }

        let gameCoords = new Vector(event.offsetX, event.offsetY);
        let planetCoords = this.gameToPlanetCoords(gameCoords);
        if (window.DEBUG) {
            console.log(
                "Translating mouse click @ " +
                    gameCoords.toString() +
                    " to " +
                    planetCoords.toString()
            );
        }
        let closestSurfacePixel = this.planet.getClosestSurfacePixel(planetCoords);
        if (!closestSurfacePixel) {
            return;
        }
        this.spawn(closestSurfacePixel.renderPosition);
    }

    startNotEnoughGoldAnimation() {
        this.startAnimation(
            [this.goldElement.parentElement, this.spawnCostElement.parentElement],
            this.PULSE_ANIMATION_NAME,
            this.PULSE_ANIMATION_DURATION_MS
        );
    }

    stopNotEnoughGoldAnimation() {
        this.stopAnimation(
            [this.goldElement.parentElement, this.spawnCostElement.parentElement],
            this.PULSE_ANIMATION_NAME
        );
    }

    startAnimation(elements, name, durationMs) {
        console.log("Starting " + name + " animation");
        for (const element of elements) {
            if (element.classList.contains(name)) {
                continue;
            }
            element.classList.add(name);
        }
        setTimeout(() => {
            console.log("Stopping " + name + " animation");
            this.stopAnimation(elements, name);
        }, durationMs);
    }

    stopAnimation(elements, name) {
        for (const element of elements) {
            element.classList.remove(name);
        }
    }

    spawn(position) {
        if (this.spawnCost > this.gold && !window.DEBUG) {
            this.startNotEnoughGoldAnimation();
            return;
        }
        this.stopNotEnoughGoldAnimation();

        let littleGuy = new LittleGuy(this, position);
        littleGuy.addListener(this.littleGuyListener);
        littleGuy.init();
        this.littleGuys.push(littleGuy);
        this.gold -= this.spawnCost;
        this.updateGold();
        this.updateSpawnCost();
    }

    updateSpawnCost() {
        this.spawnCost = this.littleGuys.length ** this.upgrades.populationPowerScale;
        this.spawnCostElement.innerHTML = this.spawnCost;
        this.littleGuyCountElement.innerHTML = this.littleGuys.length;
    }

    addAround(planetCoords, radius, count) {
        for (let i = 0; i < count; i++) {
            this.planet.addPixel(
                MathExtras.getRandomPointInCircle(planetCoords, radius),
                new Color(255, 0, 0, 255)
            );
        }
    }

    removeAround(center, radius) {
        let toRemove = [];
        for (let x = center.x - radius; x < center.x + radius; x++) {
            for (let y = center.y - radius; y < center.y + radius; y++) {
                let dist = new Vector(center.x - x, center.y - y).mag();
                if (dist < radius) {
                    toRemove.push(new Vector(x, y));
                }
            }
        }
        this.planet.removePixelsAt(toRemove);
    }

    setPaused(paused) {
        if (this.paused == paused) {
            return;
        }
        this.paused = paused;
        if (!this.paused) {
            this.then = window.performance.now();
            this.tick(this.then);
        }
    }

    destroy() {
        this.setPaused(true);
        this.layer.destroy();
    }

    tick(newtime) {
        if (this.paused || !this.layer.canvas) {
            return;
        }

        requestAnimationFrame(this.tick.bind(this));
        this.now = newtime;
        let elapsed = this.now - this.then;

        if (elapsed <= this.FRAME_INTERVAL) {
            return;
        }
        this.then = this.now - (elapsed % this.FRAME_INTERVAL);

        this.stats.begin();
        this.planet.update();

        this.layer.getContext().clearRect(0, 0, this.width, this.height);

        this.layer.getContext().drawImage(
            this.planet.layer.canvas,
            0, // source x
            0, // source y
            this.planet.layer.width, // source width
            this.planet.layer.height, // source height
            this.planetPosition.x, // destination x
            this.planetPosition.y, // destination y
            this.currentPlanetWidth, // destination width
            this.currentPlanetHeight // destination height
        );
        let inactiveLittleGuys = [];
        for (const littleGuy of this.littleGuys) {
            littleGuy.update();
            if (!littleGuy.active) {
                inactiveLittleGuys.push(littleGuy);
                continue;
            }
            this.layer.getContext().drawImage(
                littleGuy.layer.canvas,
                0, // source x
                0, // source y
                littleGuy.layer.width, // source width
                littleGuy.layer.height, // source height
                this.planetPosition.x +
                    (this.planet.center.x + Math.round(littleGuy.position.x) - littleGuy.center.x) *
                        this.zoomLevel, // destination x
                this.planetPosition.y +
                    (this.planet.center.y + Math.round(littleGuy.position.y) - littleGuy.center.y) *
                        this.zoomLevel, // destination y
                littleGuy.layer.width * this.zoomLevel, // destination width
                littleGuy.layer.height * this.zoomLevel // destination height
            );
        }
        for (const inactiveLittleGuy of inactiveLittleGuys) {
            this.littleGuys.splice(this.littleGuys.indexOf(inactiveLittleGuy), 1);
        }
        if (inactiveLittleGuys.length > 0) {
            this.updateSpawnCost();
        }

        this.stats.end();
    }
}
