import Upgrade from "./upgrade.js";
import Currency from "./currency.js";
import PixelType from "./pixel_type.js";
import StringUtils from "./string_utils.js";

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
        this.diamondRadar = false;
        this.goldRadar = false;
        this.populationPowerScale = 2;
        this.goldSeeker = false;
        this.religion = false;
        this.afterlife = false;
        this.conceptionIntervalMs = -1;
        this.heavenRevealed = false;
        this.hellRevealed = false;
        this.upgradeTree = new Map();
        this.initUpgradeTree();
    }

    toJSON() {
        const upgradeStates = [];
        for (const upgrade of this.upgradeTree.values()) {
            upgradeStates.push(upgrade.toJSON());
        }
        return {
            digSpeed: this.digSpeed,
            digCount: this.digCount,
            goldPer: this.goldPer,
            diamonds: this.diamonds,
            diamondRadar: this.diamondRadar,
            goldRadar: this.goldRadar,
            populationPowerScale: this.populationPowerScale,
            goldSeeker: this.goldSeeker,
            religion: this.religion,
            afterlife: this.afterlife,
            conceptionIntervalMs: this.conceptionIntervalMs,
            heavenRevealed: this.heavenRevealed,
            hellRevealed: this.hellRevealed,
            upgradeStates: upgradeStates,
        };
    }

    static fromJSON(json) {
        let upgrades = new Upgrades();
        upgrades.digSpeed = json.digSpeed;
        upgrades.digCount = json.digCount;
        upgrades.goldPer = json.goldPer;
        upgrades.diamonds = json.diamonds;
        upgrades.diamondRadar = json.diamondRadar;
        upgrades.goldRadar = json.goldRadar;
        upgrades.populationPowerScale = json.populationPowerScale;
        upgrades.goldSeeker = json.goldSeeker;
        upgrades.religion = json.religion;
        upgrades.afterlife = json.afterlife;
        upgrades.conceptionIntervalMs = json.conceptionIntervalMs;
        upgrades.heavenRevealed = json.heavenRevealed;
        upgrades.hellRevealed = json.hellRevealed;
        if (upgrades.religion) {
            upgrades.initReligionTree();
        }
        for (let i = 0; i < json.upgradeStates.length; i++) {
            let upgradeState = json.upgradeStates[i];
            if (!upgrades.upgradeTree.has(upgradeState.id)) {
                console.warn(
                    "Unable to restore upgrade state for upgrade with ID " + upgradeState.id
                );
                continue;
            }
            let upgrade = upgrades.upgradeTree.get(upgradeState.id);
            upgrade.unlocked = upgradeState.unlocked;
            upgrade.purchased = upgradeState.purchased;
        }
        return upgrades;
    }

    initUpgradeTree() {
        // Gold++ tree
        let moreGold1 = new Upgrade(
            "more_gold_1",
            "Elementum amicus",
            StringUtils.dedent(
                `Your researchers discover that being kind to the soil, caring for it, reading to it
                at night, and other displays of love result in more of it revealing itself to you
                during dig operations.`
            ),
            ["+100% gold extracted from dirt", "+25% gold extracted from... gold"],
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
            StringUtils.dedent(
                `Perhaps even more surprisingly, your researchers observe that treating the soil
                cruelly is even more productive. You hope the gold is masochistic and this behavior
                isn't entirely immoral.`
            ),
            ["+50% more gold extracted from dirt", "+10% more gold extracted from gold"],
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
            StringUtils.dedent(
                `Perhaps it is masochistic, and even sexual in nature. Lean into this.`
            ),
            ["-2% more gold extracted from dirt", "-1% more gold extracted from gold"],
            8,
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
            StringUtils.dedent(
                `Nope, that wasn't it. Let's stop doing that. I think we'll all relieved that's over
                with.`
            ),
            ["+100% more gold extracted from dirt", "+25% gold extracted from gold"],
            300,
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
            StringUtils.dedent(
                `Tombstones don't have any gold in them, but gold fillings are popular amongst your
                people, and there's no use letting those go to waste.`
            ),
            ["Get 1 gold from digging up tombstones"],
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
            StringUtils.dedent(
                `Hey, let's check their pockets while we're at it. Can't believe we didn't think of
                that first.`
            ),
            ["Get 5 gold from digging up tombstones"],
            20,
            Currency.GOLD,
            () => {
                this.goldPer[PixelType.TOMBSTONE.name] = 5;
            }
        );
        graveDigger2.addPrereq(graveDigger1);
        this.upgradeTree.set(graveDigger2.id, graveDigger2);

        let diamonds = new Upgrade(
            "diamonds",
            "Scintillare lapis",
            StringUtils.dedent(
                `Someone with an eye for the finer things notices a bucket of brilliant crystals
                with exceptional clarity and sparkle being tossed in the garbage at the end of a
                shift and realizes they could probably be used for something.`
            ),
            ["Your populous will now recognize and dig up diamonds"],
            150,
            Currency.GOLD,
            () => {
                this.diamonds = true;
            }
        );
        this.upgradeTree.set(diamonds.id, diamonds);

        let diamondDeals = new Upgrade(
            "diamond_deals",
            "Mercator pulchra",
            StringUtils.dedent(
                `Your friend knows a guy who can get you a better deal on all those diamonds you're
                finding and selling for a pittance. You just need to cut him in on the sale for a
                small commission.`
            ),
            ["+250% more gold from diamonds"],
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
            StringUtils.dedent(
                `You murder your friend to, quite literally, cut out the middle man.`
            ),
            ["+3% more gold from diamonds"],
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
            ["Your populous are much less likely to walk over gold without stopping to dig it up"],
            75,
            Currency.GOLD,
            () => {
                this.goldSeeker = true;
            }
        );
        goldSeeker.addPrereq(diamonds);
        this.upgradeTree.set(goldSeeker.id, goldSeeker);

        // Digging++ tree
        let digSpeed1 = new Upgrade(
            "dig_speed_1",
            "Duplex trulla",
            StringUtils.dedent(
                `Your researchers whisk off the sheet with some elan to reveal the results of weeks
                of experimentation: a double-ended shovel. My god. It is beautiful.`
            ),
            ["Digging is 2x faster"],
            10,
            Currency.GOLD,
            () => {
                this.digSpeed *= 2;
            }
        );
        this.upgradeTree.set(digSpeed1.id, digSpeed1);

        let digSpeed2 = new Upgrade(
            "dig_speed_2",
            "Factum est iterum",
            StringUtils.dedent(
                `They've only gone and done it again. Somehow, they've managed to fit a third blade
                on a shovel, and by Jove it works. It really works.`
            ),
            ["Digging is 1.5x faster"],
            40,
            Currency.GOLD,
            () => {
                this.digSpeed *= 1.5;
            }
        );
        digSpeed2.addPrereq(digSpeed1);
        this.upgradeTree.set(digSpeed2.id, digSpeed2);

        let digSpeed3 = new Upgrade(
            "dig_speed_3",
            "Non potest esse",
            StringUtils.dedent(
                `You can hardly believe what you're seeing. A quadruple headed shovel. Surely
                they've gone too far this time, no?`
            ),
            ["Digging is 1.25x faster"],
            80,
            Currency.GOLD,
            () => {
                this.digSpeed *= 1.25;
            }
        );
        digSpeed3.addPrereq(digSpeed2);
        this.upgradeTree.set(digSpeed3.id, digSpeed3);

        let digSpeed4 = new Upgrade(
            "dig_speed_4",
            "Nimis longe",
            StringUtils.dedent(
                `They tried. They failed. It simply can't be done. It was the hubris of a prideful
                fool: You. You are that fool. The researchers in the Shovel Division have all left.
                But what's this? Scrawled on the blackboard in the forsaken lab, you see: "You can't
                have more than 4 blades on a shovel. But you CAN force everyone to use two
                quad-shovels at a time."`
            ),
            ["Digging is 2x faster"],
            200,
            Currency.GOLD,
            () => {
                this.digSpeed *= 2;
            }
        );
        digSpeed4.addPrereq(digSpeed3);
        this.upgradeTree.set(digSpeed4.id, digSpeed4);

        let digCount1 = new Upgrade(
            "dig_count_1",
            "Salutem et incolumitatem",
            StringUtils.dedent(`TBD`),
            ["Digs before death increases by 1"],
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
            StringUtils.dedent(`TBD`),
            ["Digs before death increases by 1"],
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
            StringUtils.dedent(`TBD`),
            ["Digs before death increases by 2"],
            350,
            Currency.GOLD,
            () => {
                this.digCount += 2;
            }
        );
        digCount3.addPrereq(digCount2);
        this.upgradeTree.set(digCount3.id, digCount3);

        let pop1 = new Upgrade(
            "pop_1",
            "Opus insumptuosus",
            StringUtils.dedent(`TBD`),
            ["The cost of additional workers scales up more slowly"],
            20,
            Currency.GOLD,
            () => {
                this.populationPowerScale = 1.75;
            }
        );
        this.upgradeTree.set(pop1.id, pop1);

        let pop2 = new Upgrade(
            "pop_2",
            "pop_2_tbd",
            StringUtils.dedent(`TBD`),
            ["The cost of additional workers scales up more slowly"],
            100,
            Currency.GOLD,
            () => {
                this.populationPowerScale = 1.5;
            }
        );
        pop2.addPrereq(pop1);
        this.upgradeTree.set(pop2.id, pop2);

        let pop3 = new Upgrade(
            "pop_3",
            "pop_3_tbd",
            StringUtils.dedent(`TBD`),
            ["The cost of additional workers scales up more slowly"],
            250,
            Currency.GOLD,
            () => {
                this.populationPowerScale = 1.25;
            }
        );
        pop3.addPrereq(pop2);
        this.upgradeTree.set(pop3.id, pop3);

        let pop4 = new Upgrade(
            "pop_4",
            "pop_4_tbd",
            StringUtils.dedent(`TBD`),
            ["The cost of additional workers scales up more slowly"],
            1000,
            Currency.GOLD,
            () => {
                this.populationPowerScale = 1;
            }
        );
        pop4.addPrereq(pop3);
        this.upgradeTree.set(pop4.id, pop4);

        let religion = new Upgrade(
            "religion",
            "In Deo Omnia Possibilia",
            StringUtils.dedent(`TBD`),
            ["Unlock the Religion research wing"],
            800,
            Currency.GOLD,
            () => {
                this.religion = true;
                this.initReligionTree();
            }
        );
        religion.addPrereq(digSpeed3);
        religion.addPrereq(digCount1);
        this.upgradeTree.set(religion.id, religion);
    }

    initReligionTree() {
        let afterlife = new Upgrade(
            "afterlife",
            "Supra Vita",
            StringUtils.dedent(`TBD`),
            ["Death no longer results in tombstones"],
            1622,
            Currency.GOLD,
            () => {
                this.afterlife = true;
            }
        );
        this.upgradeTree.set(afterlife.id, afterlife);

        let spawning1 = new Upgrade(
            "spawning_1",
            "Immaculata Conceptionis",
            StringUtils.dedent(`TBD`),
            ["New congregants begin to manifest without your intervention"],
            6678,
            Currency.GOLD,
            () => {
                this.conceptionIntervalMs = 8000;
            }
        );
        this.upgradeTree.set(spawning1.id, spawning1);

        let spawning2 = new Upgrade(
            "spawning_2",
            "Beati Lumbi",
            StringUtils.dedent(`TBD`),
            ["New believers are brought into existence twice as often"],
            3122,
            Currency.GOLD,
            () => {
                this.conceptionIntervalMs *= 0.5;
            }
        );
        spawning2.addPrereq(spawning1);
        this.upgradeTree.set(spawning2.id, spawning2);

        let spawning3 = new Upgrade(
            "spawning_3",
            "Beati Lumbi",
            StringUtils.dedent(`TBD`),
            ["You are blessed with thrice as many new members joining your efforts"],
            10323,
            Currency.GOLD,
            () => {
                this.conceptionIntervalMs = Math.round(this.conceptionIntervalMs * 0.3);
            }
        );
        spawning3.addPrereq(spawning2);
        this.upgradeTree.set(spawning3.id, spawning3);
    }
}
