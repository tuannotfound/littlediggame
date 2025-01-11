import Upgrade from "./upgrade.js";
import Currency from "./currency.js";
import PixelType from "./pixel_type.js";

export default class Upgrades {
    constructor() {
        // Pct pts increase per frame towards a complete dig.
        this.digSpeed = 0.5;
        this.digCount = 2;
        this.goldPer = {};
        this.goldPer[PixelType.DIRT.name] = 1;
        this.goldPer[PixelType.GOLD.name] = 10;
        this.goldPer[PixelType.TOMBSTONE.name] = 0;
        this.goldPer[PixelType.DIAMOND.name] = 200;
        this.diamonds = false;
        this.populationPowerScale = 2;
        this.goldSeeker = false;
        this.religion = false;
        this.afterlife = false;
        this.heavenRevealed = false;
        this.hellRevealed = false;
        this.angelAttackIntervalMs = -1;
        this.damnedAttackIntervalMs = -1;
        this.damnedUpgradeCount = 0;
        this.upgradeTree = new Map();
        this.initUpgradeTree();
    }

    initUpgradeTree() {
        // Gold++ tree
        let moreGold1 = new Upgrade(
            "more_gold_1",
            "Elementum amicus",
            "",
            10,
            Currency.GOLD,
            () => {
                this.goldPer[PixelType.DIRT.name] = Math.round(
                    this.goldPer[PixelType.DIRT.name] * 2
                );
                this.goldPer[PixelType.GOLD.name] = Math.round(
                    this.goldPer[PixelType.GOLD.name] * 1.25
                );
            }
        );
        this.upgradeTree.set(moreGold1.id, moreGold1);

        let moreGold2 = new Upgrade(
            "more_gold_2",
            "Elementum tormentis",
            "",
            50,
            Currency.GOLD,
            () => {
                this.goldPer[PixelType.DIRT.name] = Math.round(
                    this.goldPer[PixelType.DIRT.name] * 1.5
                );
                this.goldPer[PixelType.GOLD.name] = Math.round(
                    this.goldPer[PixelType.GOLD.name] * 1.1
                );
            }
        );
        moreGold2.addPrereq(moreGold1);
        this.upgradeTree.set(moreGold2.id, moreGold2);

        let moreGold3 = new Upgrade(
            "more_gold_3",
            "Venereum elementum",
            "",
            200,
            Currency.GOLD,
            () => {
                this.goldPer[PixelType.DIRT.name] = Math.round(
                    this.goldPer[PixelType.DIRT.name] * 0.98
                );
                this.goldPer[PixelType.GOLD.name] = Math.round(
                    this.goldPer[PixelType.GOLD.name] * 0.99
                );
            }
        );
        moreGold3.addPrereq(moreGold2);
        this.upgradeTree.set(moreGold3.id, moreGold3);

        let moreGold4 = new Upgrade(
            "more_gold_4",
            "Nefas directionis",
            "",
            205,
            Currency.GOLD,
            () => {
                this.goldPer[PixelType.DIRT.name] = Math.round(
                    this.goldPer[PixelType.DIRT.name] * 2
                );
                this.goldPer[PixelType.GOLD.name] = Math.round(
                    this.goldPer[PixelType.GOLD.name] * 1.25
                );
            }
        );
        moreGold4.addPrereq(moreGold3);
        this.upgradeTree.set(moreGold4.id, moreGold4);

        let graveDigger1 = new Upgrade(
            "grave_digger_1",
            "Dens cadaver",
            "",
            5,
            Currency.GOLD,
            () => {
                this.goldPer[PixelType.TOMBSTONE.name] = 1;
            }
        );
        graveDigger1.addPrereq(moreGold1);
        this.upgradeTree.set(graveDigger1.id, graveDigger1);

        let graveDigger2 = new Upgrade(
            "grave_digger_2",
            "Sepulchri furem",
            "",
            35,
            Currency.GOLD,
            () => {
                this.goldPer[PixelType.TOMBSTONE.name] = 5;
            }
        );
        graveDigger2.addPrereq(graveDigger1);
        this.upgradeTree.set(graveDigger2.id, graveDigger2);

        let diamonds = new Upgrade("diamonds", "Scintillare lapis", "", 150, Currency.GOLD, () => {
            this.diamonds = true;
        });
        this.upgradeTree.set(diamonds.id, diamonds);

        let diamondDeals = new Upgrade(
            "diamond_deals",
            "Mercator pulchra",
            "",
            300,
            Currency.GOLD,
            () => {
                this.goldPer[PixelType.DIAMOND.name] = Math.round(
                    this.goldPer[PixelType.DIAMOND.name] * 3.5
                );
            }
        );
        diamondDeals.addPrereq(diamonds);
        this.upgradeTree.set(diamondDeals.id, diamondDeals);

        let bloodDiamonds = new Upgrade(
            "blood_diamonds",
            "Prodita sanguine",
            "",
            30,
            Currency.GOLD,
            () => {
                this.goldPer[PixelType.DIAMOND.name] = Math.round(
                    this.goldPer[PixelType.DIAMOND.name] * 1.03
                );
            }
        );
        bloodDiamonds.addPrereq(diamondDeals);
        this.upgradeTree.set(bloodDiamonds.id, bloodDiamonds);

        let goldSeeker = new Upgrade(
            "gold_seeker",
            "Thesaurum sub pede",
            "",
            75,
            Currency.GOLD,
            () => {
                this.goldSeeker = true;
            }
        );
        goldSeeker.addPrereq(diamonds);
        this.upgradeTree.set(goldSeeker.id, goldSeeker);

        // Digging++ tree
        let digSpeed1 = new Upgrade("dig_speed_1", "Duplex trulla", "", 10, Currency.GOLD, () => {
            this.digSpeed *= 2;
        });
        this.upgradeTree.set(digSpeed1.id, digSpeed1);

        let digSpeed2 = new Upgrade(
            "dig_speed_2",
            "Factum est iterum",
            "",
            40,
            Currency.GOLD,
            () => {
                this.digSpeed *= 1.5;
            }
        );
        digSpeed2.addPrereq(digSpeed1);
        this.upgradeTree.set(digSpeed2.id, digSpeed2);

        let digSpeed3 = new Upgrade("dig_speed_3", "Non potest esse", "", 80, Currency.GOLD, () => {
            this.digSpeed *= 1.25;
        });
        digSpeed3.addPrereq(digSpeed2);
        this.upgradeTree.set(digSpeed3.id, digSpeed3);

        let digSpeed4 = new Upgrade("dig_speed_4", "Nimis longe", "", 200, Currency.GOLD, () => {
            this.digSpeed *= 2;
        });
        digSpeed4.addPrereq(digSpeed3);
        this.upgradeTree.set(digSpeed4.id, digSpeed4);

        let digCount1 = new Upgrade(
            "dig_count_1",
            "Salutem et incolumitatem",
            "",
            30,
            Currency.GOLD,
            () => {
                this.digCount++;
            }
        );
        this.upgradeTree.set(digCount1.id, digCount1);

        let digCount2 = new Upgrade(
            "dig_count_2",
            "Salus et sanitas",
            "",
            100,
            Currency.GOLD,
            () => {
                this.digCount++;
            }
        );
        digCount2.addPrereq(digCount1);
        this.upgradeTree.set(digCount2.id, digCount2);

        let digCount3 = new Upgrade(
            "dig_count_3",
            "Ferro pollicem tabernus",
            "",
            350,
            Currency.GOLD,
            () => {
                this.digCount += 2;
            }
        );
        digCount3.addPrereq(digCount2);
        this.upgradeTree.set(digCount3.id, digCount3);

        let pop1 = new Upgrade("pop_1", "Opus insumptuosus", "", 20, Currency.GOLD, () => {
            this.populationPowerScale = 1.75;
        });
        this.upgradeTree.set(pop1.id, pop1);

        let pop2 = new Upgrade("pop_2", "pop_2_tbd", "", 100, Currency.GOLD, () => {
            this.populationPowerScale = 1.5;
        });
        pop2.addPrereq(pop1);
        this.upgradeTree.set(pop2.id, pop2);

        let pop3 = new Upgrade("pop_3", "pop_3_tbd", "", 250, Currency.GOLD, () => {
            this.populationPowerScale = 1.25;
        });
        pop3.addPrereq(pop2);
        this.upgradeTree.set(pop3.id, pop3);

        let pop4 = new Upgrade("pop_4", "pop_4_tbd", "", 1000, Currency.GOLD, () => {
            this.populationPowerScale = 1;
        });
        pop4.addPrereq(pop3);
        this.upgradeTree.set(pop4.id, pop4);

        let religion = new Upgrade("religion", "Religio", "", 800, Currency.GOLD, () => {
            this.religion = true;
        });
        religion.addPrereq(digSpeed3);
        religion.addPrereq(digCount1);
        this.upgradeTree.set(religion.id, religion);
    }

    static fromJSON(json) {
        // TBD: Make this work with the new upgrade tree.
        let upgrades = new Upgrades();
        Object.assign(upgrades, json);
        return upgrades;
    }
}
