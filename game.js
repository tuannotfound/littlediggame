import Layer from "./layer.js";
import Vector from "./vector.js";
import Stats from "stats.js";
import CircularPlanet from "./circular_planet.js";
import LittleGuy from "./little_guy.js";
import Upgrades from "./upgrades.js";
import MathExtras from "./math_extras.js";
import SaveLoad from "./save_load.js";
import UpgradesUi from "./upgrades_ui2.js";
import PixelType from "./diggables/pixel_type.js";
import Particles from "./particles.js";
import Color from "./color.js";
import Serpent from "./serpent.js";

export default class Game {
    MIN_WIDTH = 300;
    MAX_WIDTH = 1200;
    MIN_HEIGHT = 300;
    MAX_HEIGHT = 900;
    MIN_ZOOM = 3.25;
    MAX_ZOOM = 10;
    MIN_SAVE_INTERVAL_MS = 5000;
    AUTO_SAVE_INTERVAL_MS = 30000;
    PLANET_RADIUS = 35;
    TARGET_FPS = 60;
    FRAME_INTERVAL_MS = 1000 / this.TARGET_FPS;
    PULSE_ANIMATION_NAME = "pulsing";
    PULSE_ANIMATION_DURATION_MS = 1000 * 0.5 * 4;

    constructor(windowWidth, windowHeight) {
        // Sets 'this' width, height, zoom, and bounds.
        this.onResize(windowWidth, windowHeight);

        // Unset or derived from ctor args
        this.now = 0;
        this.then = 0;
        this.upgradesUi = new UpgradesUi();
        this.gameSpeed = 1;

        // Created during init()
        this.containerElement = null;
        this.upgrades = null;
        this.planet = null;
        this.planetPosition = null;

        this.serpent = new Serpent(
            30,
            new Vector(
                this.layer.width / this.zoomLevel,
                this.layer.height / this.zoomLevel
            ).round(),
            new Vector(
                this.layer.width / (this.zoomLevel * 2),
                this.layer.height / (this.zoomLevel * 2)
            ).round()
        );

        this.littleGuys = [];
        this.littleGuyListener = {
            onDigComplete: (pixel) => {
                this.onDigComplete(pixel);
            },
            onDeath: (littleGuy) => {
                this.handleDeath(littleGuy);
            },
            onInactive: (littleGuy) => {
                this.handleInactive(littleGuy);
            },
        };

        this.particles = new Particles(this.width, this.height);

        this.knowsDeath = false;
        this.knowsEggDeath = false;
        this.knowsDirt = false;
        this.aspis = 0;
        this.aspisElement = null;
        this.upgradesAspisElement = null;
        this.planetHealthElement = null;
        this.spawnCost = 0;
        this.spawnCostElement = null;
        this.availableUpgradeCount = 0;

        this.angelCount = 0;
        this.demonCount = 0;

        this.lastConceptionTime = 0;

        this.stats = new Stats();
        this.stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
        this.stats.dom.style.left = "90%";
        console.log("Appending stats panel");
        document.body.appendChild(this.stats.dom);

        this.paused = true;
        this.lastSaved = -this.MIN_SAVE_INTERVAL_MS;
        this.autoSaveTimeout = null;

        this.initialized = false;
    }

    toJSON() {
        return {
            className: this.constructor.name,
            upgrades: this.upgrades,
            planet: this.planet,
            planetPosition: this.planetPosition,
            littleGuys: this.littleGuys,
            aspis: this.aspis,
            knowsDirt: this.knowsDirt,
            knowsDeath: this.knowsDeath,
        };
    }

    static fromJSON(json) {
        let game = new Game(window.innerWidth, window.innerHeight);
        let upgrades = Upgrades.fromJSON(json.upgrades);
        let planet = CircularPlanet.fromJSON(json.planet, upgrades);

        game.upgrades = upgrades;
        game.planet = planet;
        game.planetPosition = Vector.fromJSON(json.planetPosition);
        for (let littleGuyJson of json.littleGuys) {
            let pixelBeingDug = null;
            if (littleGuyJson.pixelBeingDug) {
                let pixelBeingDugPosition = Vector.fromJSON(littleGuyJson.pixelBeingDug.position);
                pixelBeingDug = planet.getPixel(pixelBeingDugPosition);
            }
            let littleGuy = LittleGuy.fromJSON(littleGuyJson, planet, upgrades, pixelBeingDug);
            game.littleGuys.push(littleGuy);
        }
        game.aspis = json.aspis;
        game.knowsDirt = json.knowsDirt;
        game.knowsDeath = json.knowsDeath;

        return game;
    }

    init(containerElement) {
        console.log("Initializing game");
        this.containerElement = containerElement;
        this.layer.initOnscreen(containerElement);

        if (!this.upgrades) {
            this.upgrades = new Upgrades();
        }
        this.upgradesUi.init(
            document.getElementById("upgrades"),
            this.upgrades,
            // onPurchase callback
            (upgrade, button) => {
                this.onUpgradePurchased(upgrade, button);
            },
            () => this.aspis
        );

        if (!this.planet) {
            this.planet = new CircularPlanet(this.PLANET_RADIUS);
        }
        this.updatePlanetPosition();
        this.planet.init(this.upgrades);
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

        this.particles.init();

        this.initUi();
        this.initHandlers();

        this.initialized = true;
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

        // ----- START Debug buttons -----
        let serpentBtn = document.getElementById("spawn_serpent");
        serpentBtn.addEventListener("click", () => {
            this.spawnSerpent();
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
        let pauseBtn = document.getElementById("paused");
        pauseBtn.addEventListener("change", () => {
            this.setPaused(pauseBtn.checked);
            console.log("Paused: " + pauseBtn.checked);
        });
        let bloodBtn = document.getElementById("blood");
        bloodBtn.addEventListener("change", () => {
            this.blood = bloodBtn.checked;
            console.log("Blood: " + bloodBtn.checked);
        });
        // ----- END Debug buttons -----

        let upgradesContainer = document.getElementById("upgrades_container");
        let showUpgradesBtn = document.getElementById("show_upgrades");
        showUpgradesBtn.addEventListener("click", () => {
            upgradesContainer.classList.remove("hidden");
            showUpgradesBtn.classList.add("hidden");
            this.upgradesUi.onShown();
        });
        let hideUpgradesBtn = document.getElementById("hide_upgrades");
        hideUpgradesBtn.addEventListener("click", () => {
            upgradesContainer.classList.add("hidden");
            showUpgradesBtn.classList.remove("hidden");
        });
        this.availableUpgradeCount = document.getElementById("available_upgrade_count");

        this.aspisElement = document.getElementById("aspis");
        this.upgradesAspisElement = document.getElementById("upgrades_aspis");
        this.updateAspis();

        this.planetHealthElement = document.getElementById("planet_health");
        this.updateHealth();

        this.littleGuyCountElement = document.getElementById("little_guy_count");
        this.spawnCostElement = document.getElementById("spawn_cost");
        this.updateSpawnCost();

        this.updateLegend();

        for (let i = 0; i < 4; i++) {
            let pow = i + 1;
            let val = 10 ** pow;
            let plusBtn = document.getElementById("plus_" + val);
            plusBtn.addEventListener("click", () => {
                this.aspis += val;
                this.updateAspis();
            });
        }
    }

    initHandlers() {
        this.containerElement.addEventListener("click", this.handleMouseEvent.bind(this), {
            passive: true,
        });
        window.addEventListener("keydown", this.handleKeyEvent.bind(this), {
            passive: true,
        });
    }

    onResize(windowWidth, windowHeight) {
        let header = document.getElementById("header");
        let styles = window.getComputedStyle(header);
        let headerMargin = parseFloat(styles["marginTop"]) + parseFloat(styles["marginBottom"]);
        let headerHeight = header.offsetHeight + headerMargin;
        console.log(
            "header height = " + header.offsetHeight + " + " + headerMargin + " = " + headerHeight
        );
        this.width = MathExtras.clamp(windowWidth - 30, this.MIN_WIDTH, this.MAX_WIDTH);
        this.height = MathExtras.clamp(
            windowHeight - headerHeight - 30,
            this.MIN_HEIGHT,
            this.MAX_HEIGHT
        );
        this.bounds = new Vector(this.width, this.height);
        // Update zoom
        let smallest = Math.min(this.width, this.height);
        this.zoomLevel =
            this.MIN_ZOOM +
            ((this.MAX_ZOOM - this.MIN_ZOOM) *
                (smallest - Math.min(this.MIN_WIDTH, this.MIN_HEIGHT))) /
                (Math.min(this.MAX_WIDTH, this.MAX_HEIGHT) -
                    Math.min(this.MIN_WIDTH, this.MIN_HEIGHT));

        console.log(
            "Setting canvas to " +
                this.width +
                " x " +
                this.height +
                " w/ zoom of " +
                this.zoomLevel
        );

        // Create a new layer because resizing a canvas makes it blurry.
        let oldLayer = this.layer;
        this.layer = new Layer("game", this.width, this.height);
        if (oldLayer) {
            if (oldLayer.container) {
                this.layer.initOnscreen(oldLayer.container);
            }
            oldLayer.destroy();
        }
        if (this.serpent) {
            this.serpent.onResize(
                new Vector(this.bounds.x / this.zoomLevel, this.bounds.x / this.zoomLevel).round()
            );
        }
        this.updatePlanetPosition();
    }

    maybeSave() {
        if (!this.initialized) {
            return;
        }
        let now = performance.now();
        if (now - this.lastSaved > this.MIN_SAVE_INTERVAL_MS) {
            SaveLoad.save(this);
            this.lastSaved = now;
            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = null;
        } else {
            let remainingTime = this.MIN_SAVE_INTERVAL_MS - (now - this.lastSaved);
            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = setTimeout(() => this.maybeSave(), remainingTime);
            return;
        }
        if (!this.autoSaveTimeout && !this.paused) {
            this.autoSaveTimeout = setTimeout(() => this.maybeSave(), this.AUTO_SAVE_INTERVAL_MS);
        }
    }

    updatePlanetPosition() {
        if (!this.planet || !this.planet.layer) {
            return;
        }
        this.planetPosition = new Vector(
            (this.width - this.planet.layer.width * this.zoomLevel) / 2,
            (this.height - this.planet.layer.height * this.zoomLevel) / 2
        );
        console.log("planet position = " + this.planetPosition.toString());
    }

    onDigComplete(pixel) {
        if (!this.knowsDirt) {
            this.knowsDirt = true;
            this.updateLegend();
        }
        let value = this.upgrades.aspisPer[pixel.type.name];
        if (
            (pixel.type == PixelType.GOLD && !this.upgrades.unlockGold) ||
            (pixel.type == PixelType.DIAMOND && !this.upgrades.unlockDiamonds)
        ) {
            // Pretend we dug up some dirt if we haven't researched the real type yet.
            value = this.upgrades.aspisPer[PixelType.DIRT.name];
        }
        this.aspis += value;
        if (value > 0) {
            this.updateAspis();
        }
        let positionInParticlesSpace = this.planetToParticleSpace(pixel.position);
        let color = new Color(pixel.getRenderColor());
        // The pixel itself will likely be invisible post-dig, so make sure we reset the alpha.
        color.a = 255;
        this.particles.digEffect(positionInParticlesSpace, color, this.upgrades.digSpeed);
        this.particles.coinEffect(positionInParticlesSpace, value);

        this.updateHealth();

        this.maybeSave();
    }

    planetToParticleSpace(planetCoords) {
        let particleCoords = new Vector(
            this.particles.layer.width / 2 - this.planet.layer.width / 2,
            this.particles.layer.height / 2 - this.planet.layer.height / 2
        );
        particleCoords.add(planetCoords);
        return particleCoords;
    }

    onUpgradePurchased(upgrade, button) {
        let buttonCostEl = document.querySelector(
            "button#" + button.id + " > div.upgrade_title > span.cost"
        );
        if (upgrade.cost > this.aspis) {
            this.startNotEnoughAspisAnimation([
                buttonCostEl,
                this.upgradesAspisElement.parentElement,
            ]);
            return;
        }
        this.stopNotEnoughAspisAnimation([buttonCostEl, this.upgradesAspisElement.parentElement]);
        // Must mark the upgrade as purchased before we update the Aspis, otherwise the 'available
        // to purchase' notifcation bubble will include the one we just purchased.
        upgrade.purchase();
        this.aspis -= upgrade.cost;
        if (upgrade.cost > 0) {
            this.updateAspis();
        }
        this.updateSpawnCost();
        this.updateLegend();
    }

    updateAspis() {
        this.aspisElement.innerHTML = this.aspis;
        this.upgradesAspisElement.innerHTML = this.aspis;
        this.upgradesUi.onAspisChanged(this.aspis);
        this.updateAvailableUpgradeCount();

        this.maybeSave();
    }

    updateAvailableUpgradeCount() {
        let availableUpgradeCount = 0;
        let availableUpgrades = [];
        for (const upgrade of this.upgrades.upgradeTree.values()) {
            if (upgrade.purchased) {
                continue;
            }
            if (!upgrade.unlocked) {
                continue;
            }
            if (upgrade.cost <= this.aspis) {
                availableUpgradeCount++;
                availableUpgrades.push(upgrade.id);
            }
        }
        if (availableUpgradeCount > 0) {
            this.availableUpgradeCount.classList.remove("hidden");
            this.availableUpgradeCount.innerHTML = availableUpgradeCount;
        } else {
            this.availableUpgradeCount.classList.add("hidden");
        }
    }

    updateHealth() {
        this.planetHealthElement.innerHTML = (100 * this.planet.health).toFixed(1);
        if (this.planet.health <= 0 && !this.serpent.initialized) {
            this.spawnSerpent();
        }
    }

    updateLegend() {
        for (const pixelType of Object.values(PixelType)) {
            document.getElementById("aspis_per_" + pixelType.name).innerText =
                this.upgrades.aspisPer[pixelType.name];
        }

        let updateHidden = function (type, show) {
            let element = document.querySelector("span." + type.name.toLowerCase()).parentElement;
            if (show) {
                element.classList.remove("hidden");
            } else {
                element.classList.add("hidden");
            }
        };
        updateHidden(PixelType.DIRT, this.knowsDirt);
        updateHidden(PixelType.TOMBSTONE, this.knowsDeath);
        updateHidden(PixelType.GOLD, this.upgrades.unlockGold);
        updateHidden(PixelType.DIAMOND, this.upgrades.unlockDiamonds);
        updateHidden(PixelType.EGG, this.knowsEggDeath || this.upgrades.eggHandling);

        let eggSpan = document.querySelector(
            "span#" + PixelType.EGG.name.toLowerCase() + "_legend_title"
        );
        if (this.upgrades.eggHandling) {
            eggSpan.innerText = "Egg";
        }
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
        this.spawn(closestSurfacePixel.position, false);
    }

    startNotEnoughAspisAnimation(others) {
        let animated = [this.aspisElement.parentElement];
        if (others) {
            animated.push(...others);
        }
        this.startAnimation(animated, this.PULSE_ANIMATION_NAME, this.PULSE_ANIMATION_DURATION_MS);
    }

    stopNotEnoughAspisAnimation(others) {
        let animated = [this.aspisElement.parentElement];
        if (others) {
            animated.push(...others);
        }
        this.stopAnimation(animated, this.PULSE_ANIMATION_NAME);
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

    spawn(position, immaculate) {
        if (!immaculate) {
            if (this.spawnCost > this.aspis && !window.DEBUG) {
                this.startNotEnoughAspisAnimation([this.spawnCostElement.parentElement]);
                return;
            }
            this.stopNotEnoughAspisAnimation([this.spawnCostElement.parentElement]);
        }

        let littleGuy = new LittleGuy(this.planet, position, this.upgrades, immaculate);
        littleGuy.addListener(this.littleGuyListener);
        littleGuy.init();
        this.littleGuys.push(littleGuy);
        if (!immaculate) {
            this.aspis -= this.spawnCost;
            if (this.spawnCost > 0) {
                this.updateAspis();
            }
        }
        this.updateSpawnCost();
        this.maybeSave();
    }

    updateSpawnCost() {
        let maculateCount = this.littleGuys.filter((lg) => !lg.immaculate).length;
        maculateCount = Math.max(0, maculateCount + 1 - this.upgrades.freeWorkerCount);
        this.spawnCost = Math.floor(maculateCount ** this.upgrades.populationPowerScale);
        this.spawnCostElement.innerHTML = this.spawnCost;
        this.littleGuyCountElement.innerHTML = this.littleGuys.length;
    }

    spawnSerpent() {
        if (this.serpent.initialized) {
            return;
        }
        this.serpent.init(this.upgrades);
    }

    // Center is in planet space
    bloodyAround(center) {
        if (!this.blood) {
            return;
        }
        let radius = Math.floor(2 * (Math.random() + 1));
        this.particles.bloodEffect(this.planetToParticleSpace(center));
        for (let x = center.x - radius; x < center.x + radius; x++) {
            for (let y = center.y - radius; y < center.y + radius; y++) {
                let dist = new Vector(center.x - x, center.y - y).mag();
                if (dist > radius) {
                    continue;
                }
                let pixel = this.planet.getPixel(new Vector(x, y));
                if (!pixel || !pixel.isSurface || pixel.isBloodied) {
                    continue;
                }
                pixel.bloody();
            }
        }
    }

    handleDeath(littleGuy) {
        if (!this.knowsDeath) {
            this.knowsDeath = true;
            this.updateLegend();
        }
        if (this.upgrades.afterlife) {
            if (littleGuy.saintly) {
                this.angelCount++;
            } else {
                this.demonCount++;
            }
            this.aspis += this.upgrades.aspisPer[PixelType.TOMBSTONE.name];
            this.updateAspis();
        }
        if (littleGuy.deathByEgg) {
            this.knowsEggDeath = true;
            this.particles.fireEffect(
                this.planetToParticleSpace(littleGuy.positionInPixelBodySpace)
            );
            this.updateLegend();
        }
        this.bloodyAround(littleGuy.positionInPixelBodySpace);
    }

    handleInactive(littleGuy) {
        this.littleGuys.splice(this.littleGuys.indexOf(littleGuy), 1);
        this.updateSpawnCost();
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
        this.maybeSave();
    }

    destroy() {
        this.setPaused(true);
        this.layer.destroy();
        this.upgradesUi.destroy();
    }

    tick(newtime) {
        if (this.paused || !this.layer.canvas) {
            return;
        }

        requestAnimationFrame(this.tick.bind(this));
        this.now = newtime;
        let elapsedMs = this.now - this.then;

        if (elapsedMs <= this.FRAME_INTERVAL_MS) {
            return;
        }
        this.then = this.now - (elapsedMs % this.FRAME_INTERVAL_MS);

        this.stats.begin();
        for (let i = 0; i < this.gameSpeed; i++) {
            this.runUpdate(elapsedMs);
        }
        this.stats.end();
    }

    runUpdate(elapsedMs) {
        if (
            this.upgrades.conceptionIntervalMs > 0 &&
            this.now - this.lastConceptionTime > this.upgrades.conceptionIntervalMs
        ) {
            console.log("Immaculate conception occurred");
            let planetCoords = new Vector(
                Math.random() * this.planet.layer.width,
                Math.random() * this.planet.layer.height
            );
            let closestSurfacePixel = this.planet.getClosestSurfacePixel(planetCoords);
            if (closestSurfacePixel) {
                this.spawn(closestSurfacePixel.position, true);
            }

            this.lastConceptionTime = this.now;
        }

        this.layer.getContext().clearRect(0, 0, this.width, this.height);

        // Planet
        this.planet.update(elapsedMs);
        this.layer.getContext().drawImage(
            this.planet.layer.canvas,
            0, // source x
            0, // source y
            this.planet.layer.width, // source width
            this.planet.layer.height, // source height
            this.planetPosition.x, // destination x
            this.planetPosition.y, // destination y
            this.planet.layer.width * this.zoomLevel, // destination width
            this.planet.layer.height * this.zoomLevel // destination height
        );

        // Little guys
        for (const littleGuy of this.littleGuys) {
            littleGuy.update(elapsedMs);
            if (!littleGuy.active) {
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

        this.serpent.update();
        if (this.serpent.initialized) {
            this.layer.getContext().drawImage(
                this.serpent.layer.canvas,
                0, // source x
                0, // source y
                this.serpent.layer.width, // source width
                this.serpent.layer.height, // source height
                (-this.serpent.layer.width * this.zoomLevel) / 2 + this.width / 2, // destination x
                (-this.serpent.layer.height * this.zoomLevel) / 2 + this.height / 2, // destination y
                this.serpent.layer.width * this.zoomLevel, // destination width
                this.serpent.layer.height * this.zoomLevel // destination height
            );
        }

        // Particles
        // Render them last as they go on top of everything else.
        // Don't do particles on higher game speeds (used for testing only)
        if (this.gameSpeed == 1) {
            this.particles.update(elapsedMs);
            this.layer.getContext().drawImage(
                this.particles.layer.canvas,
                0, // source x
                0, // source y
                this.particles.layer.width, // source width
                this.particles.layer.height, // source height
                (-this.particles.layer.width * this.zoomLevel) / 2 + this.width / 2, // destination x
                (-this.particles.layer.height * this.zoomLevel) / 2 + this.height / 2, // destination y
                this.particles.layer.width * this.zoomLevel, // destination width
                this.particles.layer.height * this.zoomLevel // destination height
            );
        }
    }
}
