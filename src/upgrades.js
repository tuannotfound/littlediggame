// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import Upgrade from "./upgrade.js";
import PixelType from "./diggables/pixel_type.js";
import StringUtils from "./string_utils.js";
import Story from "./story.js";

export default class Upgrades {
    static PROGRESS_GATE_ID_1 = "progress_gate_1";
    static PROGRESS_GATE_ID_2 = "progress_gate_2";
    static PROGRESS_GATE_ID_3 = "progress_gate_3";
    static PROGRESS_GATE_ID_4 = "progress_gate_4";
    static PROGRESS_GATE_DESC =
        "This will be automatically unlocked as you make progress by digging.";

    static SHIELDS_ID = "shields";

    #karma;

    constructor() {
        this.#karma = 100;

        // Base
        this.digSpeed = 0.5;
        this.digCount = 2;
        this.aspisPer = {};
        this.aspisPer[PixelType.DIRT.name] = 1;
        this.aspisPer[PixelType.GOLD.name] = 8;
        this.aspisPer[PixelType.TOMBSTONE.name] = 0;
        this.aspisPer[PixelType.DIAMOND.name] = 50;
        this.aspisPer[PixelType.MAGIC.name] = 5000;
        this.aspisPer[PixelType.EGG.name] = 333;
        this.aspisPer[PixelType.SERPENT.name] = 100;
        this.unlockGold = false;
        this.unlockDiamonds = false;
        this.bloodDiamonds = false;
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
        this.shieldsUnlocked = false;

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
            bloodDiamonds: this.bloodDiamonds,
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
        this.#karma += dk;
    }

    get karma() {
        return this.#karma;
    }

    getUpgrade(id) {
        return this.upgradeTree.get(id);
    }

    initUpgradeTree() {
        // Progress gates
        const progressGate1 = new Upgrade(
            Upgrades.PROGRESS_GATE_ID_1,
            "Dig progress I",
            Upgrades.PROGRESS_GATE_DESC,
            [],
            -1
        );
        this.upgradeTree.set(progressGate1.id, progressGate1);
        const progressGate2 = new Upgrade(
            Upgrades.PROGRESS_GATE_ID_2,
            "Dig progress II",
            Upgrades.PROGRESS_GATE_DESC,
            [],
            -3
        );
        this.upgradeTree.set(progressGate2.id, progressGate2);
        const progressGate3 = new Upgrade(
            Upgrades.PROGRESS_GATE_ID_3,
            "Dig progress III",
            Upgrades.PROGRESS_GATE_DESC,
            [],
            -8
        );
        this.upgradeTree.set(progressGate3.id, progressGate3);
        const progressGate4 = new Upgrade(
            Upgrades.PROGRESS_GATE_ID_4,
            "Dig progress IV",
            Upgrades.PROGRESS_GATE_DESC,
            [],
            -10
        );
        this.upgradeTree.set(progressGate4.id, progressGate4);

        // Aspis++ tree
        const betterDirt = new Upgrade(
            "better_dirt",
            "Injuriosum terra",
            StringUtils.dedent(
                `Your researchers discover a filtering technique that splits the dirt into two
                categories that they're calling <q>good dirt</q> and <q>bad dirt</q>.`
            ),
            ["+100% Aspis from dirt"],
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
            "Aureum somnium",
            StringUtils.dedent(
                `Update the orientation video for new workers to include a segment on how to
                recognize gold, how to dig it up, how to handle it safely, and how cool it looks to
                wear it.`
            ),
            ["Workers will now recognize and dig up gold"],
            10,
            () => {
                this.unlockGold = true;
            }
        );
        this.upgradeTree.set(unlockGold.id, unlockGold);

        const moreAspis1 = new Upgrade(
            "more_aspis_1",
            "Rex lutum",
            StringUtils.dedent(
                `Your researchers improve their filtering technology, further splitting the <q>good
                dirt</q> into <q>fine dirt</q> and <q>great dirt</q>. Additionally, this new
                filtering process is able to extract trace amounts of gold from the dirt.`
            ),
            ["+100% Aspis from dirt", "+25% Aspis from gold"],
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
            "Mala terra",
            StringUtils.dedent(
                `Advances in filtering result in splitting <q>bad dirt</q> into <q>evil dirt</q> and
                <q>sadly misguided dirt</q>. As it turns out, there's quite a high demand for evil
                dirt for some reason.`
            ),
            ["+75% more Aspis from dirt"],
            195,
            () => {
                this.aspisPer[PixelType.DIRT.name] = Math.round(
                    this.aspisPer[PixelType.DIRT.name] * 1.75
                );
            }
        );
        moreAspis2.addPrereq(moreAspis1);
        this.upgradeTree.set(moreAspis2.id, moreAspis2);

        const moreAspis2pt5 = new Upgrade(
            "more_aspis_2pt5",
            "Elementum amicus",
            StringUtils.dedent(
                `You make it clear to the workers that they aren't actually allowed to just bring
                their favorite nuggets of gold home. They have to hand them over to The Company, no
                matter how hard it is to say good-bye.`
            ),
            ["+60% more Aspis from gold"],
            375,
            () => {
                this.aspisPer[PixelType.GOLD.name] = Math.round(
                    this.aspisPer[PixelType.GOLD.name] * 1.6
                );
            }
        );
        moreAspis2pt5.addPrereq(moreAspis1);
        this.upgradeTree.set(moreAspis2pt5.id, moreAspis2pt5);

        const moreAspis3 = new Upgrade(
            "more_aspis_4",
            "Vice versa",
            StringUtils.dedent(
                `Your researchers develop catchy jingles and new signage to prevent absent-minded
                workers from continuing to put dirt in the gold depository and gold in the dirt
                pile.`
            ),
            ["+60% more Aspis from dirt", "+75% Aspis from gold"],
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
            "Contundito cadaver",
            StringUtils.dedent(
                `Tombstones are a nice way to remember those that we lost during this operation.
                Unfortunately, crushing them up is a <i>great</i> way to produce low-cost gravel
                that can be sold for a small profit, and you've decided to take the latter route.`
            ),
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
            StringUtils.dedent(`Exhume the body and check its pockets while we're at it.`),
            ["Get 8 Aspis from digging up tombstones"],
            490,
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
                of a shift and realizes they could probably be used for something. Spread the word!`
            ),
            ["Your workers will now recognize and dig up diamonds"],
            250,
            () => {
                this.unlockDiamonds = true;
            }
        );
        unlockDiamonds.addPrereq(progressGate1);
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
                this.bloodDiamonds = true;
            }
        );
        bloodDiamonds.addPrereq(diamondDeals);
        this.upgradeTree.set(bloodDiamonds.id, bloodDiamonds);

        const moreAspisDirt = new Upgrade(
            "more_aspis_dirt",
            "Venditor scientia",
            StringUtils.dedent(
                `Have your researchers invest in compelling marketing materials for the various
                grades of dirt your crew is procuring.`
            ),
            ["The value of dirt is increased by 50%"],
            1500,
            () => {
                this.aspisPer[PixelType.DIRT.name] = Math.round(
                    this.aspisPer[PixelType.DIRT.name] * 1.5
                );
            }
        );
        moreAspisDirt.addPrereq(progressGate2);
        this.upgradeTree.set(moreAspisDirt.id, moreAspisDirt);

        const moreAspisGold = new Upgrade(
            "more_aspis_gold",
            "Ars paciscor",
            StringUtils.dedent(
                `Convert a section of the lab into a propaganda center to promote the benefits of
                gold ownership, driving up demand and The Company's profits.`
            ),
            ["The value of gold is increased by 80%"],
            1780,
            () => {
                this.aspisPer[PixelType.GOLD.name] = Math.round(
                    this.aspisPer[PixelType.GOLD.name] * 1.8
                );
            }
        );
        moreAspisGold.addPrereq(progressGate2);
        this.upgradeTree.set(moreAspisGold.id, moreAspisGold);

        const graveDigger3 = new Upgrade(
            "grave_digger_3",
            "Calor et pressura",
            StringUtils.dedent(
                `Your researchers create a machine that can crush a casket, body and all, into a
                beautiful, shining diamond. Well, a diamond-looking lump, anyway.`
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
            StringUtils.dedent(
                `Equip your workers with boots that have metal detectors embedded in the soles.
                There's no way around it: they're extremely uncomfortable and heavy. On the plus
                side, the shareholders are thrilled with the results.`
            ),
            [
                StringUtils.dedent(
                    `Your workers are much less likely to walk over something valuable without
                    stopping to dig it up`
                ),
            ],
            275,
            () => {
                this.goldSeeker = true;
                this.updateKarma(-10);
            }
        );
        goldSeeker.addPrereq(unlockDiamonds);
        this.upgradeTree.set(goldSeeker.id, goldSeeker);

        // Digging++ tree
        const digSpeed1 = new Upgrade(
            "dig_speed_1",
            "Duplex trulla",
            StringUtils.dedent(
                `Your researchers whisk off the sheet with a flourish to reveal the results of weeks
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
            520,
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
            1700,
            () => {
                this.digSpeed *= 2;
            }
        );
        digSpeed4.addPrereq(digSpeed3);
        this.upgradeTree.set(digSpeed4.id, digSpeed4);

        const digCount1 = new Upgrade(
            "dig_count_1",
            "Salutem et incolumitatem",
            StringUtils.dedent(
                `The safety division of the research lab has developed a new type of <q>hardened
                hat</q> that has been carefully designed to prevent fatal bonks, doinks, and thwacks
                to the cranium.`
            ),
            ["Digs before <q>retirement</q> increases by 1"],
            30,
            () => {
                this.digCount++;
            }
        );
        this.upgradeTree.set(digCount1.id, digCount1);

        const digCount2 = new Upgrade(
            "dig_count_2",
            "Salus et sanitas",
            StringUtils.dedent(
                `The wellness division of the research lab trains the workers on a new technique
                called <q>mindful digging</q> that results in fewer injuries and 4% higher job
                satisfaction.`
            ),
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
            StringUtils.dedent(
                `Equip your workers with a steel toe-cover for their boots. Toe-related deaths
                plummet.`
            ),
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
            "Ens inferius",
            StringUtils.dedent(
                `The law researchers successfully lobby the government to allow you to categorize
                some workers as <q>less-than-sentient</q> beings when your project size is below a
                certain threshold.`
            ),
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
            "Iocus tantum erat",
            StringUtils.dedent(
                `The Company's ethics commitee proclaims that it is morally acceptable to, like,
                pick a guy and not pay him just to see if you can get away with it. However, this
                comes with the caveat that you must say sorry if he notices.`
            ),
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
            "Effectus geminus",
            StringUtils.dedent(
                `A new law is passed that allows you to classify workers that look sufficiently
                alike as the same entity for the purposes of payroll. Squinting is allowed.`
            ),
            [
                "The first 5 workers are now free",
                "The cost of additional workers scales up more slowly",
            ],
            1050,
            () => {
                this.freeWorkerCount = 4;
                this.populationPowerScale = 1.7;
            }
        );
        pop3.addPrereq(pop2);
        this.upgradeTree.set(pop3.id, pop3);

        const pop4 = new Upgrade(
            "pop_4",
            "Participatur mercedes",
            StringUtils.dedent(
                `If the workers are so dead-set on getting a <q>bigger share</q> of the profits, how
                about instead they <i>share</i> the fixed amount of money The Company is willing to
                pay them?`
            ),
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
            "Conductio sapiens",
            StringUtils.dedent(
                `An accountant joins the team to help you make more informed hiring decisions.`
            ),
            ["Adds the expected value for workers to the UI"],
            5050,
            () => {
                this.showWorkerEV = true;
            }
        );
        workerEv.addPrereq(pop3);
        this.upgradeTree.set(workerEv.id, workerEv);

        const deathMoney = new Upgrade(
            "death_money",
            "Mortis solucionis",
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
            "Amicus laboris",
            StringUtils.dedent(
                `The Company announces <q>Bring A Worker To Work</q> day, where workers are welcome
                to bring an extra worker with them to work in exchange for more work.`
            ),
            ["Grants a 20% chance that an extra worker will spawn"],
            120,
            () => {
                this.extraLittleGuyChance = 0.2;
            }
        );
        extraLittleGuy1.addPrereq(pop1);
        this.upgradeTree.set(extraLittleGuy1.id, extraLittleGuy1);

        const extraLittleGuy2 = new Upgrade(
            "extra_little_guy_2",
            "Cultura laboris",
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
            "Servitus non remunerata",
            StringUtils.dedent(
                `Start an intern program that pays workers in experience and <i>exposure</i>.
                Exposure to what, exactly, is not specified in the contract.`
            ),
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
            StringUtils.dedent(
                `The artifact you discovered belonged to The Founder and, according to your
                researchers, the reclamation will drive employees to new heights of devotion to The
                Company.`
            ),
            ["Unlock the potential of The Artifact"],
            9999,
            () => {
                this.religion = true;
                Story.instance.onReligionUnlocked();
            }
        );
        religion.addPrereq(moreAspis2);
        religion.addPrereq(progressGate2);
        this.upgradeTree.set(religion.id, religion);

        const afterlife = new Upgrade(
            "afterlife",
            "Supra Vita",
            StringUtils.dedent(
                `Your researchers manage to unlock two new planes of existence that workers can
                enter after death. The first is a place of eternal bliss, and the other is a little
                different.`
            ),
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
            "Ruptis passionis",
            StringUtils.dedent(
                `The Artifact allows The Company's most loyal servents to concentrate and violently
                disperse their remaining life force during their passage to another plane.`
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
            "Crebrae eruptiones",
            StringUtils.dedent(`Passion and loyalty to The Company is infectious.`),
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
            "Magnae eruptiones",
            StringUtils.dedent(
                `A researcher disappears into the artifact for three days. When she returns, she is
                in a trance-like state, muttering a chant ad infinitum. After some testing, it is
                discovered that this chant, when performed just prior to death, magnifies the energy
                of ones crossing.`
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
            "Immaculata conceptionis",
            StringUtils.dedent(
                `The power of The Artifact is such that it can create life from nothing.`
            ),
            ["New workers begin to manifest without your intervention"],
            6678,
            () => {
                this.conceptionIntervalMs = 8000;
            }
        );
        spawning1.addPrereq(religion);
        this.upgradeTree.set(spawning1.id, spawning1);

        const spawning2 = new Upgrade(
            "spawning_2",
            "Beati lumbi",
            StringUtils.dedent(
                `Your researchers refine the ritual that creates new life, reducing the time it
                takes to perform it by half.`
            ),
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
            "Varia sacrificia",
            StringUtils.dedent(
                `Your researchers find that sacrificing a greater variety of creatures results in a
                significant increase in output of the creation ritual.`
            ),
            ["You are blessed with thrice as many new congregants joining your efforts"],
            10323,
            () => {
                this.conceptionIntervalMs = Math.round(this.conceptionIntervalMs * 0.3);
            }
        );
        spawning3.addPrereq(spawning2);
        this.upgradeTree.set(spawning3.id, spawning3);

        const tithing1 = new Upgrade(
            "tithe_1",
            "Decimae",
            StringUtils.dedent(
                `The Leader requests some Aspis. You get a sense that this is not the type of
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
            "Decimam iterum",
            StringUtils.dedent(
                `The Leader notices that your coffers are looking quite full. It's time to give
                again.`
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
            "Decimam in perpetuum",
            StringUtils.dedent(
                `The Company helpfully updates its official policy on offerings: <q>Gimme that.</q>
                <br><br>
                You feel driven to comply.`
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
            "Augmentum conatus",
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
            "A serpente proditus",
            StringUtils.dedent(
                `A tome with a cover consisting of a gilded snake twisted around a depiction of The
                Artifact was discovered conspicously placed on the desk of one of your researchers.
                They claim to have no knowledge of how it arrived there.
                <br><br>
                The book almost certainly contains Forbidden Knowledge, which you vaguely remember
                being mentioned during your orientation at The Company.`
            ),
            ["Unlocks the Serpent research wing"],
            911,
            () => {
                this.serpent = true;
                Story.instance.onSerpentUnlocked();
            }
        );
        serpent.addPrereq(spawning3);
        serpent.addPrereq(tithing3);
        this.upgradeTree.set(serpent.id, serpent);

        const eggHandling = new Upgrade(
            "egg_handling",
            "Ovum laetum",
            StringUtils.dedent(
                `All those who lay their hand upon the tome are drawn to The Egg. They feel a great
                sense of comfort standing upon it, which is in stark contrast to those that were
                instead bursting into flames as soon as they alit upon it.`
            ),
            ["Allows workers to exist near The Egg."],
            191,
            () => {
                this.eggHandling = true;
            }
        );
        eggHandling.addPrereq(progressGate3);
        eggHandling.addPrereq(serpent);
        this.upgradeTree.set(eggHandling.id, eggHandling);

        const digSpeed6 = new Upgrade(
            "dig_speed_6",
            "Ritus violentus",
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
            "Suus simplex res",
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

        const shields = new Upgrade(
            Upgrades.SHIELDS_ID,
            "Anguis scutum",
            StringUtils.dedent(
                `Your researchers pitch into the war effort by developing a personel shield that
                can briefly protect workers from The Serpent's wrath.`
            ),
            ["Unlocks the Shield ability"],
            25000,
            () => {
                this.shieldsUnlocked = true;
            }
        );
        shields.addPrereq(progressGate4);
        this.upgradeTree.set(shields.id, shields);

        const finalPush = new Upgrade(
            "final_push",
            "Impetus finalis",
            StringUtils.dedent(
                `Throw all you've got at it for the final push to defeat The Serpent and save The
                Company.`
            ),
            [
                "Digging is 1.5x faster",
                "New followers are manifested 1.35x more frequently",
                "Increases the explosion rate to 40%",
            ],
            49110,
            () => {
                this.digSpeed *= 1.5;
                this.conceptionIntervalMs *= 0.74;
                this.explosionChance = 0.4;
            }
        );
        finalPush.addPrereq(digSpeed7);
        finalPush.addPrereq(eggHandling);
        finalPush.addPrereq(progressGate4);
        this.upgradeTree.set(finalPush.id, finalPush);
    }
}
