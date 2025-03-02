import Layer from "./layer.js";
import Vector from "./vector.js";
import Stats from "stats.js";
import CircularPlanet from "./pixel_bodies/circular_planet.js";
import SwissPlanet from "./pixel_bodies/swiss_planet.js";
import SpikyPlanet from "./pixel_bodies/spiky_planet.js";
import EggPlanet from "./pixel_bodies/egg_planet.js";
import LittleGuy from "./little_guy.js";
import Upgrades from "./upgrades.js";
import MathExtras from "./math_extras.js";
import SaveLoad from "./save_load.js";
import UpgradesUi from "./upgrades_ui2.js";
import PixelType from "./diggables/pixel_type.js";
import Particles from "./particles.js";
import Color from "./color.js";
import Serpent from "./pixel_bodies/serpent.js";
import Hourglass from "./hourglass.js";

export default class Game {
    MIN_WIDTH = 300;
    MAX_WIDTH = 1200;
    MIN_HEIGHT = 300;
    MAX_HEIGHT = 900;
    MIN_SAVE_INTERVAL_MS = 5000;
    AUTO_SAVE_INTERVAL_MS = 30000;
    TARGET_FPS = 60;
    FRAME_INTERVAL_MS = 1000 / this.TARGET_FPS;
    PULSE_ANIMATION_NAME = "pulsing";
    PULSE_ANIMATION_DURATION_MS = 1000 * 0.5 * 4;
    ZOOM_DURATION_MS = 1000 * 2;

    constructor(windowWidth, windowHeight, pixelBodies, upgrades) {
        this.width = 0;
        this.height = 0;
        this.zoomLevel = 1;
        this.zoomLevelSrc = 1;
        this.zoomLevelDst = 1;
        this.zoomElapsedMs = 0;
        this.bounds = new Vector();
        this.layer = null;
        this.upgrades = upgrades ? upgrades : new Upgrades();
        if (pixelBodies == null) {
            this.pixelBodies = [];
            this.pixelBodies.push(new CircularPlanet(8));
            this.pixelBodies.push(new SwissPlanet(15));
            this.pixelBodies.push(new SpikyPlanet(22));
            this.pixelBodies.push(new EggPlanet(35));
            this.pixelBodies.push(new Serpent(140, 84));
        } else {
            this.pixelBodies = pixelBodies;
        }
        this.activePixelBodyPosition = new Vector();
        // Sets 'this' width, height, zoom, and bounds.
        this.onResize(windowWidth, windowHeight);

        // Unset or derived from ctor args
        this.now = 0;
        this.then = 0;
        this.upgradesUi = new UpgradesUi();
        this.gameSpeed = 1;

        // Created during init()
        this.containerElement = null;

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

        this.particles = new Particles(
            this.layer.width / this.zoomLevel,
            this.layer.height / this.zoomLevel
        );
        this.hourglass = new Hourglass(25, 50, 600);

        this.knowsDeath = false;
        this.knowsEggDeath = false;
        this.knowsDirt = false;
        this.aspis = 0;
        this.aspisElement = null;
        this.upgradesAspisElement = null;
        this.healthElement = null;
        this.spawnCost = 0;
        this.spawnCostElement = null;
        this.digsPerDeathElement = null;
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
            // TODO: For some reason, on every save/load cycle, the layer size gets larger.
            pixelBodies: this.pixelBodies.map((pb) => pb.toJSON()),
            // Do we actually need this?
            activePixelBodyPosition: this.activePixelBodyPosition,
            littleGuys: this.littleGuys,
            aspis: this.aspis,
            knowsDeath: this.knowsDeath,
            knowsDirt: this.knowsDirt,
            knowsEggDeath: this.knowsEggDeath,
        };
    }

    static fromJSON(json) {
        let upgrades = Upgrades.fromJSON(json.upgrades);
        let pixelBodies = [];
        for (let pixelBodyJson of json.pixelBodies) {
            if (pixelBodyJson.className == "CircularPlanet") {
                pixelBodies.push(CircularPlanet.fromJSON(pixelBodyJson, upgrades));
            } else if (pixelBodyJson.className == "Serpent") {
                pixelBodies.push(Serpent.fromJSON(pixelBodyJson, upgrades));
            } else {
                console.error("Unknown pixel body type: " + pixelBodyJson.className);
            }
        }
        let game = new Game(window.innerWidth, window.innerHeight, pixelBodies, upgrades);

        //game.activePixelBodyPosition = Vector.fromJSON(json.activePixelBodyPosition);
        for (let littleGuyJson of json.littleGuys) {
            let pixelBeingDug = null;
            if (littleGuyJson.pixelBeingDug) {
                let pixelBeingDugPosition = Vector.fromJSON(littleGuyJson.pixelBeingDug.position);
                pixelBeingDug = game.activePixelBody.getPixel(pixelBeingDugPosition);
            }
            let littleGuy = LittleGuy.fromJSON(
                littleGuyJson,
                game.activePixelBody,
                upgrades,
                pixelBeingDug
            );
            game.littleGuys.push(littleGuy);
        }
        game.aspis = json.aspis;
        game.knowsDeath = json.knowsDeath;
        game.knowsDirt = json.knowsDirt;
        game.knowsEggDeath = json.knowsEggDeath;

        return game;
    }

    init(containerElement) {
        console.log("Initializing game");
        this.containerElement = containerElement;
        this.layer.initOnscreen(containerElement);
        this.upgradesUi.init(
            document.getElementById("upgrades"),
            this.upgrades,
            // onPurchase callback
            (upgrade, button) => {
                this.onUpgradePurchased(upgrade, button);
            },
            () => this.aspis
        );
        this.updateActivePixelBodyPosition();
        this.updateParticlesZoom();
        this.activePixelBody.init(this.upgrades);
        console.log(
            "Main canvas bounds: " + new Vector(this.layer.width, this.layer.height).toString()
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
        let nextPixelBodyBtn = document.getElementById("next_pixel_body");
        nextPixelBodyBtn.addEventListener("click", () => {
            this.goToNextPixelBody();
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

        this.healthElement = document.getElementById("health");
        this.updateHealth();

        this.littleGuyCountElement = document.getElementById("little_guy_count");
        this.spawnCostElement = document.getElementById("spawn_cost");
        this.updateSpawnCost();

        this.digsPerDeathElement = document.getElementById("digs_per_death");
        this.updateDigsPerDeath();

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

    calculateZoomLevel(width, height) {
        let pixelBody = this.activePixelBody;
        if (!pixelBody) {
            return 1;
        }

        // Add some buffer around the pixel body w/ 0.8
        let widthMaxZoom = Math.round(
            ((1 - pixelBody.renderBufferPct) * width) / pixelBody.layer.width
        );
        let heightMaxZoom = Math.round(
            ((1 - pixelBody.renderBufferPct) * height) / pixelBody.layer.height
        );
        // Limit ourselves by the smallest max zoom
        return Math.round(Math.min(widthMaxZoom, heightMaxZoom));
    }

    onResize(windowWidth, windowHeight) {
        let header = document.getElementById("header");
        let styles = window.getComputedStyle(header);
        let headerMargin = parseFloat(styles["marginTop"]) + parseFloat(styles["marginBottom"]);
        let headerHeight = header.offsetHeight + headerMargin;
        let newWidth = MathExtras.clamp(windowWidth - 30, this.MIN_WIDTH, this.MAX_WIDTH);
        let newHeight = MathExtras.clamp(
            windowHeight - headerHeight - 30,
            this.MIN_HEIGHT,
            this.MAX_HEIGHT
        );
        let newZoomLevel = this.calculateZoomLevel(newWidth, newHeight);
        // Round down to the nearest zoom level to ensure the canvas is always a multiple of the
        // zoom level and thus the pixels are always square.
        newWidth = MathExtras.floorToNearest(newZoomLevel, newWidth);
        newHeight = MathExtras.floorToNearest(newZoomLevel, newHeight);
        if (this.width == newWidth && this.height == newHeight) {
            return;
        }

        console.log(
            "Updating canvas dimensions: " +
                this.width +
                " x " +
                this.height +
                " -> " +
                newWidth +
                " x " +
                newHeight +
                " and zoom: " +
                this.zoomLevel +
                " -> " +
                newZoomLevel
        );
        this.width = newWidth;
        this.height = newHeight;
        this.zoomLevel = newZoomLevel;
        // Don't animate the zoom on resize.
        this.zoomLevelSrc = newZoomLevel;
        this.zoomLevelDst = newZoomLevel;

        // Create a new layer because resizing a canvas makes it blurry.
        let oldLayer = this.layer;
        this.layer = new Layer("game", this.width, this.height);
        if (oldLayer) {
            if (oldLayer.container) {
                this.layer.initOnscreen(oldLayer.container);
            }
            oldLayer.destroy();
        }
        this.updateActivePixelBodyPosition();
        this.updateParticlesZoom();
    }

    updateParticlesZoom() {
        if (this.particles) {
            this.particles.onResize(
                new Vector(this.width / this.zoomLevel, this.height / this.zoomLevel).round()
            );
        }
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

    updateActivePixelBodyPosition() {
        let activePixelBody = this.activePixelBody;
        if (!activePixelBody) {
            return null;
        }
        this.activePixelBodyPosition = new Vector(
            this.width - activePixelBody.layer.width * this.zoomLevel,
            this.height - activePixelBody.layer.height * this.zoomLevel
        );
        // Centered
        this.activePixelBodyPosition.div(2);
        if (this.zoomLevel == this.zoomLevelDst) {
            // Only round once we've reached the target zoom level, otherwise the zoom is very
            // jittery as the center position gets shifted around a handful of pixels.
            this.activePixelBodyPosition.x = MathExtras.roundToNearest(
                this.zoomLevel,
                this.activePixelBodyPosition.x
            );
            this.activePixelBodyPosition.y = MathExtras.roundToNearest(
                this.zoomLevel,
                this.activePixelBodyPosition.y
            );
        }
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
        let positionInParticlesSpace = this.pixelBodyToParticleSpace(pixel.position);
        let color = new Color(pixel.getRenderColor());
        // The pixel itself will likely be invisible post-dig, so make sure we reset the alpha.
        color.a = 255;
        this.particles.digEffect(positionInParticlesSpace, color, this.upgrades.digSpeed);
        this.particles.coinEffect(positionInParticlesSpace, value);

        this.updateHealth();

        this.maybeSave();
    }

    pixelBodyToParticleSpace(planetCoords) {
        let activePixelBody = this.activePixelBody;
        let particleCoords = new Vector(
            this.particles.layer.width / 2 - activePixelBody.layer.width / 2,
            this.particles.layer.height / 2 - activePixelBody.layer.height / 2
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
        this.updateDigsPerDeath();
        this.updateLegend();
        if (this.activePixelBody) {
            // Force the planet to redraw, just in case any new pixel types have been revealed.
            this.activePixelBody.needsUpdate = true;
        }
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
        if (this.activePixelBody?.health <= 0) {
            if (!this.goToNextPixelBody()) {
                return;
            }
        }
        this.healthElement.innerHTML = (100 * this.activePixelBody.health).toFixed(1);
    }

    goToNextPixelBody() {
        this.pixelBodies.shift();
        if (this.pixelBodies.length == 0 || this.activePixelBody == null) {
            this.endGame();
            return false;
        }
        this.activePixelBody.init(this.upgrades);
        this.zoomElapsedMs = 0;
        this.updateActivePixelBodyPosition();
        this.updateParticlesZoom();
        if (this.activePixelBody.className == "Serpent") {
            // Swap out the planet icon for the serpent
            document.getElementById("planet_icon").classList.add("hidden");
            document.getElementById("serpent_icon").classList.remove("hidden");
            // Initialize the hourglass
            this.hourglass.init();
        } else {
            // Zooming from the current (zoomed in) point to a more zoomed out point looks kinda goofy,
            // so just have the planet come into view as if we're zooming towards it instead.
            // Just don't do this for the serpent since it's supposed to emerge from an egg.
            this.zoomLevel = 1;
        }
        this.zoomLevelSrc = this.zoomLevel;
        this.zoomLevelDst = this.calculateZoomLevel(this.width, this.height);
        return true;
    }

    endGame() {
        this.setPaused(true);
        console.log("GAME OVER");
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

    gameToActiveBodyCoords(gameCoords) {
        return new Vector(
            (gameCoords.x - this.activePixelBodyPosition.x) / this.zoomLevel,
            (gameCoords.y - this.activePixelBodyPosition.y) / this.zoomLevel
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
        let activeBodyCoords = this.gameToActiveBodyCoords(gameCoords);
        if (window.DEBUG) {
            console.log(
                "Translating mouse click @ " +
                    gameCoords.toString() +
                    " to " +
                    activeBodyCoords.toString()
            );
        }
        let closestSurfacePixel = this.activePixelBody.getClosestSurfacePixel(activeBodyCoords);
        if (!closestSurfacePixel) {
            return;
        }
        this.spawn(closestSurfacePixel.position, false);
    }

    get activePixelBody() {
        return this.pixelBodies.length > 0 ? this.pixelBodies[0] : null;
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

        let littleGuy = new LittleGuy(this.activePixelBody, position, this.upgrades, immaculate);
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
        // Maculate is the opposite of immaculate. Everybody knows this.
        let maculateCount = this.littleGuys.filter((lg) => !lg.immaculate).length;
        maculateCount = Math.max(0, maculateCount + 1 - this.upgrades.freeWorkerCount);
        this.spawnCost = Math.floor(maculateCount ** this.upgrades.populationPowerScale);
        this.spawnCostElement.innerHTML = this.spawnCost;
        this.littleGuyCountElement.innerHTML = this.littleGuys.length;
    }

    updateDigsPerDeath() {
        this.digsPerDeathElement.innerHTML = this.upgrades.digCount;
    }

    // Center is in planet space
    bloodyAround(center) {
        if (!this.blood) {
            return;
        }
        let radius = Math.floor(2 * (Math.random() + 1));
        this.particles.bloodEffect(this.pixelBodyToParticleSpace(center));
        for (let x = center.x - radius; x < center.x + radius; x++) {
            for (let y = center.y - radius; y < center.y + radius; y++) {
                let dist = new Vector(center.x - x, center.y - y).mag();
                if (dist > radius) {
                    continue;
                }
                let pixel = this.activePixelBody.getPixel(new Vector(x, y));
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
                this.pixelBodyToParticleSpace(littleGuy.positionInPixelBodySpace)
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
        document.body.removeChild(this.stats.dom);
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
        // This doesn't quite work yet.
        if (
            Math.abs(this.zoomLevel - this.zoomLevelDst) < 0.01 ||
            this.zoomLevelDst == this.zoomLevelSrc
        ) {
            this.zoomLevel = this.zoomLevelDst;
        } else {
            this.zoomElapsedMs += elapsedMs;
            let zoomProgress = this.zoomElapsedMs / this.ZOOM_DURATION_MS;
            this.zoomLevel = MathExtras.easeOutCubic(
                this.zoomLevelSrc,
                this.zoomLevelDst,
                zoomProgress
            );
            this.updateActivePixelBodyPosition();
            this.updateParticlesZoom();
        }
        if (
            this.upgrades.conceptionIntervalMs > 0 &&
            this.now - this.lastConceptionTime > this.upgrades.conceptionIntervalMs
        ) {
            console.log("Immaculate conception occurred");
            let activePixelBody = this.activePixelBody;
            let pixelBodyCoords = new Vector(
                Math.random() * activePixelBody.layer.width,
                Math.random() * activePixelBody.layer.height
            );
            let closestSurfacePixel = activePixelBody.getClosestSurfacePixel(pixelBodyCoords);
            if (closestSurfacePixel) {
                this.spawn(closestSurfacePixel.position, true);
            }

            this.lastConceptionTime = this.now;
        }

        this.layer.getContext().fillStyle = "white";
        this.layer.getContext().fillRect(0, 0, this.width, this.height);

        // Active pixel body.
        let pixelBody = this.activePixelBody;
        if (pixelBody) {
            pixelBody.update(elapsedMs);
            this.layer.getContext().drawImage(
                pixelBody.layer.canvas,
                0, // source x
                0, // source y
                pixelBody.layer.width, // source width
                pixelBody.layer.height, // source height
                this.activePixelBodyPosition.x, // destination x
                this.activePixelBodyPosition.y, // destination y
                pixelBody.layer.width * this.zoomLevel, // destination width
                pixelBody.layer.height * this.zoomLevel // destination height
            );
        }

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
                this.activePixelBodyPosition.x +
                    (Math.round(littleGuy.positionInPixelBodySpace.x) - littleGuy.center.x) *
                        this.zoomLevel, // destination x
                this.activePixelBodyPosition.y +
                    (Math.round(littleGuy.positionInPixelBodySpace.y) - littleGuy.center.y) *
                        this.zoomLevel, // destination y
                littleGuy.layer.width * this.zoomLevel, // destination width
                littleGuy.layer.height * this.zoomLevel // destination height
            );
        }

        // Hourglass
        if (this.hourglass.initialized) {
            this.hourglass.update(elapsedMs);
            this.layer.getContext().drawImage(
                this.hourglass.layer.canvas,
                0, // source x
                0, // source y
                this.hourglass.layer.width, // source width
                this.hourglass.layer.height, // source height
                0, // destination x
                0, // destination y
                this.hourglass.layer.width * this.zoomLevel, // destination width
                this.hourglass.layer.height * this.zoomLevel // destination height
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
                // The particles layer shares the same size as the main canvas, so no need to
                // translate.
                0, // destination x
                0, // destination y
                this.particles.layer.width * this.zoomLevel, // destination width
                this.particles.layer.height * this.zoomLevel // destination height
            );
        }
    }
}
