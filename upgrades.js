import Upgrade from "./upgrade.js";
import PixelType from "./diggables/pixel_type.js";
import StringUtils from "./string_utils.js";

export default class Upgrades {
    static PROGRESS_GATE_ID_1 = "progress_gate_1";
    static PROGRESS_GATE_ID_2 = "progress_gate_2";
    static PROGRESS_GATE_DESC =
        "This will be automatically unlocked as you make progress by digging.";

    constructor() {
        this.karma_ = 100;

        // Base
        this.digSpeed = 0.5;
        this.digCount = 2;
        this.aspisPer = {};
        this.aspisPer[PixelType.DIRT.name] = 1;
        this.aspisPer[PixelType.GOLD.name] = 8;
        this.aspisPer[PixelType.TOMBSTONE.name] = 0;
        this.aspisPer[PixelType.DIAMOND.name] = 50;
        this.aspisPer[PixelType.EGG.name] = 393;
        this.aspisPer[PixelType.SERPENT.name] = 5555;
        this.unlockGold = false;
        this.unlockDiamonds = false;
        this.freeWorkerCount = 1;
        this.populationPowerScale = 2;
        this.goldSeeker = false;
        this.extraLittleGuyChance = 0;
        this.showWorkerEV = false;
        this.aspisOnDeathAsEvRate = 0;

        // Religion
        this.religion = false;
        this.afterlife = false;
        this.conceptionIntervalMs = -1;
        this.explosionChance = 0;
        this.explosionRadius = 2;
        this.saintlyPctImmaculate = 0.625;
        this.saintlyPctMaculate = 0.4;

        // Serpent
        this.eggHandling = false;

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
            aspisPer: this.aspisPer,
            unlockGold: this.unlockGold,
            unlockDiamonds: this.unlockDiamonds,
            freeWorkerCount: this.freeWorkerCount,
            populationPowerScale: this.populationPowerScale,
            goldSeeker: this.goldSeeker,
            extraLittleGuyChance: this.extraLittleGuyChance,
            showWorkerEV: this.showWorkerEV,
            aspisOnDeathAsEvRate: this.aspisOnDeathAsEvRate,
            religion: this.religion,
            afterlife: this.afterlife,
            conceptionIntervalMs: this.conceptionIntervalMs,
            explosionChance: this.explosionChance,
            explosionRadius: this.explosionRadius,
            saintlyPctImmaculate: this.saintlyPctImmaculate,
            saintlyPctMaculate: this.saintlyPctMaculate,
            eggHandling: this.eggHandling,
            upgradeStates: upgradeStates,
        };
    }

    static fromJSON(json) {
        const upgrades = new Upgrades();
        Object.assign(upgrades, json);

        for (let i = 0; i < json.upgradeStates.length; i++) {
            const upgradeState = json.upgradeStates[i];
            if (!upgrades.upgradeTree.has(upgradeState.id)) {
                console.warn(
                    "Unable to restore upgrade state for upgrade with ID " + upgradeState.id
                );
                continue;
            }
            const upgrade = upgrades.upgradeTree.get(upgradeState.id);
            upgrade.unlocked = upgradeState.unlocked;
            upgrade.purchased = upgradeState.purchased;
        }
        return upgrades;
    }

    updateKarma(dk) {
        this.karma_ += dk;
    }

    get karma() {
        return this.karma_;
    }

    getUpgrade(id) {
        return this.upgradeTree.get(id);
    }

    initUpgradeTree() {
        // Progress gates
        const progressGate1 = new Upgrade(
            Upgrades.PROGRESS_GATE_ID_1,
            "Dig Progress 1",
            Upgrades.PROGRESS_GATE_DESC,
            [],
            -3
        );
        this.upgradeTree.set(progressGate1.id, progressGate1);
        const progressGate2 = new Upgrade(
            Upgrades.PROGRESS_GATE_ID_2,
            "Dig Progress 2",
            Upgrades.PROGRESS_GATE_DESC,
            [],
            -8
        );
        this.upgradeTree.set(progressGate2.id, progressGate2);

        // Aspis++ tree
        const betterDirt = new Upgrade(
            "better_dirt",
            "better_dirt_tbd",
            StringUtils.dedent(`TBD`),
            ["+100% Aspis extracted from dirt"],
            5,
            () => {
                this.aspisPer[PixelType.DIRT.name] = Math.round(
                    this.aspisPer[PixelType.DIRT.name] * 2
                );
            }
        );
        this.upgradeTree.set(betterDirt.id, betterDirt);

        const unlockGold = new Upgrade(
            "unlock_gold",
            "gold_tbd",
            StringUtils.dedent(`TBD`),
            ["TBD: Your populous will now recognize and dig up gold"],
            10,
            () => {
                this.unlockGold = true;
            }
        );
        this.upgradeTree.set(unlockGold.id, unlockGold);

        const moreAspis1 = new Upgrade(
            "more_aspis_1",
            "Elementum amicus",
            StringUtils.dedent(
                `Your researchers discover that being kind to the soil, caring for it, reading to it
                at night, and other displays of love result in more of it revealing itself to you
                during dig operations.`
            ),
            ["+100% Aspis extracted from dirt", "+25% Aspis extracted from gold"],
            30,
            () => {
                this.aspisPer[PixelType.DIRT.name] = Math.round(
                    this.aspisPer[PixelType.DIRT.name] * 2
                );
                this.aspisPer[PixelType.GOLD.name] = Math.round(
                    this.aspisPer[PixelType.GOLD.name] * 1.25
                );
            }
        );
        moreAspis1.addPrereq(betterDirt);
        moreAspis1.addPrereq(unlockGold);
        this.upgradeTree.set(moreAspis1.id, moreAspis1);

        const moreAspis2 = new Upgrade(
            "more_aspis_2",
            "Elementum tormentis",
            StringUtils.dedent(
                `Perhaps even more surprisingly, your researchers observe that treating the soil
                cruelly is even more productive.`
            ),
            ["+75% more Aspis extracted from dirt", "+60% more Aspis extracted from gold"],
            675,
            () => {
                this.aspisPer[PixelType.DIRT.name] = Math.round(
                    this.aspisPer[PixelType.DIRT.name] * 1.75
                );
                this.aspisPer[PixelType.GOLD.name] = Math.round(
                    this.aspisPer[PixelType.GOLD.name] * 1.6
                );
            }
        );
        moreAspis2.addPrereq(moreAspis1);
        this.upgradeTree.set(moreAspis2.id, moreAspis2);

        const moreAspis3 = new Upgrade(
            "more_aspis_4",
            "Nefas directionis",
            StringUtils.dedent(`TBD.`),
            ["+60% more Aspis extracted from dirt", "+75% Aspis extracted from gold"],
            3000,
            () => {
                this.aspisPer[PixelType.DIRT.name] = Math.round(
                    this.aspisPer[PixelType.DIRT.name] * 1.6
                );
                this.aspisPer[PixelType.GOLD.name] = Math.round(
                    this.aspisPer[PixelType.GOLD.name] * 1.75
                );
            }
        );
        moreAspis3.addPrereq(moreAspis2);
        this.upgradeTree.set(moreAspis3.id, moreAspis3);

        const graveDigger1 = new Upgrade(
            "grave_digger_1",
            "Dens cadaver",
            StringUtils.dedent(`TBD.`),
            ["Get 2 Aspis from digging up tombstones"],
            5,
            () => {
                this.aspisPer[PixelType.TOMBSTONE.name] = 2;
                this.updateKarma(-5);
            }
        );
        this.upgradeTree.set(graveDigger1.id, graveDigger1);

        const graveDigger2 = new Upgrade(
            "grave_digger_2",
            "Sepulchri furem",
            StringUtils.dedent(
                `Hey, let's check their pockets while we're at it. Can't believe we didn't think of
                that first.`
            ),
            ["Get 8 Aspis from digging up tombstones"],
            50,
            () => {
                this.aspisPer[PixelType.TOMBSTONE.name] = 8;
                this.updateKarma(-10);
            }
        );
        graveDigger2.addPrereq(graveDigger1);
        this.upgradeTree.set(graveDigger2.id, graveDigger2);

        const unlockDiamonds = new Upgrade(
            "unlock_diamonds",
            "Scintillare lapis",
            StringUtils.dedent(
                `A researcher with an eye for the finer things notices a bucket of brilliant
                crystals with exceptional clarity and sparkle being tossed in the garbage at the end
                of a shift and realizes they could probably be used for something.`
            ),
            ["Your populous will now recognize and dig up diamonds"],
            250,
            () => {
                this.unlockDiamonds = true;
            }
        );
        unlockDiamonds.addPrereq(unlockGold);
        unlockDiamonds.addPrereq(moreAspis1);
        this.upgradeTree.set(unlockDiamonds.id, unlockDiamonds);

        const diamondDeals = new Upgrade(
            "diamond_deals",
            "Mercator pulchra",
            StringUtils.dedent(
                `Your friend knows a guy who can get you a better deal on all those diamonds you're
                finding and selling for a pittance. You just need to cut him in on the sale for a
                small commission.`
            ),
            ["+75% more Aspis from diamonds"],
            2300,
            () => {
                this.aspisPer[PixelType.DIAMOND.name] = Math.round(
                    this.aspisPer[PixelType.DIAMOND.name] * 1.75
                );
            }
        );
        diamondDeals.addPrereq(unlockDiamonds);
        this.upgradeTree.set(diamondDeals.id, diamondDeals);

        const bloodDiamonds = new Upgrade(
            "blood_diamonds",
            "Prodita sanguine",
            StringUtils.dedent(
                `You murder your friend to, quite literally, cut out the middle man.`
            ),
            ["+3% more Aspis from diamonds"],
            1200,
            () => {
                this.aspisPer[PixelType.DIAMOND.name] = Math.round(
                    this.aspisPer[PixelType.DIAMOND.name] * 1.03
                );
                this.updateKarma(-20);
            }
        );
        bloodDiamonds.addPrereq(diamondDeals);
        this.upgradeTree.set(bloodDiamonds.id, bloodDiamonds);

        const moreAspisDirt = new Upgrade(
            "more_aspis_dirt",
            "more_aspis_dirt_tbd",
            StringUtils.dedent(`TBD: Dirt propaganda.`),
            ["The value of dirt is increased by 50%"],
            1500,
            () => {
                this.aspisPer[PixelType.DIRT.name] = Math.round(
                    this.aspisPer[PixelType.DIRT.name] * 1.5
                );
            }
        );
        moreAspisDirt.addPrereq(progressGate1);
        this.upgradeTree.set(moreAspisDirt.id, moreAspisDirt);

        const moreAspisGold = new Upgrade(
            "more_aspis_gold",
            "more_aspis_gold_tbd",
            StringUtils.dedent(`TBD: Gold propaganda.`),
            ["The value of gold is increased by 80%"],
            1780,
            () => {
                this.aspisPer[PixelType.GOLD.name] = Math.round(
                    this.aspisPer[PixelType.GOLD.name] * 1.8
                );
            }
        );
        moreAspisGold.addPrereq(progressGate1);
        this.upgradeTree.set(moreAspisGold.id, moreAspisGold);

        const graveDigger3 = new Upgrade(
            "grave_digger_3",
            "grave_digger_3_tbd",
            StringUtils.dedent(
                `TBD: Invest in a machine that can crush a casket, body and all, into a beautiful,
                shining diamond. Well, a diamond-looking lump, anyway.`
            ),
            ["Tombstones are now worth 25% of the value of diamonds."],
            1925,
            () => {
                this.aspisPer[PixelType.TOMBSTONE.name] = Math.round(
                    this.aspisPer[PixelType.DIAMOND.name] * 0.25
                );
                this.updateKarma(-15);
            }
        );
        graveDigger3.addPrereq(graveDigger2);
        graveDigger3.addPrereq(diamondDeals);
        this.upgradeTree.set(graveDigger3.id, graveDigger3);

        const goldSeeker = new Upgrade(
            "gold_seeker",
            "Thesaurum sub pede",
            "",
            [
                StringUtils.dedent(
                    `Your populous are much less likely to walk over something valuable without
                    stopping to dig it up`
                ),
            ],
            275,
            () => {
                this.goldSeeker = true;
            }
        );
        goldSeeker.addPrereq(unlockDiamonds);
        this.upgradeTree.set(goldSeeker.id, goldSeeker);

        // Digging++ tree
        const digSpeed1 = new Upgrade(
            "dig_speed_1",
            "Duplex trulla",
            StringUtils.dedent(
                `Your researchers whisk off the sheet with some elan to reveal the results of weeks
                of experimentation: a double-ended shovel. My god. It is beautiful.`
            ),
            ["Digging is 2x faster"],
            10,
            () => {
                this.digSpeed *= 2;
            }
        );
        this.upgradeTree.set(digSpeed1.id, digSpeed1);

        const digSpeed2 = new Upgrade(
            "dig_speed_2",
            "Factum est iterum",
            StringUtils.dedent(
                `They've only gone and done it again. Somehow, they've managed to fit a third blade
                on a shovel, and by Jove it works. It really works.`
            ),
            ["Digging is 1.5x faster"],
            60,
            () => {
                this.digSpeed *= 1.5;
            }
        );
        digSpeed2.addPrereq(digSpeed1);
        this.upgradeTree.set(digSpeed2.id, digSpeed2);

        const digSpeed3 = new Upgrade(
            "dig_speed_3",
            "Non potest esse",
            StringUtils.dedent(
                `You can hardly believe what you're seeing. A quadruple headed shovel. Surely
                they've gone too far this time, no?`
            ),
            ["Digging is 1.25x faster"],
            220,
            () => {
                this.digSpeed *= 1.25;
            }
        );
        digSpeed3.addPrereq(digSpeed2);
        this.upgradeTree.set(digSpeed3.id, digSpeed3);

        const digSpeed4 = new Upgrade(
            "dig_speed_4",
            "Nimis longe",
            StringUtils.dedent(`Two words: two shovels.`),
            ["Digging is 2x faster"],
            900,
            () => {
                this.digSpeed *= 2;
            }
        );
        digSpeed4.addPrereq(digSpeed3);
        this.upgradeTree.set(digSpeed4.id, digSpeed4);

        const digCount1 = new Upgrade(
            "dig_count_1",
            "Salutem et incolumitatem",
            StringUtils.dedent(`TBD`),
            ["Digs before retirement increases by 1"],
            30,
            () => {
                this.digCount++;
            }
        );
        this.upgradeTree.set(digCount1.id, digCount1);

        const digCount2 = new Upgrade(
            "dig_count_2",
            "Salus et sanitas",
            StringUtils.dedent(`TBD`),
            ["Digs before retirement increases by 1"],
            400,
            () => {
                this.digCount++;
            }
        );
        digCount2.addPrereq(digCount1);
        this.upgradeTree.set(digCount2.id, digCount2);

        const digCount3 = new Upgrade(
            "dig_count_3",
            "Ferro pollicem tabernus",
            StringUtils.dedent(`TBD`),
            ["Digs before retirement increases by 2"],
            2350,
            () => {
                this.digCount += 2;
            }
        );
        digCount3.addPrereq(digCount2);
        this.upgradeTree.set(digCount3.id, digCount3);

        const pop1 = new Upgrade(
            "pop_1",
            "Opus insumptuosus",
            StringUtils.dedent(`TBD`),
            [
                "The first 2 workers are now free",
                "The cost of additional workers scales up more slowly",
            ],
            20,
            () => {
                this.freeWorkerCount = 2;
                this.populationPowerScale = 1.9;
            }
        );
        this.upgradeTree.set(pop1.id, pop1);

        const pop2 = new Upgrade(
            "pop_2",
            "pop_2_tbd",
            StringUtils.dedent(`TBD`),
            [
                "The first 3 workers are now free",
                "The cost of additional workers scales up more slowly",
            ],
            500,
            () => {
                this.freeWorkerCount = 3;
                this.populationPowerScale = 1.8;
            }
        );
        pop2.addPrereq(pop1);
        this.upgradeTree.set(pop2.id, pop2);

        const pop3 = new Upgrade(
            "pop_3",
            "pop_3_tbd",
            StringUtils.dedent(`TBD`),
            [
                "The first 5 workers are now free",
                "The cost of additional workers scales up more slowly",
            ],
            1550,
            () => {
                this.freeWorkerCount = 4;
                this.populationPowerScale = 1.7;
            }
        );
        pop3.addPrereq(pop2);
        this.upgradeTree.set(pop3.id, pop3);

        const pop4 = new Upgrade(
            "pop_4",
            "pop_4_tbd",
            StringUtils.dedent(`TBD`),
            ["The cost of additional workers scales up more slowly"],
            3000,
            () => {
                this.populationPowerScale = 1.6;
            }
        );
        pop4.addPrereq(pop3);
        this.upgradeTree.set(pop4.id, pop4);

        const workerEv = new Upgrade(
            "worker_ev",
            "worker_ev_tbd",
            StringUtils.dedent(
                `An accountant joins the team to help you make more informed hiring decisions.`
            ),
            ["Adds the expected value for workers to the info box"],
            5050,
            () => {
                this.showWorkerEV = true;
            }
        );
        workerEv.addPrereq(pop3);
        this.upgradeTree.set(workerEv.id, workerEv);

        const deathMoney = new Upgrade(
            "death_money",
            "death_money_tbd",
            StringUtils.dedent(
                `Successfully make the argument that the families of retired workers should pay The
                Company for the loss in productivity that results from the cessation of their life
                function.`
            ),
            ["Receive 10% of the expected value of a worker upon the retirement of any worker"],
            9680,
            () => {
                this.aspisOnDeathAsEvRate = 0.1;
                this.updateKarma(-20);
            }
        );
        deathMoney.addPrereq(workerEv);
        deathMoney.addPrereq(digCount3);
        this.upgradeTree.set(deathMoney.id, deathMoney);

        const extraLittleGuy1 = new Upgrade(
            "extra_little_guy_1",
            "extra_little_guy_1_tbd",
            StringUtils.dedent(
                `The Company announces <q>Bring A Worker To Work</q> day, where workers are welcome
                to bring an extra worker with them to work in exchange for keeping their job.`
            ),
            ["Grants a 20% chance that an extra worker will spawn"],
            900,
            () => {
                this.extraLittleGuyChance = 0.2;
            }
        );
        extraLittleGuy1.addPrereq(pop1);
        this.upgradeTree.set(extraLittleGuy1.id, extraLittleGuy1);

        const extraLittleGuy2 = new Upgrade(
            "extra_little_guy_2",
            "extra_little_guy_2_tbd",
            StringUtils.dedent(
                `Participation in <q>Bring A Worker To Work</q> day is actually pretty important to
                the unique culture here at The Company.`
            ),
            ["Increases the chance that an extra worker will spawn to 40%"],
            1800,
            () => {
                this.extraLittleGuyChance = 0.4;
            }
        );
        extraLittleGuy2.addPrereq(pop2);
        extraLittleGuy2.addPrereq(extraLittleGuy1);
        this.upgradeTree.set(extraLittleGuy2.id, extraLittleGuy2);

        const freeWorkers1 = new Upgrade(
            "free_workers_1",
            "free_workers_1_tbd",
            StringUtils.dedent(`TBD`),
            ["The first 10 workers are now free"],
            6500,
            () => {
                this.freeWorkerCount = 10;
            }
        );
        freeWorkers1.addPrereq(pop3);
        this.upgradeTree.set(freeWorkers1.id, freeWorkers1);

        const religion = new Upgrade(
            "religion",
            "In Deo Omnia Possibilia",
            StringUtils.dedent(`TBD`),
            ["Unlock the Religion research wing"],
            9999,
            () => {
                this.religion = true;
            }
        );
        religion.addPrereq(moreAspis2);
        religion.addPrereq(progressGate1);
        this.upgradeTree.set(religion.id, religion);

        const afterlife = new Upgrade(
            "afterlife",
            "Supra Vita",
            StringUtils.dedent(`TBD`),
            [
                "Retirement no longer results in a tombstone being created",
                "Tombstone Aspis is granted immediately upon retirement",
            ],
            1622,
            () => {
                this.afterlife = true;
            }
        );
        afterlife.addPrereq(religion);
        this.upgradeTree.set(afterlife.id, afterlife);

        const explosives1 = new Upgrade(
            "explosives_1",
            "explosives_1_tbd",
            StringUtils.dedent(
                `The Company encourages its loyal followers to go out with a <q>bang</q> to
                demonstrate their dedication to the Leader. Rewards for this dedication can be
                collected in the afterlife.`
            ),
            ["Gives the final dig for employees a 10% chance to result in a small explosion"],
            4421,
            () => {
                this.explosionChance = 0.1;
            }
        );
        explosives1.addPrereq(afterlife);
        this.upgradeTree.set(explosives1.id, explosives1);

        const explosives2 = new Upgrade(
            "explosives_2",
            "explosives_2_tbd",
            StringUtils.dedent(`TBD.`),
            ["Increases the explosion rate to 25%"],
            7001,
            () => {
                this.explosionChance = 0.25;
            }
        );
        explosives2.addPrereq(explosives1);
        this.upgradeTree.set(explosives2.id, explosives2);

        const explosives3 = new Upgrade(
            "explosives_3",
            "explosives_3_tbd",
            StringUtils.dedent(
                `Come on, show you really mean it. If you're going to do it, do it right.`
            ),
            ["Doubles the size of the explosion."],
            7001,
            () => {
                this.explosionRadius *= 2;
            }
        );
        explosives3.addPrereq(explosives1);
        this.upgradeTree.set(explosives3.id, explosives3);

        const spawning1 = new Upgrade(
            "spawning_1",
            "Immaculata Conceptionis",
            StringUtils.dedent(`TBD`),
            ["New congregants begin to manifest without your intervention"],
            6678,
            () => {
                this.conceptionIntervalMs = 8000;
            }
        );
        spawning1.addPrereq(religion);
        this.upgradeTree.set(spawning1.id, spawning1);

        const spawning2 = new Upgrade(
            "spawning_2",
            "Beati Lumbi",
            StringUtils.dedent(`TBD`),
            ["New believers are brought into existence twice as often"],
            3122,
            () => {
                this.conceptionIntervalMs *= 0.5;
            }
        );
        spawning2.addPrereq(spawning1);
        this.upgradeTree.set(spawning2.id, spawning2);

        const spawning3 = new Upgrade(
            "spawning_3",
            "spawning_3_tbd",
            StringUtils.dedent(`TBD`),
            ["You are blessed with thrice as many new members joining your efforts"],
            10323,
            () => {
                this.conceptionIntervalMs = Math.round(this.conceptionIntervalMs * 0.3);
            }
        );
        spawning3.addPrereq(spawning2);
        this.upgradeTree.set(spawning3.id, spawning3);

        const tithing1 = new Upgrade(
            "tithe_1",
            "tithe_1_tbd",
            StringUtils.dedent(
                `The Leader requests some money. You get a sense that this is not the type of
                request that can be denied.`
            ),
            ["The feeling of having done something good for the Leader is reward enough, no?"],
            2000,
            () => {
                this.saintlyPctImmaculate = 0.75;
                this.saintlyPctMaculate = 0.5;
            }
        );
        tithing1.addPrereq(religion);
        this.upgradeTree.set(tithing1.id, tithing1);

        const tithing2 = new Upgrade(
            "tithe_2",
            "tithe_2_tbd",
            StringUtils.dedent(
                `The Leader notices that your coffers are looking quite full. Surely you wouldn't
                even notice if some of it went to a good cause.`
            ),
            ["That's so kind of you"],
            4000,
            () => {
                this.saintlyPctImmaculate = 0.875;
                this.saintlyPctMaculate = 0.6;
            }
        );
        tithing2.addPrereq(tithing1);
        this.upgradeTree.set(tithing2.id, tithing2);

        const tithing3 = new Upgrade(
            "tithe_3",
            "tithe_3_tbd",
            StringUtils.dedent(
                `The Company helpfully updates its official policy on offerings: <q>Gimme that.</q>`
            ),
            ["You were probably going to fritter it away anyway"],
            8000,
            () => {
                this.saintlyPctImmaculate = 1;
                this.saintlyPctMaculate = 0.7;
            }
        );
        tithing3.addPrereq(tithing2);
        this.upgradeTree.set(tithing3.id, tithing3);

        const digSpeed5 = new Upgrade(
            "dig_speed_5",
            "dig_speed_5_tbd",
            StringUtils.dedent(
                `Love for The Leader is at an all time high, motivating followers to strain mightily
                against the soil to prove their worthiness.`
            ),
            ["Digging is 1.75x faster"],
            6243,
            () => {
                this.digSpeed *= 1.75;
            }
        );
        digSpeed5.addPrereq(digSpeed4);
        digSpeed5.addPrereq(tithing1);
        this.upgradeTree.set(digSpeed5.id, digSpeed5);

        const serpent = new Upgrade(
            "serpent",
            "serpent_tbd",
            StringUtils.dedent(`TBD: The book of the Serpent is discovered.`),
            ["Unlocks the Serpent research wing"],
            911,
            () => {
                this.serpent = true;
            }
        );
        serpent.addPrereq(spawning3);
        serpent.addPrereq(tithing3);
        this.upgradeTree.set(serpent.id, serpent);

        const eggHandling = new Upgrade(
            "egg_handling",
            "egg_handling_tbd",
            StringUtils.dedent(`TBD`),
            ["Allows workers to exist near the Egg."],
            191,
            () => {
                this.eggHandling = true;
            }
        );
        eggHandling.addPrereq(progressGate2);
        eggHandling.addPrereq(serpent);
        this.upgradeTree.set(eggHandling.id, eggHandling);

        const digSpeed6 = new Upgrade(
            "dig_speed_6",
            "dig_speed_6_tbd",
            StringUtils.dedent(
                `The Book of the Serpent contains a ritual that grants beings an incredible passion
                for destruction. You integrate it into the morning routine for your team.`
            ),
            ["Digging is 2.5x faster"],
            11911,
            () => {
                this.digSpeed *= 2.5;
            }
        );
        digSpeed6.addPrereq(digSpeed5);
        digSpeed6.addPrereq(serpent);
        this.upgradeTree.set(digSpeed6.id, digSpeed6);

        const digSpeed7 = new Upgrade(
            "dig_speed_7",
            "dig_speed_7_tbd",
            StringUtils.dedent(`You also add stretching and a light jog to the morning routine.`),
            ["Digging is 1.1x faster"],
            6,
            () => {
                this.digSpeed *= 1.1;
            }
        );
        digSpeed7.addPrereq(digSpeed6);
        digSpeed7.addPrereq(serpent);
        this.upgradeTree.set(digSpeed7.id, digSpeed7);

        const finalPush = new Upgrade(
            "final_push",
            "final_push_tbd",
            StringUtils.dedent(`Throw all you've got at it for the final push.`),
            [
                "Digging is 1.5x faster",
                "New followers are manifested 1.35x more frequently",
                "Increases the explosion rate to 40%",
            ],
            91100,
            () => {
                this.digSpeed *= 1.5;
                this.conceptionIntervalMs *= 0.74;
                this.explosionChance = 0.4;
            }
        );
        finalPush.addPrereq(digSpeed7);
        finalPush.addPrereq(eggHandling);
        this.upgradeTree.set(finalPush.id, finalPush);
    }
}
