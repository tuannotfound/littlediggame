import PixelType from "../diggables/pixel_type.js";
import Vector from "../vector.js";

export default class Bot {
    TARGET_FPS = 1;
    GAME_SPEED = 5;
    FRAME_INTERVAL = 1000 / this.TARGET_FPS;
    TAG = "[BOT] ";
    SPAWN_MAX = 250;

    constructor(game) {
        this.game = game;
        this.events = [];
        this.running = false;
        this.now = 0;
        this.then = 0;

        this.startTimeMillis = 0;

        this.peakAspis = 0;
        this.mostRecentUpgrade = "";
        this.lastUpgradeTimestamp = 0;
    }

    start() {
        if (this.running) {
            return;
        }
        console.log(this.TAG + "Starting bot");
        this.startTimeMillis = performance.now();
        this.running = true;
        this.game.gameSpeed = this.GAME_SPEED;
        this.then = performance.now();
        this.tick(this.then);
    }

    stop() {
        if (!this.running) {
            return;
        }
        console.log(this.TAG + "Stopping bot");
        this.running = false;
        this.game.particles.particles = [];
        this.game.gameSpeed = 1;
        this.triggerCsvDownload(
            this.generateCsv(),
            "planeteater_bot_" + this.getDateTimeForFileName() + ".csv"
        );
        this.events = [];
        this.peakAspis = 0;
        this.mostRecentUpgrade = "";
    }

    generateCsv() {
        let csvData = [];
        csvData.push(Event.getHeaders());
        for (const event of this.events) {
            csvData.push(event.asRow());
        }
        return csvData
            .map((row) =>
                row
                    .map(String)
                    .map((v) => v.replaceAll('"', '""'))
                    .map((v) => `"${v}"`)
                    .join(",")
            )
            .join("\r\n");
    }

    getDateTimeForFileName() {
        const now = new Date();

        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");

        return `${day}-${month}-${year}_${hours}h${minutes}m${seconds}s`;
    }

    triggerCsvDownload(content, filename) {
        // Create a blob
        var blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
        var url = URL.createObjectURL(blob);

        // Create a link to download it
        var pom = document.createElement("a");
        pom.href = url;
        pom.setAttribute("download", filename);
        pom.click();
    }

    tick(newtime) {
        if (!this.running) {
            return;
        }
        requestAnimationFrame(this.tick.bind(this));
        this.now = newtime;
        let elapsed = this.now - this.then;

        if (elapsed <= this.FRAME_INTERVAL) {
            return;
        }
        this.then = this.now - (elapsed % this.FRAME_INTERVAL);
        this.maybeBuyUpgrade();
        this.maybeSpawnLittleGuy();
        this.recordState();
        if (this.game.aspis > this.peakAspis) {
            this.peakAspis = this.game.aspis;
        }
        if (!this.game.activePixelBody || this.game.activePixelBody.health == 0) {
            this.stop();
        }
    }

    maybeSpawnLittleGuy() {
        if (!this.game.activePixelBody) {
            return;
        }
        let expectedValue = this.calculateExpectedValueOfLittleGuy();
        while (this.shouldSpawn(expectedValue)) {
            let coords = new Vector(
                Math.random() * this.game.activePixelBody.layer.width - 1,
                Math.random() * this.game.activePixelBody.layer.height - 1
            );
            let closestSurfacePixel = this.game.activePixelBody.getClosestSurfacePixel(coords);
            if (!closestSurfacePixel) {
                return;
            }
            console.log(
                this.TAG +
                    "Spawning little guy at " +
                    closestSurfacePixel.position.toString() +
                    " for " +
                    this.game.spawnCost +
                    " aspis w/ EV of " +
                    expectedValue
            );
            this.game.spawn(closestSurfacePixel.position, false);
        }
    }

    shouldSpawn(expectedValue) {
        if (this.game.littleGuys.length >= this.SPAWN_MAX) {
            return false;
        }
        if (this.game.spawnCost == 0) {
            return true;
        }
        if (this.game.aspis < this.game.spawnCost) {
            return false;
        }

        return 0.75 * expectedValue > this.game.spawnCost;
    }

    maybeBuyUpgrade() {
        let cheapestUpgrade = this.findCheapestUpgrade();
        if (cheapestUpgrade) {
            if (cheapestUpgrade.cost < this.game.aspis) {
                let buyBtn = document.querySelector("button#" + cheapestUpgrade.id);
                if (buyBtn) {
                    console.log(
                        this.TAG +
                            "Purchasing " +
                            cheapestUpgrade.id +
                            " for " +
                            cheapestUpgrade.cost +
                            " aspis"
                    );
                    buyBtn.click();
                    this.mostRecentUpgrade = cheapestUpgrade.id;
                    this.lastUpgradeTimestamp = performance.now();
                }
            }
        }
    }

    recordState() {
        let manualLittleGuyCount = this.game.littleGuys.filter((lg) => !lg.immaculate).length;
        let autoLittleGuyCount = this.game.littleGuys.length - manualLittleGuyCount;
        let timeSinceLastUpgradeMs =
            (performance.now() - this.lastUpgradeTimestamp) * this.GAME_SPEED;
        let event = new Event(
            // In minutes
            ((performance.now() - this.startTimeMillis) * this.GAME_SPEED) / (1000 * 60),
            this.game.aspis,
            this.peakAspis,
            manualLittleGuyCount,
            autoLittleGuyCount,
            this.calculateExpectedValueOfLittleGuy(),
            this.game.activePixelBody ? this.game.activePixelBody.health : 0,
            this.game.upgrades,
            this.findCheapestUpgrade(),
            this.mostRecentUpgrade,
            timeSinceLastUpgradeMs / (1000 * 60)
        );
        this.events.push(event);
    }

    findCheapestUpgrade() {
        let cheapestUpgrade = null;
        for (const upgrade of this.game.upgrades.upgradeTree.values()) {
            if (!upgrade.unlocked || upgrade.purchased) {
                continue;
            }
            if (!cheapestUpgrade) {
                cheapestUpgrade = upgrade;
            } else if (upgrade.cost < cheapestUpgrade.cost) {
                cheapestUpgrade = upgrade;
            }
        }
        return cheapestUpgrade;
    }

    calculateExpectedValueOfLittleGuy() {
        if (!this.game.activePixelBody) {
            return 0;
        }
        // Looking at the surface of the planet, we can average out the value of each pixel and
        // multiply that by the number of digs each little guy will perform to get the EV of
        // spawning a new little guy.
        let surface = this.game.activePixelBody.surfacePixels;
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
            if (pixelType == PixelType.GOLD && !this.game.upgrades.unlockGold) {
                pixelType = PixelType.DIRT;
            } else if (pixelType == PixelType.DIAMOND && !this.game.upgrades.unlockDiamonds) {
                pixelType = PixelType.DIRT;
            } else if (pixelType == PixelType.EGG && !this.game.upgrades.eggHandling) {
                // Can't dig this yet, so it effectively contributes 0 value.
                continue;
            }
            totalValue += this.game.upgrades.aspisPer[pixelType.name];
        }
        let avgValue = totalValue / surface.length;
        let expectedValue = avgValue * this.game.upgrades.digCount;
        return Math.round(100 * expectedValue) / 100;
    }
}

class Event {
    constructor(
        timestampMinutes,
        aspis,
        peakAspis,
        manualLittleGuyCount,
        autoLittleGuyCount,
        littleGuyEv,
        activePixelBodyHealth,
        upgrades,
        cheapestUpgrade,
        mostRecentUpgrade,
        timeSinceLastUpgradeMinutes
    ) {
        this.timestampMinutes = timestampMinutes;
        this.aspis = aspis;
        this.peakAspis = peakAspis;
        this.manualLittleGuyCount = manualLittleGuyCount;
        this.autoLittleGuyCount = autoLittleGuyCount;
        this.littleGuyEv = littleGuyEv;

        this.activePixelBodyHealth = activePixelBodyHealth;

        this.setUpgradeState(upgrades);
        this.cheapestUpgradeCost = cheapestUpgrade ? cheapestUpgrade.cost : 0;
        this.progressToNextUpgrade = cheapestUpgrade
            ? Math.min(100, (100 * this.aspis) / cheapestUpgrade.cost)
            : 100;
        this.mostRecentUpgrade = mostRecentUpgrade;
        this.timeSinceLastUpgradeMinutes = timeSinceLastUpgradeMinutes;
    }

    setUpgradeState(upgrades) {
        this.upgradeCount = 0;
        for (const upgrade of upgrades.upgradeTree.values()) {
            if (upgrade.purchased) {
                this.upgradeCount++;
            }
        }
        this.aspisPerDirt = upgrades.aspisPer[PixelType.DIRT.name];
        this.aspisPerTombstone = upgrades.aspisPer[PixelType.TOMBSTONE.name];
        this.aspisPerGold = upgrades.unlockGold ? upgrades.aspisPer[PixelType.GOLD.name] : 0;
        this.aspisPerDiamond = upgrades.unlockDiamonds
            ? upgrades.aspisPer[PixelType.DIAMOND.name]
            : 0;
        this.populationPowerScale = upgrades.populationPowerScale;
        this.conceptionIntervalMs = upgrades.conceptionIntervalMs;
        this.digSpeed = upgrades.digSpeed;
        this.digCount = upgrades.digCount;
        this.freeWorkerCount = upgrades.freeWorkerCount;
    }

    static getHeaders() {
        return [
            "timestampMinutes",
            "aspis",
            "peakAspis",
            "manualLittleGuyCount",
            "autoLittleGuyCount",
            "littleGuyEv",
            "activePixelBodyHealth",
            "upgradeCount",
            "cheapestUpgradeCost",
            "progressToNextUpgrade",
            "mostRecentUpgrade",
            "timeSinceLastUpgradeMinutes",
            "aspisPerDirt",
            "aspisPerTombstone",
            "aspisPerGold",
            "aspisPerDiamond",
            "populationPowerScale",
            "conceptionIntervalMs",
            "digSpeed",
            "digCount",
            "freeWorkerCount",
        ];
    }

    asRow() {
        let data = [];
        data.push(this.timestampMinutes.toFixed(2));
        data.push(this.aspis);
        data.push(this.peakAspis);
        data.push(this.manualLittleGuyCount);
        data.push(this.autoLittleGuyCount);
        data.push(this.littleGuyEv);
        data.push(this.activePixelBodyHealth);
        data.push(this.upgradeCount);
        data.push(this.cheapestUpgradeCost);
        data.push(this.progressToNextUpgrade);
        data.push(this.mostRecentUpgrade);
        data.push(this.timeSinceLastUpgradeMinutes);
        data.push(this.aspisPerDirt);
        data.push(this.aspisPerTombstone);
        data.push(this.aspisPerGold);
        data.push(this.aspisPerDiamond);
        data.push(this.populationPowerScale);
        data.push(this.conceptionIntervalMs);
        data.push(this.digSpeed);
        data.push(this.digCount);
        data.push(this.freeWorkerCount);
        return data;
    }
}
