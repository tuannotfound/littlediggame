import PixelType from "../pixel_type.js";
import Vector from "../vector.js";

export default class Bot {
    TARGET_FPS = 1;
    GAME_SPEED = 2;
    FRAME_INTERVAL = 1000 / this.TARGET_FPS;
    TAG = "[BOT] ";

    constructor(game) {
        this.game = game;
        this.events = [];
        this.running = false;
        this.now = 0;
        this.then = 0;

        this.peakGold = 0;
    }

    start() {
        this.running = true;
        this.game.gameSpeed = this.GAME_SPEED;
        this.then = window.performance.now();
        this.tick(this.then);
    }

    stop() {
        this.running = false;
        this.game.gameSpeed = 1;
        this.triggerCsvDownload(
            this.generateCsv(),
            "planeteater_bot_" + this.getDateTimeForFileName() + ".csv"
        );
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
        while (this.shouldSpawn()) {
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
                    closestSurfacePixel.renderPosition.toString() +
                    " for " +
                    this.game.spawnCost +
                    " gold"
            );
            this.game.spawn(closestSurfacePixel.renderPosition, false);
        }
    }

    shouldSpawn() {
        if (this.game.spawnCost == 0) {
            return true;
        }
        if (this.game.gold < this.game.spawnCost) {
            return false;
        }
        let spawnCostAsPctOfGold = (100 * this.game.spawnCost) / this.game.gold;
        if (this.game.gold < 10 && spawnCostAsPctOfGold < 60) {
            return true;
        } else if (this.game.gold < 50 && spawnCostAsPctOfGold < 40) {
            return true;
        } else if (this.game.gold < 100 && spawnCostAsPctOfGold < 30) {
            return true;
        } else if (this.game.gold < 200 && spawnCostAsPctOfGold < 20) {
            return true;
        } else if (this.game.gold < 500 && spawnCostAsPctOfGold < 10) {
            return true;
        } else if (this.game.gold < 1000 && spawnCostAsPctOfGold < 5) {
            return true;
        } else if (this.game.gold >= 1000 && spawnCostAsPctOfGold <= 5) {
            return true;
        }
        return false;
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
                }
            }
        }
    }

    recordState() {
        let manualLittleGuyCount = this.game.littleGuys.filter((lg) => !lg.immaculate).length;
        let autoLittleGuyCount = this.game.littleGuys.length - manualLittleGuyCount;
        let event = new Event(
            performance.now() / this.GAME_SPEED,
            this.game.gold,
            this.peakGold,
            manualLittleGuyCount,
            autoLittleGuyCount,
            this.game.planet.health,
            this.game.upgrades,
            this.findCheapestUpgrade()
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
}

class Event {
    constructor(
        timestamp,
        gold,
        peakGold,
        manualLittleGuyCount,
        autoLittleGuyCount,
        worldHealth,
        upgrades,
        cheapestUpgrade
    ) {
        this.timestamp = timestamp;
        this.gold = gold;
        this.peakGold = peakGold;
        this.manualLittleGuyCount = manualLittleGuyCount;
        this.autoLittleGuyCount = autoLittleGuyCount;

        this.worldHealth = worldHealth;

        this.setUpgradeState(upgrades);
        this.cheapestUpgradeCost = cheapestUpgrade ? cheapestUpgrade.cost : 0;
        this.progressToNextUpgrade = cheapestUpgrade
            ? Math.min(100, (100 * this.gold) / cheapestUpgrade.cost)
            : 100;
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
        this.goldPerGold = upgrades.unlock_gold ? upgrades.goldPer[PixelType.GOLD.name] : 0;
        this.goldPerDiamond = upgrades.unlock_diamonds
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
            "timestamp",
            "gold",
            "peakGold",
            "manualLittleGuyCount",
            "autoLittleGuyCount",
            "worldHealth",
            "upgradeCount",
            "cheapestUpgradeCost",
            "progressToNextUpgrade",
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
        data.push(this.timestamp.toFixed(2));
        data.push(this.gold);
        data.push(this.peakGold);
        data.push(this.manualLittleGuyCount);
        data.push(this.autoLittleGuyCount);
        data.push(this.worldHealth);
        data.push(this.upgradeCount);
        data.push(this.cheapestUpgradeCost);
        data.push(this.progressToNextUpgrade);
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
