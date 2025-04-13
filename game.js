import Layer from "./layer.js";
import Vector from "./vector.js";
import PerfStats from "stats.js";
import CircularPlanet from "./pixel_bodies/circular_planet.js";
import SwissPlanet from "./pixel_bodies/swiss_planet.js";
import SpikyPlanet from "./pixel_bodies/spiky_planet.js";
import EggPlanet from "./pixel_bodies/egg_planet.js";
import LittleGuy from "./little_guy.js";
import Upgrades from "./upgrades.js";
import MathExtras from "./math_extras.js";
import SaveLoad from "./save_load.js";
import UpgradesUi from "./upgrades_ui.js";
import Pixel from "./diggables/pixel.js";
import PixelType from "./diggables/pixel_type.js";
import Particles from "./particles.js";
import Color from "./color.js";
import Serpent from "./pixel_bodies/serpent.js";
import Hourglass from "./hourglass.js";
import GameState from "./game_state.js";
import Sky from "./sky.js";
import PixelConstants from "./diggables/constants.js";
import Story from "./story.js";
import Dialogs from "./dialogs.js";
import GameOverArt from "./game_over_art.js";
import Stats from "./stats.js";

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
    GAME_OVER_ZOOM_DURATION_MS = 1000 * 20;
    FINAL_LEVEL_DURATION_MINUTES = 3;
    MAX_LITTLE_GUYS = 200;

    constructor(windowWidth, windowHeight, pixelBodies, upgrades) {
        this.width = 0;
        this.height = 0;
        this.zoomLevel = 1;
        this.zoomLevelSrc = 1;
        this.zoomLevelDst = 1;
        this.zoomElapsedMs = 0;
        this.bounds = new Vector();
        this.layer = null;
        this.sky = new Sky();
        this.upgrades = upgrades ? upgrades : new Upgrades();
        if (pixelBodies == null) {
            this.pixelBodies = [];
            this.pixelBodies.push(new CircularPlanet(7));
            this.pixelBodies.push(new SwissPlanet(13));
            this.pixelBodies.push(new SpikyPlanet(22));
            this.pixelBodies.push(new EggPlanet(35));
            this.pixelBodies.push(new Serpent(140, 84));
        } else {
            this.pixelBodies = pixelBodies;
        }
        this.activePixelBodyPosition = new Vector();
        // Maps elements => listener functions.
        this.clickListenerMap = new Map();
        // Sets 'this' width, height, zoom, and bounds.
        this.onResize(windowWidth, windowHeight);

        // Unset or derived from ctor args
        this.now = 0;
        this.then = 0;
        this.upgradesUi = new UpgradesUi();
        this.gameSpeed = 1;

        this.stats = new Stats();

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
        this.spawningAllowed = true;

        this.particles = new Particles(
            this.layer.width / this.zoomLevel,
            this.layer.height / this.zoomLevel
        );
        this.hourglass = new Hourglass(27, 70, this.FINAL_LEVEL_DURATION_MINUTES * 60);
        this.hourglassPosition = new Vector();

        this.gameOverArt = new GameOverArt();

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

        this.workerEv = 0;

        this.lastConceptionTime = 0;

        this.perfStats = new PerfStats();
        this.perfStats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
        this.perfStats.dom.style.left = "90%";
        console.log("Appending stats panel");
        document.body.appendChild(this.perfStats.dom);

        this.gameState = GameState.UNINITIALIZED;
        this.lastSaved = -this.MIN_SAVE_INTERVAL_MS;
        this.autoSaveTimeout = null;
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
            spawningAllowed: this.spawningAllowed,
            aspis: this.aspis,
            knowsDeath: this.knowsDeath,
            knowsDirt: this.knowsDirt,
            knowsEggDeath: this.knowsEggDeath,
            story: Story.instance,
            stats: this.stats,
        };
    }

    static fromJSON(json) {
        let upgrades = Upgrades.fromJSON(json.upgrades);
        let pixelBodies = [];
        for (let pixelBodyJson of json.pixelBodies) {
            if (pixelBodyJson.className == CircularPlanet.name) {
                // Covers both plain circular planets and egg planets (who both have the same dirt
                // variant).
                pixelBodies.push(CircularPlanet.fromJSON(pixelBodyJson, upgrades));
            } else if (pixelBodyJson.className == SwissPlanet.name) {
                pixelBodies.push(SwissPlanet.fromJSON(pixelBodyJson, upgrades));
            } else if (pixelBodyJson.className == SpikyPlanet.name) {
                pixelBodies.push(SpikyPlanet.fromJSON(pixelBodyJson, upgrades));
            } else if (pixelBodyJson.className == EggPlanet.name) {
                pixelBodies.push(EggPlanet.fromJSON(pixelBodyJson, upgrades));
            } else if (pixelBodyJson.className == Serpent.name) {
                pixelBodies.push(Serpent.fromJSON(pixelBodyJson, upgrades));
            } else {
                console.error("Unknown pixel body type: " + pixelBodyJson.className);
            }
        }
        let game = new Game(window.innerWidth, window.innerHeight, pixelBodies, upgrades);

        if (game.activePixelBody) {
            for (let littleGuyJson of json.littleGuys) {
                let pixelBeingDug = null;
                if (littleGuyJson.pixelBeingDug) {
                    let pixelBeingDugPosition = Vector.fromJSON(
                        littleGuyJson.pixelBeingDug.position
                    );
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
        }
        game.spawningAllowed = json.spawningAllowed;
        game.aspis = json.aspis;
        game.knowsDeath = json.knowsDeath;
        game.knowsDirt = json.knowsDirt;
        game.knowsEggDeath = json.knowsEggDeath;

        Story.fromJSON(json.story);

        game.stats = Stats.fromJSON(json.stats);

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
        this.notifyResize();
        this.updateActivePixelBodyPosition();
        if (this.activePixelBody) {
            this.activePixelBody.init(this.upgrades);
            this.sky.setColors(this.activePixelBody.skyColors);
        }
        this.sky.init();
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

        this.gameState = GameState.PAUSED;
        this.setPaused(false);

        Story.instance.preload();
        setTimeout(() => {
            Story.instance.showIntro();
        }, 1000);
    }

    addClickEventListener(element, func) {
        if (this.clickListenerMap.has(element)) {
            if (this.clickListenerMap.get(element) == func) {
                return;
            }
        }
        element.addEventListener("click", func);
        this.clickListenerMap.set(element, func);
    }

    initUi() {
        let saveGameBtn = document.getElementById("save_game");
        this.addClickEventListener(saveGameBtn, () => {
            console.log("Saving...");
            if (this.gameState === GameState.RUNNING) {
                this.stats.updateRuntime();
            }
            SaveLoad.save(this);
            console.log("Saved");
        });
        saveGameBtn.removeAttribute("disabled");

        // ----- START Debug buttons -----
        let nextPixelBodyBtn = document.getElementById("next_pixel_body");
        this.addClickEventListener(nextPixelBodyBtn, () => {
            this.goToNextPixelBody();
        });
        let bloodBtn = document.getElementById("blood");
        bloodBtn.addEventListener("change", () => {
            this.blood = bloodBtn.checked;
            console.log("Blood: " + bloodBtn.checked);
        });
        let pauseBtn = document.getElementById("pause_resume");
        this.addClickEventListener(pauseBtn, () => {
            document.getElementById("pause_icon").classList.toggle("hidden");
            document.getElementById("play_icon").classList.toggle("hidden");
            document.getElementById("pause_scrim").classList.toggle("hidden");
            this.setPaused(!GameState.isPaused(this.gameState));
        });

        for (let i = 0; i < 4; i++) {
            let pow = i + 1;
            let val = 10 ** pow;
            let plusBtn = document.getElementById("plus_" + val);
            this.addClickEventListener(plusBtn, () => {
                this.aspis += val;
                this.updateAspis();
            });
        }
        // ----- END Debug buttons -----

        let upgradesContainer = document.getElementById("upgrades_container");
        let showUpgradesBtn = document.getElementById("show_upgrades");
        this.addClickEventListener(showUpgradesBtn, () => {
            console.log("Showing upgrades screen w/ Health: " + this.activePixelBody?.health);
            upgradesContainer.classList.remove("hidden");
            showUpgradesBtn.classList.add("hidden");
            this.upgradesUi.onShown();
            Dialogs.pause();
        });
        let hideUpgradesBtn = document.getElementById("hide_upgrades");
        this.addClickEventListener(hideUpgradesBtn, () => {
            upgradesContainer.classList.add("hidden");
            showUpgradesBtn.classList.remove("hidden");
            this.upgradesUi.onHidden();
            if (!GameState.isPaused(this.gameState)) {
                Dialogs.resume();
            }
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

        document.querySelector("span.dirt").style.color =
            Pixel.ACTIVE_DIRT_TYPE.color.asCssString();
        document.querySelector("span.dirt_surface").style.color =
            Pixel.ACTIVE_DIRT_TYPE.surfaceColor.asCssString();
        document.querySelector("span.tombstone").style.color =
            PixelConstants.TOMBSTONE_COLOR.asCssString();
        document.querySelector("span.gold").style.color = PixelConstants.GOLD_COLOR.asCssString();
        document.querySelector("span.diamond").style.color =
            PixelConstants.DIAMOND_COLOR.asCssString();
        document.querySelector("span.egg").style.color = PixelConstants.EGG_COLOR.asCssString();
        document.querySelector("span.serpent").style.color =
            PixelConstants.SERPENT_COLOR.asCssString();
        this.updateLegend();
    }

    initHandlers() {
        this.addClickEventListener(this.containerElement, this.handleMouseEvent.bind(this), {
            passive: true,
        });
    }

    calculateZoomLevel(width, height) {
        let pixelBody = this.activePixelBody;
        let objectWidth = 0;
        let objectHeight = 0;
        let objectBufferPct = 0;
        let minZoomLevel = 5;
        let roundingFunc = Math.round;
        if (pixelBody) {
            objectWidth = pixelBody.layer.width;
            objectHeight = pixelBody.layer.height;
            objectBufferPct = pixelBody.renderBufferPct;
        } else if (this.gameOverArt.initialized) {
            objectWidth = GameOverArt.SIZE_PX;
            objectHeight = GameOverArt.SIZE_PX;
            objectBufferPct = 0;
            minZoomLevel = 0;
            roundingFunc = (v) => v;
        } else {
            return 1;
        }

        // Add some buffer around the object to ensure we don't cut off the edges.
        let widthMaxZoom = ((1 - objectBufferPct) * width) / objectWidth;
        let heightMaxZoom = ((1 - objectBufferPct) * height) / objectHeight;
        // Limit ourselves by the smallest max zoom.
        let newZoomLevel = roundingFunc(Math.min(widthMaxZoom, heightMaxZoom));
        newZoomLevel = Math.max(newZoomLevel, minZoomLevel);
        console.log("zoom: " + this.zoomLevel + " -> " + newZoomLevel);
        return newZoomLevel;
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
                newHeight
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
        this.notifyResize();
        this.updateActivePixelBodyPosition();
        if (GameState.isPaused(this.gameState) || GameState.isOver(this.gameState)) {
            this.render();
        }
    }

    notifyResize() {
        let newSize = new Vector(this.width / this.zoomLevel, this.height / this.zoomLevel).round();
        if (this.particles) {
            this.particles.onResize(newSize);
        }
        this.sky.onResize(newSize);
        for (const pixelBody of this.pixelBodies) {
            pixelBody.onResize(newSize);
        }
    }

    maybeSave() {
        if (this.gameState == GameState.UNINITIALIZED || GameState.isOver(this.gameState)) {
            return;
        }
        if (this.pixelBodies.length <= 1) {
            // Don't save if we're on the final level or the game is over
            return;
        }
        let now = performance.now();
        if (now - this.lastSaved > this.MIN_SAVE_INTERVAL_MS) {
            if (this.gameState === GameState.RUNNING) {
                this.stats.updateRuntime();
            }
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
        if (!this.autoSaveTimeout && this.gameState === GameState.RUNNING) {
            this.autoSaveTimeout = setTimeout(() => this.maybeSave(), this.AUTO_SAVE_INTERVAL_MS);
        }
    }

    updateActivePixelBodyPosition() {
        let activePixelBody = this.activePixelBody;
        if (!activePixelBody) {
            return;
        }
        this.activePixelBodyPosition.setXY(
            this.width - activePixelBody.layer.width * this.zoomLevel,
            this.height - activePixelBody.layer.height * this.zoomLevel
        );
        // Centered
        this.activePixelBodyPosition.div(2);

        // This makes this method poorly named, but going to update the hourglass position here too
        // because nobody can stop me.
        if (this.hourglass && this.hourglass.initialized) {
            this.hourglassPosition.setXY(
                this.width - this.hourglass.layer.width * this.zoomLevel,
                this.height - this.hourglass.layer.height * this.zoomLevel
            );
            // Centered
            this.hourglassPosition.div(2);
            this.hourglassPosition.round();
        }

        if (this.zoomLevel == this.zoomLevelDst) {
            // Only round once we've reached the target zoom level, otherwise the zoom is very
            // jittery as the center position gets shifted around a handful of pixels.
            this.activePixelBodyPosition.x = MathExtras.floorToNearest(
                this.zoomLevel,
                this.activePixelBodyPosition.x
            );
            this.activePixelBodyPosition.y = MathExtras.floorToNearest(
                this.zoomLevel,
                this.activePixelBodyPosition.y
            );

            if (this.hourglass && this.hourglass.initialized) {
                this.hourglassPosition.x = MathExtras.floorToNearest(
                    this.zoomLevel,
                    this.hourglassPosition.x
                );
                this.hourglassPosition.y = MathExtras.floorToNearest(
                    this.zoomLevel,
                    this.hourglassPosition.y
                );
            }
        }
    }

    onDigComplete(pixel) {
        this.stats.recordDig();
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
        this.updateExpectedValue();

        if (this.upgrades.unlockDiamonds && pixel.type == PixelType.DIAMOND) {
            Story.instance.maybeFirstDiamond();
        }

        let body = this.activePixelBody;
        if (body) {
            if (body.className == CircularPlanet.name) {
                Story.instance.maybeHalfway(body.health);
            } else if (body.className == SpikyPlanet.name) {
                Story.instance.maybeDeathOfForeman(body.health);
            } else if (body.className == EggPlanet.name) {
                Story.instance.maybeEggPlanet1(body.health);
                Story.instance.maybeEggPlanet2(body.health);
                Story.instance.maybeEggPlanet3(body.health);
                Story.instance.maybeEggPlanet4(body.health);
                Story.instance.maybeEggPlanet5(body.health);
                if (Story.instance.maybeEggReveal1(body.eggReveal)) {
                    this.sky.setColors(
                        body.altSkyColors,
                        Sky.DEFAULT_TRANSITION_DURATION_FRAMES * 2
                    );
                }
                Story.instance.maybeEggReveal2(body.eggReveal);

                if (body.eggReveal > 0 && body.isOnlyEggRemaining()) {
                    this.upgrades.getUpgrade(Upgrades.PROGRESS_GATE_ID_2).purchase();
                }
            } else if (body.className == Serpent.name) {
                Story.instance.maybeSerpent1(body.health);
                Story.instance.maybeSerpent2(body.health);
                Story.instance.maybeSerpent3(body.health);
                Story.instance.maybeSerpent4(body.health);
                Story.instance.maybeSerpent5(body.health);
                Story.instance.maybeSerpent6(body.health);
            }
        }

        this.maybeSave();
    }

    pixelBodyToParticleSpace(planetCoords) {
        if (!this.activePixelBody) {
            return new Vector();
        }
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
            if (!upgrade.purchasable) {
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
            Story.instance.maybeIntroduceResearch();
        } else {
            this.availableUpgradeCount.classList.add("hidden");
        }
    }

    updateHealth() {
        let body = this.activePixelBody;
        if (!body) {
            return;
        }
        if (body.health <= 0) {
            if (!this.goToNextPixelBody()) {
                this.endGame(true);
                return;
            }
            body = this.activePixelBody;
        }
        this.healthElement.innerHTML = (100 * body.health).toFixed(1);
    }

    goToNextPixelBody() {
        let previousPixelBody = this.pixelBodies.shift();
        if (previousPixelBody) {
            previousPixelBody.destroy();
        }
        for (const littleGuy of [...this.littleGuys]) {
            littleGuy.setInactive();
        }
        if (this.littleGuys.length > 0) {
            console.error(
                "Somehow there are still little guys after the pixel body has been destroyed."
            );
            this.stats.recordDeaths(this.littleGuys.length);
            // Hopefully this won't cause problems...
            this.littleGuys = [];
        }
        if (this.pixelBodies.length == 0 || this.activePixelBody == null) {
            return false;
        }
        this.activePixelBody.init(this.upgrades);
        this.zoomElapsedMs = 0;
        this.notifyResize();
        this.updateActivePixelBodyPosition();
        if (this.activePixelBody.className == Serpent.name) {
            // Swap out the planet icon for the serpent
            document.getElementById("planet_icon").classList.add("hidden");
            document.getElementById("serpent_icon").classList.remove("hidden");
            // Initialize the hourglass
            this.hourglass.init(this.finalLevelLost.bind(this));
            // Save once and then prevent further saving.
            this.maybeSave();
            let saveGameBtn = document.getElementById("save_game");
            saveGameBtn.setAttribute("disabled", "");
            // Hide the legend
            document.getElementById("legend").classList.add("hidden");
            document.getElementById("info_container").classList.add("dark");
        } else {
            // Zooming from the current (zoomed in) point to a more zoomed out point looks kinda goofy,
            // so just have the planet come into view as if we're zooming towards it instead.
            // Just don't do this for the serpent since it's supposed to emerge from an egg.
            this.zoomLevel = 1;
            document.querySelector("span.dirt").style.color =
                Pixel.ACTIVE_DIRT_TYPE.color.asCssString();
            document.querySelector("span.dirt_surface").style.color =
                Pixel.ACTIVE_DIRT_TYPE.surfaceColor.asCssString();
        }
        this.sky.setColors(this.activePixelBody.skyColors);
        this.zoomLevelSrc = this.zoomLevel;
        this.zoomLevelDst = this.calculateZoomLevel(this.width, this.height);

        this.updateActivePixelBodyPosition();

        if (this.activePixelBody.className == SwissPlanet.name) {
            setTimeout(() => {
                Story.instance.onSwissPlanet();
            }, 500);
        } else if (this.activePixelBody.className == SpikyPlanet.name) {
            setTimeout(() => {
                Story.instance.onSpikyPlanet();
            }, 500);
        } else if (this.activePixelBody.className == EggPlanet.name) {
            setTimeout(() => {
                Story.instance.onEggPlanet();
                this.upgrades.getUpgrade(Upgrades.PROGRESS_GATE_ID_1).purchase();
            }, 500);
        } else if (this.activePixelBody.className == Serpent.name) {
            setTimeout(() => {
                Story.instance.onSerpent();
            }, 250);
        }
        return true;
    }

    finalLevelLost() {
        if (!this.activePixelBody || this.activePixelBody.className != Serpent.name) {
            console.error("Not sure how we got here...");
            this.endGame(false);
            return;
        }
        this.activePixelBody.letLoose(this.onSerpentLoose.bind(this));
        this.spawningAllowed = false;
        // Kill all little guys
        this.blood = true;
        for (const littleGuy of this.littleGuys) {
            setTimeout(() => littleGuy.die(), MathExtras.randomBetween(0, 2000));
        }
    }

    onSerpentLoose() {
        // There is no next pixel body, so it will be null after this.
        this.goToNextPixelBody();
        this.endGame(false);
    }

    endGame(won) {
        this.stats.updateRuntime();
        Story.instance.onGameOver(won, () => {
            let showUpgradesBtn = document.getElementById("show_upgrades");
            showUpgradesBtn.classList.add("hidden");
            let infoContainer = document.getElementById("info_container");
            infoContainer.classList.add("hidden");
            let pauseBtn = document.getElementById("pause_resume");
            pauseBtn.setAttribute("disabled", "");
            this.showGameOverScreen(won);
        });
    }

    showGameOverScreen(won) {
        // Stop rendering the hourglass.
        this.hourglass.initialized = false;
        this.gameOverArt.initialize(won, () => {
            this.zoomLevel = 200;
            this.zoomLevelSrc = this.zoomLevel;
            this.zoomLevelDst = this.calculateZoomLevel(this.width, this.height);
        });
    }

    endGameForRealForReal(won) {
        this.gameState = won ? GameState.WON : GameState.LOST;
        Story.instance.thanks(this.stats, Math.round(this.upgrades.karma));
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

    handleMouseEvent(event) {
        if (event.button != 0 || GameState.isPaused(this.gameState)) {
            return;
        }

        const gameCoords = new Vector(event.offsetX, event.offsetY);
        const activeBodyCoords = this.gameToActiveBodyCoords(gameCoords);
        if (window.DEBUG) {
            console.log(
                "Translating mouse click @ " +
                    gameCoords.toString() +
                    " to " +
                    activeBodyCoords.toString()
            );
        }
        if (!this.activePixelBody) {
            return;
        }
        this.stats.recordClick();
        const closestSurfacePixel = this.activePixelBody.getClosestSurfacePixel(activeBodyCoords);
        if (!closestSurfacePixel) {
            return;
        }
        this.spawn(closestSurfacePixel.position, false);

        if (Math.random() < this.upgrades.extraLittleGuyChance) {
            const randomSurfacePixel = this.activePixelBody.getRandomSurfacePixel();
            if (!randomSurfacePixel) {
                return;
            }
            this.spawn(randomSurfacePixel.position, true);
        }
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
        if (!this.spawningAllowed) {
            return;
        }
        if (!immaculate) {
            if (this.spawnCost > this.aspis) {
                this.startNotEnoughAspisAnimation([this.spawnCostElement.parentElement]);
                return;
            }
            this.stopNotEnoughAspisAnimation([this.spawnCostElement.parentElement]);
        }
        if (this.littleGuys.length >= this.MAX_LITTLE_GUYS) {
            if (!immaculate) {
                this.startAnimation(
                    [this.littleGuyCountElement.parentElement],
                    this.PULSE_ANIMATION_NAME,
                    this.PULSE_ANIMATION_DURATION_MS
                );
                return;
            }
            this.stopAnimation(
                [this.littleGuyCountElement.parentElement],
                this.PULSE_ANIMATION_NAME
            );
        }

        if (!this.activePixelBody) {
            return;
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
        this.updateExpectedValue();
    }

    updateExpectedValue() {
        if (!this.upgrades.showWorkerEV) {
            return;
        }
        const evContainer = document.getElementById("worker_ev_container");
        if (evContainer.classList.contains("hidden")) {
            evContainer.classList.remove("hidden");
        }
        const evSpan = document.getElementById("worker_ev");
        this.workerEv = Math.round(this.calculateExpectedValue());
        evSpan.innerHTML = this.workerEv;
    }

    calculateExpectedValue() {
        const body = this.activePixelBody;
        if (!body) {
            return 0;
        }
        // Looking at the surface of the planet, we can average out the value of each pixel and
        // multiply that by the number of digs each little guy will perform to get an estimate of
        // the EV of spawning a new little guy.
        const surface = body.surfacePixels;
        if (surface.length == 0) {
            return 0;
        }
        let totalValue = 0;
        for (let i = 0; i < surface.length; i++) {
            let surfacePixel = surface[i];
            if (!surfacePixel) {
                continue;
            }
            let pixelType = surfacePixel.type;
            if (pixelType == PixelType.GOLD && !this.upgrades.unlockGold) {
                pixelType = PixelType.DIRT;
            } else if (pixelType == PixelType.DIAMOND && !this.upgrades.unlockDiamonds) {
                pixelType = PixelType.DIRT;
            } else if (pixelType == PixelType.EGG && !this.upgrades.eggHandling) {
                // Can't dig this yet, so it effectively contributes 0 value.
                continue;
            }
            totalValue += this.upgrades.aspisPer[pixelType.name];
        }
        const avgValue = totalValue / surface.length;
        const expectedValue = avgValue * this.upgrades.digCount;
        return expectedValue;
    }

    // Center is in planet space
    bloodyAround(center) {
        if (!this.blood) {
            return;
        }
        this.particles.bloodEffect(this.pixelBodyToParticleSpace(center));
        if (!this.activePixelBody) {
            return;
        }
        const radius = Math.round(MathExtras.randomBetween(2, 4));
        for (let x = center.x - radius; x < center.x + radius; x++) {
            for (let y = center.y - radius; y < center.y + radius; y++) {
                const dist = new Vector(center.x - x, center.y - y).mag();
                if (dist > radius) {
                    continue;
                }
                const pixel = this.activePixelBody.getPixel(new Vector(x, y));
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
        Story.instance.maybeForemansSonDead();
        if (this.upgrades.afterlife) {
            if (littleGuy.saintly) {
                this.upgrades.updateKarma(1);
            } else {
                this.upgrades.updateKarma(-1);
            }
            this.aspis += this.upgrades.aspisPer[PixelType.TOMBSTONE.name];
            this.updateAspis();
        }
        if (this.upgrades.aspisOnDeathAsEvRate > 0) {
            this.aspis += this.workerEv * this.upgrades.aspisOnDeathAsEvRate;
            this.updateAspis();
        }
        if (littleGuy.deathByEgg) {
            this.knowsEggDeath = true;
            this.particles.fireEffect(
                this.pixelBodyToParticleSpace(littleGuy.positionInPixelBodySpace)
            );
            this.updateLegend();
        } else if (littleGuy.explosive) {
            this.particles.explosionEffect(
                this.pixelBodyToParticleSpace(littleGuy.positionInPixelBodySpace)
            );
        } else if (littleGuy.deathBySerpent) {
            this.particles.bloodEffect(
                this.pixelBodyToParticleSpace(littleGuy.positionInPixelBodySpace)
            );
        }
        this.bloodyAround(littleGuy);
    }

    handleInactive(littleGuy) {
        this.stats.recordDeath();
        this.littleGuys.splice(this.littleGuys.indexOf(littleGuy), 1);
        this.updateSpawnCost();
    }

    maybeAutoSpawn() {
        let activePixelBody = this.activePixelBody;
        if (!activePixelBody) {
            return;
        }
        if (
            this.upgrades.conceptionIntervalMs > 0 &&
            this.now - this.lastConceptionTime > this.upgrades.conceptionIntervalMs
        ) {
            console.log("Immaculate conception occurred");
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
    }

    setPaused(paused) {
        if (this.gameState == GameState.UNINITIALIZED || GameState.isOver(this.gameState)) {
            return;
        }
        if (GameState.isPaused(this.gameState) == paused) {
            return;
        }
        this.gameState = paused ? GameState.PAUSED : GameState.RUNNING;
        if (!paused) {
            this.then = window.performance.now();
            this.tick(this.then);
            this.stats.resetLastUpdateTime();
            Dialogs.resume();
        } else {
            this.stats.updateRuntime();
            Dialogs.pause();
        }
        this.maybeSave();
    }

    destroy() {
        // No real need for any of this ever since removing the new/load game buttons when the game
        // is started.
        this.setPaused(true);
        Dialogs.clearAll();
        let hideUpgradesBtn = document.getElementById("hide_upgrades");
        if (!hideUpgradesBtn.classList.contains("hidden")) {
            hideUpgradesBtn.click();
        }
        this.layer.destroy();
        this.upgradesUi.destroy();
        for (const [element, listener] of this.clickListenerMap) {
            element.removeEventListener("click", listener);
        }
        document.body.removeChild(this.perfStats.dom);
    }

    tick(newtime) {
        if (
            GameState.isPaused(this.gameState) ||
            GameState.isOver(this.gameState) ||
            !this.layer.canvas
        ) {
            return;
        }

        requestAnimationFrame(this.tick.bind(this));
        this.now = newtime;
        let elapsedMs = this.now - this.then;

        if (elapsedMs <= this.FRAME_INTERVAL_MS) {
            return;
        }
        this.then = this.now - (elapsedMs % this.FRAME_INTERVAL_MS);

        this.perfStats.begin();
        for (let i = 0; i < this.gameSpeed; i++) {
            this.runUpdate(elapsedMs);
        }
        this.render();
        this.perfStats.end();
    }

    runUpdate(elapsedMs) {
        if (
            Math.abs(this.zoomLevel - this.zoomLevelDst) < 0.01 ||
            this.zoomLevelDst == this.zoomLevelSrc
        ) {
            // Zoom complete
            this.zoomLevel = this.zoomLevelDst;
        } else {
            this.zoomElapsedMs += elapsedMs;
            const durationMs = this.gameOverArt.initialized
                ? this.GAME_OVER_ZOOM_DURATION_MS
                : this.ZOOM_DURATION_MS;
            let zoomProgress = this.zoomElapsedMs / durationMs;
            this.zoomLevel = MathExtras.easeOutCubic(
                this.zoomLevelSrc,
                this.zoomLevelDst,
                zoomProgress
            );
            this.notifyResize();
            this.updateActivePixelBodyPosition();
        }
        this.maybeAutoSpawn();

        this.sky.update();

        if (this.hourglass.initialized) {
            this.hourglass.update(elapsedMs);
        }

        if (this.activePixelBody) {
            this.activePixelBody.update(elapsedMs);
        }

        for (const littleGuy of this.littleGuys) {
            littleGuy.update();
        }

        if (this.gameOverArt.initialized) {
            this.gameOverArt.update();
            if (this.zoomLevel == this.zoomLevelDst) {
                this.endGameForRealForReal(this.gameOverArt.won);
            }
        }

        // Don't do particles on higher game speeds (used for testing only)
        if (this.gameSpeed == 1) {
            this.particles.update();
        }
    }

    render() {
        this.layer.getContext().fillStyle = "white";
        this.layer.getContext().fillRect(0, 0, this.width, this.height);

        if (this.sky.layer?.initialized) {
            this.layer.getContext().drawImage(
                this.sky.layer.canvas,
                0, // source x
                0, // source y
                this.sky.layer.width, // source width
                this.sky.layer.height, // source height
                // The sky layer shares the same size as the main canvas, so no need to
                // translate.
                (-this.sky.layer.width * this.zoomLevel) / 4, // destination x
                0, // destination y
                this.sky.layer.width * this.zoomLevel, // destination width
                this.sky.layer.height * this.zoomLevel // destination height
            );
        }
        if (this.hourglass.layer?.initialized && !this.gameOverArt.layer?.initialized) {
            this.layer.getContext().drawImage(
                this.hourglass.layer.canvas,
                0, // source x
                0, // source y
                this.hourglass.layer.width, // source width
                this.hourglass.layer.height, // source height
                this.hourglassPosition.x, // destination x
                this.hourglassPosition.y, // destination y
                this.hourglass.layer.width * this.zoomLevel, // destination width
                this.hourglass.layer.height * this.zoomLevel // destination height
            );
        }
        let pixelBody = this.activePixelBody;
        if (pixelBody && pixelBody.layer?.initialized) {
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
        for (const littleGuy of this.littleGuys) {
            if (!littleGuy.active || !littleGuy.layer?.initialized) {
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
        if (this.gameOverArt.layer?.initialized) {
            this.layer.getContext().drawImage(
                this.gameOverArt.layer.canvas,
                0, // source x
                0, // source y
                this.gameOverArt.layer.width, // source width
                this.gameOverArt.layer.height, // source height
                (this.layer.width - this.gameOverArt.layer.width * this.zoomLevel) / 2, // destination x
                (this.layer.height - this.gameOverArt.layer.height * this.zoomLevel) / 2, // destination y
                this.gameOverArt.layer.width * this.zoomLevel, // destination width
                this.gameOverArt.layer.height * this.zoomLevel // destination height
            );
        }
        // Render particles last as they go on top of everything else.
        // Don't do particles on higher game speeds (used for testing only).
        if (this.gameSpeed == 1 && this.particles.layer?.initialized) {
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
