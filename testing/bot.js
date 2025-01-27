import PixelType from "../diggables/pixel_type.js";
import Vector from "../vector.js";

export default class Bot {
    TARGET_FPS = 1;
    GAME_SPEED = 5;
    FRAME_INTERVAL = 1000 / this.TARGET_FPS;
    TAG = "[BOT] ";

    constructor(game) {
        this.game = game;
        this.events = [];
        this.running = false;
        this.now = 0;
        this.then = 0;

        this.peakGold = 0;
        this.mostRecentUpgrade = "";
        this.lastUpgradeTimestamp = 0;
    }

    start() {
        if (this.running) {
            return;
        }
        console.log(this.TAG + "Starting bot");
        this.running = true;
        this.game.gameSpeed = this.GAME_SPEED;
        this.then = window.performance.now();
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
        this.peakGold = 0;
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
        if (this.game.gold > this.peakGold) {
            this.peakGold = this.game.gold;
        }
        if (this.game.planet.health == 0) {
            this.stop();
        }
    }

    maybeSpawnLittleGuy() {
        let expectedValue = this.calculateExpectedValueOfLittleGuy();
        while (this.shouldSpawn(expectedValue)) {
            let coords = new Vector(
                Math.random() * this.game.planet.layer.width - 1,
                Math.random() * this.game.planet.layer.height - 1
            );
            let closestSurfacePixel = this.game.planet.getClosestSurfacePixel(coords);
            if (!closestSurfacePixel) {
                return;
            }
            console.log(
                this.TAG +
                    "Spawning little guy at " +
                    closestSurfacePixel.position.toString() +
                    " for " +
                    this.game.spawnCost +
                    " gold w/ EV of " +
                    expectedValue
            );
            this.game.spawn(closestSurfacePixel.position, false);
        }
    }

    shouldSpawn(expectedValue) {
        if (this.game.spawnCost == 0) {
            return true;
        }
        if (this.game.gold < this.game.spawnCost) {
            return false;
        }

        return 0.75 * expectedValue > this.game.spawnCost;
    }

    maybeBuyUpgrade() {
        let cheapestUpgrade = this.findCheapestUpgrade();
        if (cheapestUpgrade) {
            if (cheapestUpgrade.cost < this.game.gold) {
                let buyBtn = document.querySelector("button#" + cheapestUpgrade.id);
                if (buyBtn) {
                    console.log(
                        this.TAG +
                            "Purchasing " +
                            cheapestUpgrade.id +
                            " for " +
                            cheapestUpgrade.cost +
                            " gold"
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
            (performance.now() * this.GAME_SPEED) / (1000 * 60),
            this.game.gold,
            this.peakGold,
            manualLittleGuyCount,
            autoLittleGuyCount,
            this.calculateExpectedValueOfLittleGuy(),
            this.game.planet.health,
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
        // Looking at the surface of the planet, we can average out the value of each pixel and
        // multiply that by the number of digs each little guy will perform to get the EV of
        // spawning a new little guy.
        let surface = this.game.planet.surfacePixels;
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
            totalValue += this.game.upgrades.goldPer[pixelType.name];
        }
        let avgValue = totalValue / surface.length;
        let expectedValue = avgValue * this.game.upgrades.digCount;
        return Math.round(100 * expectedValue) / 100;
    }
}

class Event {
    constructor(
        timestampMinutes,
        gold,
        peakGold,
        manualLittleGuyCount,
        autoLittleGuyCount,
        littleGuyEv,
        worldHealth,
        upgrades,
        cheapestUpgrade,
        mostRecentUpgrade,
        timeSinceLastUpgradeMinutes
    ) {
        this.timestampMinutes = timestampMinutes;
        this.gold = gold;
        this.peakGold = peakGold;
        this.manualLittleGuyCount = manualLittleGuyCount;
        this.autoLittleGuyCount = autoLittleGuyCount;
        this.littleGuyEv = littleGuyEv;

        this.worldHealth = worldHealth;

        this.setUpgradeState(upgrades);
        this.cheapestUpgradeCost = cheapestUpgrade ? cheapestUpgrade.cost : 0;
        this.progressToNextUpgrade = cheapestUpgrade
            ? Math.min(100, (100 * this.gold) / cheapestUpgrade.cost)
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
        this.goldPerDirt = upgrades.goldPer[PixelType.DIRT.name];
        this.goldPerTombstone = upgrades.goldPer[PixelType.TOMBSTONE.name];
        this.goldPerGold = upgrades.unlockGold ? upgrades.goldPer[PixelType.GOLD.name] : 0;
        this.goldPerDiamond = upgrades.unlockDiamonds
            ? upgrades.goldPer[PixelType.DIAMOND.name]
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
            "gold",
            "peakGold",
            "manualLittleGuyCount",
            "autoLittleGuyCount",
            "littleGuyEv",
            "worldHealth",
            "upgradeCount",
            "cheapestUpgradeCost",
            "progressToNextUpgrade",
            "mostRecentUpgrade",
            "timeSinceLastUpgradeMinutes",
            "goldPerDirt",
            "goldPerTombstone",
            "goldPerGold",
            "goldPerDiamond",
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
        data.push(this.gold);
        data.push(this.peakGold);
        data.push(this.manualLittleGuyCount);
        data.push(this.autoLittleGuyCount);
        data.push(this.littleGuyEv);
        data.push(this.worldHealth);
        data.push(this.upgradeCount);
        data.push(this.cheapestUpgradeCost);
        data.push(this.progressToNextUpgrade);
        data.push(this.mostRecentUpgrade);
        data.push(this.timeSinceLastUpgradeMinutes);
        data.push(this.goldPerDirt);
        data.push(this.goldPerTombstone);
        data.push(this.goldPerGold);
        data.push(this.goldPerDiamond);
        data.push(this.populationPowerScale);
        data.push(this.conceptionIntervalMs);
        data.push(this.digSpeed);
        data.push(this.digCount);
        data.push(this.freeWorkerCount);
        return data;
    }
}
