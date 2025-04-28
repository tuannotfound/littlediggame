// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import Dialogs from "./dialogs.js";
import AnagramRevealer from "./anagram_revealer.js";

export default class Story {
    static _instance;

    static FOREMAN_NAME = "Foreman";
    static FOREMAN_AVATAR_PATH = "assets/foreman_avatar.png";
    static FOREMAN_DIAMONDS_AVATAR_PATH = "assets/foreman_diamonds_avatar.png";
    static RESEARCHER_NAME = "Researcher";
    static RESEARCHER_AVATAR_PATH = "assets/researcher_avatar.png";
    static RESEARCHER_SEMI_RELIGIOUS_NAME = "Enlightened Seeker";
    static RESEARCHER_SEMI_RELIGIOUS_AVATAR_PATH = "assets/researcher_semi_religious_avatar.png";
    static RESEARCHER_RELIGIOUS_NAME = "Hierophantic Apostle";
    static RESEARCHER_RELIGIOUS_AVATAR_PATH = "assets/researcher_religious_avatar.png";
    static SERPENT_DISGUISE_NAME = "Shep Trente";
    static SERPENT_DISGUISE_AVATAR_PATH = "assets/serpent_disguise_avatar.png";
    static SERPENT_PARTIAL_DISGUISE_NAME = Story.SERPENT_DISGUISE_NAME + "?";
    static SERPENT_PARTIAL_DISGUISE_AVATAR_PATH = "assets/serpent_partial_disguise_avatar.png";
    static SERPENT_NAME = "The Serpent";
    static SERPENT_AVATAR_PATH = "assets/serpent_avatar.png";
    static SERPENT_DEATH_AVATAR_PATH = "assets/serpent_death_avatar.png";
    static COMPANY_COMMUNICATION_NAME = "The Company (remote)";
    static COMPANY_COMMUNICATION_AVATAR_PATH = "assets/company_communication_avatar.png";
    static COMPANY_LEADER_NAME = "The Almighty Leader";
    static COMPANY_LEADER_AVATAR_PATH = "assets/company_leader_avatar.png";
    static COMPANY_LEADER_CENSORED_AVATAR_PATH = "assets/company_leader_censored_avatar.png";
    static COMPANY_LEADER_DEATH_AVATAR_PATH = "assets/company_leader_death_avatar.png";
    static COMPANY_LEADER_CENSORED_DEATH_AVATAR_PATH =
        "assets/company_leader_censored_death_avatar.png";
    static GAME_DEV_NAME = "Alec (Game Dev)";
    static GAME_DEV_AVATAR_PATH = "assets/dev_avatar.png";

    static IMAGE_PATHS = [
        Story.FOREMAN_AVATAR_PATH,
        Story.RESEARCHER_AVATAR_PATH,
        Story.RESEARCHER_SEMI_RELIGIOUS_AVATAR_PATH,
        Story.RESEARCHER_RELIGIOUS_AVATAR_PATH,
        Story.SERPENT_DISGUISE_AVATAR_PATH,
        Story.SERPENT_PARTIAL_DISGUISE_AVATAR_PATH,
        Story.SERPENT_AVATAR_PATH,
        Story.SERPENT_DEATH_AVATAR_PATH,
        Story.COMPANY_COMMUNICATION_AVATAR_PATH,
        Story.COMPANY_LEADER_AVATAR_PATH,
        Story.COMPANY_LEADER_CENSORED_AVATAR_PATH,
        Story.COMPANY_LEADER_DEATH_AVATAR_PATH,
        Story.COMPANY_LEADER_CENSORED_DEATH_AVATAR_PATH,
        Story.GAME_DEV_AVATAR_PATH,
    ];

    constructor() {
        if (Story._instance) {
            return Story._instance;
        }
        Story._instance = this;

        this.serpentName = Story.SERPENT_DISGUISE_NAME;
        this.serpentAvatarPath = Story.SERPENT_DISGUISE_AVATAR_PATH;
        this.foremanAvatarPath = Story.FOREMAN_AVATAR_PATH;
        this.researcherName = Story.RESEARCHER_NAME;
        this.researcherAvatarPath = Story.RESEARCHER_AVATAR_PATH;

        this.preloaded = false;

        this.introShown = false;
        this.maybeSonDeadCount = 0;
        this.sonDead = false;
        this.researchIntroduced = false;
        this.firstPlanet1 = false;
        this.firstPlanet2 = false;
        this.firstDiamond = false;
        this.foremanDead = false;
        this.magicRevealed = false;
        this.magicDiscoveryInProgress = false;
        this.magicDiscoveryInterrupted = false;
        this.magicDiscovered = false;
        this.eggPlanet1 = false;
        this.eggPlanet2 = false;
        this.eggPlanet3 = false;
        this.eggPlanet4 = false;
        this.eggPlanet5 = false;
        this.serpentUnlocked = false;
        this.eggReveal1 = false;
        this.eggReveal2 = false;
        this.serpent1 = false;
        this.serpent2 = false;
        this.serpent3 = false;
        this.serpent4 = false;
        this.serpent5 = false;
        this.serpent6 = false;
    }

    static fromJSON(json) {
        const story = new Story();
        Object.assign(story, json);
        story.preloaded = false;
        story.magicDiscoveryInProgress = false;
        return story;
    }

    static get instance() {
        return Story._instance || new Story();
    }

    get leaderAvatarPath() {
        if (window.SETTINGS.censor) {
            return Story.COMPANY_LEADER_CENSORED_AVATAR_PATH;
        }
        return Story.COMPANY_LEADER_AVATAR_PATH;
    }

    preload() {
        if (this.preloaded) {
            return;
        }
        this.preloaded = true;
        Promise.all(
            Story.IMAGE_PATHS.map(
                (path) =>
                    new Promise((resolve) => {
                        const img = new Image();
                        img.onload = resolve;
                        img.src = path;
                    })
            )
        ).then(() => {
            console.log("Story assets loaded");
        });
    }

    showIntro() {
        if (this.introShown) {
            return;
        }
        this.introShown = true;
        Dialogs.show(
            Story.FOREMAN_NAME,
            `You know the drill: extract the resources, leave nothing behind, and then on to the
            next one.
            <br><br>
            Just be careful with your budget. Remember: the more workers you have active, the more
            expensive it is to bring more onboard. Pace yourself.
            <br><br>
            Let's get started, boss-man.`,
            this.foremanAvatarPath
        );
    }

    maybeForemansSonDead() {
        if (this.foremanDead) {
            return;
        }
        if (this.sonDead) {
            return;
        }
        this.maybeSonDeadCount++;
        if (this.maybeSonDeadCount <= 3) {
            // Don't want to show it too soon before they have a chance to recognize the tombstones.
            return;
        }
        if (Dialogs.hasVisibleDialog) {
            // Don't want to queue this up, timing is important.
            return;
        }
        if (Math.random() > 0.5) {
            return;
        }
        this.sonDead = true;

        Dialogs.show(
            Story.FOREMAN_NAME + " (mildly bereaved)",
            `That was my son.<br><br>
            He served The Company well.`,
            this.foremanAvatarPath,
            8
        );
    }

    maybeIntroduceResearch() {
        if (this.researchIntroduced) {
            return;
        }
        this.researchIntroduced = true;
        Dialogs.show(
            this.researcherName,
            `The mobile research lab has been quite productive. Please visit at your earliest
            convenience so we can share with you what we've been working on.`,
            this.researcherAvatarPath
        );
    }

    maybeFirstPlanet1(health) {
        if (this.firstPlanet1) {
            return;
        }
        if (health > 0.68) {
            return;
        }
        this.firstPlanet1 = true;
        Dialogs.show(
            Story.SERPENT_NAME,
            `Ssssssssssssssssssssssss.`,
            Story.SERPENT_AVATAR_PATH,
            0.25,
            () => {},
            () => {
                setTimeout(() => {
                    Dialogs.show(
                        Story.FOREMAN_NAME,
                        `Did you hear that? I didn't think there was anyone else here.`,
                        this.foremanAvatarPath
                    );
                }, 500);
            }
        );
    }

    maybeFirstPlanet2(health) {
        if (this.firstPlanet2) {
            return;
        }
        if (health > 0.5) {
            return;
        }
        this.firstPlanet2 = true;
        Dialogs.show(
            Story.FOREMAN_NAME,
            `The bad news is we've had a 100% workplace mortality rate, but the good news is we're
            halfway done with this project and morale is sky high.`,
            this.foremanAvatarPath
        );
    }

    maybeFirstDiamond() {
        if (this.foremanDead) {
            return;
        }
        if (this.firstDiamond) {
            return;
        }
        this.firstDiamond = true;
        this.foremanAvatarPath = Story.FOREMAN_DIAMONDS_AVATAR_PATH;
        Dialogs.show(
            Story.FOREMAN_NAME,
            `The eggheads in the lab were really onto something with these diamonds. Have you held
            one? Makes me feel mighty powerful.`,
            this.foremanAvatarPath
        );
    }

    onSwissPlanet() {
        Dialogs.show(
            Story.FOREMAN_NAME,
            `Looks like we're not the first crew to be assigned this planet. I'm sure we'll have
            better luck, just keep that respirator on.`,
            this.foremanAvatarPath
        );
    }

    maybeSwissPlanet1(health) {
        if (this.swissPlanet1) {
            return;
        }
        if (health > 0.75) {
            return;
        }
        this.swissPlanet1 = true;
        Dialogs.show(
            Story.COMPANY_COMMUNICATION_NAME,
            `The Company would like to commend you for your swift retrieval of value from your first
            assignments.
            <br><br>
            Consider yourself commended.`,
            Story.COMPANY_COMMUNICATION_AVATAR_PATH
        );
    }

    onSpikyPlanet() {
        if (this.foremanDead) {
            return;
        }
        Dialogs.show(
            Story.FOREMAN_NAME,
            `This should be a nice change of pace. The air is cold but clean. Just be careful around
            those crevasses.`,
            this.foremanAvatarPath
        );
    }

    maybeDeathOfForeman(health) {
        if (this.foremanDead) {
            return;
        }
        if (health > 0.3) {
            return;
        }
        this.foremanDead = true;
        Dialogs.show(
            Story.FOREMAN_NAME,
            `Just between you, me, and The Company: I think we've made a great team. Big things to
            come, for us. Biiiiiig things.`,
            this.foremanAvatarPath,
            -1,

            () => {},
            () => {
                setTimeout(() => {
                    Dialogs.show(
                        Story.SERPENT_NAME,
                        `Ssssssssssssssssssssssss.`,
                        Story.SERPENT_AVATAR_PATH,
                        0.25,

                        () => {},
                        () => {
                            setTimeout(() => {
                                Dialogs.show(
                                    this.serpentName,
                                    `I regret to inform you that your previous foreman fell down a
                                    hole and perished.
                                    <br><br>
                                    It's a dangerous line of work. I'll be your new foreman. Pleased
                                    to meet you.`,
                                    this.serpentAvatarPath
                                );
                            }, 500);
                        }
                    );
                }, 500);
            }
        );
    }

    onMagicRevealed() {
        if (this.magicRevealed) {
            return;
        }
        this.magicRevealed = true;

        let name = this.foremanDead ? this.serpentName : Story.FOREMAN_NAME;
        let avatarPath = this.foremanDead ? this.serpentAvatarPath : this.foremanAvatarPath;
        Dialogs.show(
            name,
            `What is that thing? Send some workers to go dig it up. I expect the researchers will
            be interested in taking a closer look.`,
            avatarPath
        );
    }

    onMagicDiscovered(analysisCompleteCallback) {
        if (this.magicDiscovered || this.magicDiscoveryInProgress) {
            return;
        }
        // We do this because if the user quits before this sequence finishes and then reloads,
        // they would never see the dialog again and thus never finish the magic discovery if we
        // were only checking and setting magicDiscovered. So introduce the 'in progress' member
        // that we can use to avoid showing the dialog multiple times, but reset it when loading
        // from JSON.
        this.magicDiscoveryInProgress = true;
        this.magicDiscoveryInterrupted = true;
        Dialogs.show(
            this.researcherName,
            `This appears to be an empyrean artifact with potentially massive ramifications for
            our understanding of the cosmos. We'll need some time to study it.`,
            this.researcherAvatarPath,
            -1,
            () => {},
            () => {
                setTimeout(() => {
                    // To get past the check in onMagicAnalyzed:
                    this.magicDiscoveryInProgress = false;
                    this.onMagicAnalyzed(analysisCompleteCallback);
                }, 5000);
            }
        );
    }

    onMagicAnalyzed(analysisCompleteCallback) {
        if (this.magicDiscoveryInProgress) {
            return;
        }
        this.magicDiscoveryInProgress = true;
        Dialogs.show(
            this.researcherName,
            `Our analysis of the artifact you discovered is complete. I must urge you to visit us in
            the research lab so we can demonstrate just how significantly it has broadened our
            potential.
            <br><br>
            Oh, and bring cash.`,
            this.researcherAvatarPath,
            -1,
            () => {},
            () => {
                this.magicDiscoveryInProgress = false;
                this.magicDiscoveryInterrupted = false;
                this.magicDiscovered = true;
                analysisCompleteCallback();
            }
        );
    }

    onReligionUnlocked() {
        if (this.religionUnlocked) {
            return;
        }
        this.religionUnlocked = true;
        this.researcherName = Story.RESEARCHER_SEMI_RELIGIOUS_NAME;
        this.researcherAvatarPath = Story.RESEARCHER_SEMI_RELIGIOUS_AVATAR_PATH;
        Dialogs.show(
            this.researcherName,
            `We at the lab consider ourselves fortunate to recieve your funding at such a
            providential time`,
            this.researcherAvatarPath
        );
    }

    onEggPlanet() {
        Dialogs.show(
            this.serpentName,
            `I personally located this next planet for us. What luck. A perfectly hospitable place
            for us humans to work and bask.`,
            this.serpentAvatarPath
        );
    }

    maybeEggPlanet1(health) {
        if (this.eggPlanet1) {
            return;
        }
        if (health > 0.8) {
            return;
        }
        this.eggPlanet1 = true;
        Dialogs.show(
            Story.COMPANY_COMMUNICATION_NAME,
            `This has been deemed a Forbidden Planet. Please collect your tools and valuables and
            move on to your next assignment. Do not panic.
            <br><br>
            This has been deemed a Forbidden Planet. Please collect your tools and valuables and
            move on to your next assignment. Do not panic.`,
            Story.COMPANY_COMMUNICATION_AVATAR_PATH,
            20,

            () => {},
            () => {
                setTimeout(() => {
                    Dialogs.show(
                        this.serpentName,
                        `The Company must be mistaken. Worry not - I've requested a reevaluation on
                        your behalf, and I'm sure they'll approve it shortly.`,
                        this.serpentAvatarPath
                    );
                }, 500);
            }
        );
    }

    maybeEggPlanet2(health) {
        if (this.eggPlanet2) {
            return;
        }
        if (health > 0.6) {
            return;
        }
        this.eggPlanet2 = true;
        Dialogs.show(
            this.serpentName,
            `Pay no attention to the incredible power emanating from within this planet. Let it not
            distract you from the important work at hand, extracting human currency for your...
            our... beloved Company.`,
            this.serpentAvatarPath
        );
    }

    maybeEggPlanet3(health) {
        if (this.eggPlanet3) {
            return;
        }
        if (health > 0.45) {
            return;
        }
        this.eggPlanet3 = true;

        Dialogs.show(
            Story.COMPANY_COMMUNICATION_NAME,
            `Your refusal to follow orders has been escalated. Dig operations must halt.`,
            Story.COMPANY_COMMUNICATION_AVATAR_PATH
        );
    }

    maybeEggPlanet4(health) {
        if (this.eggPlanet4) {
            return;
        }
        if (health > 0.25) {
            return;
        }
        this.serpentName = Story.SERPENT_PARTIAL_DISGUISE_NAME;
        this.serpentAvatarPath = Story.SERPENT_PARTIAL_DISGUISE_AVATAR_PATH;
        this.eggPlanet4 = true;
        Dialogs.show(this.serpentName, `The great conssstriction is nigh.`, this.serpentAvatarPath);
        Dialogs.show(
            this.researcherName,
            `We've been consulting with The Artifact and are becoming increasingly concerned that
            foreman ${Story.SERPENT_DISGUISE_NAME} is working against the will of The Company.`,
            this.researcherAvatarPath
        );
    }

    maybeEggReveal1(reveal, onShownCallback) {
        if (this.eggReveal1) {
            return;
        }
        if (reveal < 0.3) {
            return;
        }
        if (!this.eggPlanet2) {
            return;
        }
        this.eggReveal1 = true;
        Dialogs.show(
            this.serpentName,
            `YES. The crew is vibrating with thirssst for the earth. Dig! Dig faster! More!`,
            Story.SERPENT_PARTIAL_DISGUISE_AVATAR_PATH,
            6,
            () => {
                onShownCallback();
            }
        );
    }

    maybeEggReveal2(reveal) {
        if (this.eggReveal2) {
            return;
        }
        if (!this.eggReveal1) {
            return;
        }
        if (reveal < 0.6) {
            return;
        }
        this.eggReveal2 = true;
        Dialogs.show(
            this.serpentName,
            `You ssssee it now, do you? Your purpose. Proceed with abandon.`,
            Story.SERPENT_PARTIAL_DISGUISE_AVATAR_PATH,
            10
        );
    }

    onSerpentUnlocked() {
        if (this.serpentUnlocked) {
            return;
        }
        this.serpentUnlocked = true;
        this.researcherName = Story.RESEARCHER_RELIGIOUS_NAME;
        this.researcherAvatarPath = Story.RESEARCHER_RELIGIOUS_AVATAR_PATH;
        Dialogs.show(
            this.researcherName,
            `The path you embark on is not one of light. As your loyal subjects in the lab, we are
            bound to continue our work as you see fit, but I urge you to pursue this Serpent
            business no further.`,
            this.researcherAvatarPath
        );
        Dialogs.show(
            this.serpentName,
            `<q>The path you embark on is...</q> - pathetic. Knowledge is power, and the truth will
            ssset us all free.`,
            this.serpentAvatarPath
        );
    }

    maybeEggPlanet5(health) {
        if (this.eggPlanet5) {
            return;
        }
        if (health > 0.05) {
            return;
        }
        this.eggPlanet5 = true;
        Dialogs.show(
            Story.COMPANY_LEADER_NAME,
            `Cease all digging operations immediately.`,
            this.leaderAvatarPath,
            7
        );
        Dialogs.show(
            Story.COMPANY_LEADER_NAME,
            `We will all suffer for your actions.`,
            this.leaderAvatarPath,
            7
        );
    }

    onSerpent() {
        Dialogs.show(
            Story.SERPENT_NAME,
            `My body! My body is mine once again! You've assured my repossession.
            <br><br>
            I must consume.`,
            Story.SERPENT_AVATAR_PATH,
            15,
            (dialog) => {
                // Swap out the title with an anagram revealer.
                const anagramRevealer = new AnagramRevealer(
                    dialog.titleContainer,
                    Story.SERPENT_DISGUISE_NAME,
                    Story.SERPENT_NAME,
                    true,
                    6000
                );
                anagramRevealer.init("h3");
                setTimeout(() => {
                    anagramRevealer.reveal();
                }, 500);
            },
            () => {
                setTimeout(() => {
                    Dialogs.show(
                        Story.COMPANY_LEADER_NAME,
                        `If The Serpent completes its repossession ritual, nothing will be able to
                        stop it.
                        <br><br>
                        Bring the full brunt of your crew to bear upon its scales!`,
                        this.leaderAvatarPath
                    );
                }, 500);
            }
        );
    }

    maybeSerpent1(health) {
        if (this.serpent1) {
            return;
        }
        if (health > 0.95) {
            return;
        }
        this.serpent1 = true;
        // [D]ABDA
        Dialogs.show(
            Story.SERPENT_NAME,
            `What? What is this? What are you doing? You can't be trying to stop me. You can't be so
            naive.`,
            Story.SERPENT_AVATAR_PATH
        );
    }

    maybeSerpent2(health) {
        if (this.serpent2) {
            return;
        }
        if (health > 0.85) {
            return;
        }
        this.serpent2 = true;
        // D[A]BDA
        Dialogs.show(
            Story.SERPENT_NAME,
            `My tongue will dissolve the flesh from your bones! You will lament your actions.`,
            Story.SERPENT_AVATAR_PATH
        );
        Dialogs.show(
            this.researcherName,
            `I just want to tell you good luck. We're all counting on you.`,
            this.researcherAvatarPath
        );
    }

    maybeSerpent3(health) {
        if (this.serpent3) {
            return;
        }
        if (health > 0.75) {
            return;
        }
        this.serpent3 = true;
        // DA[B]DA
        Dialogs.show(
            Story.SERPENT_NAME,
            `If you stop now, I'll devour you and your crew last. Your Leader will sake my appetite
            for days, weeks even. That time could be yours.`,
            Story.SERPENT_AVATAR_PATH
        );
    }

    maybeSerpent4(health) {
        if (this.serpent4) {
            return;
        }
        if (health > 0.45) {
            return;
        }
        this.serpent4 = true;
        // DAB[D]A
        Dialogs.show(
            Story.SERPENT_NAME,
            `This sucks. This is just really no good at all.`,
            Story.SERPENT_AVATAR_PATH,
            8
        );
    }

    maybeSerpent5(health) {
        if (this.serpent5) {
            return;
        }
        if (health > 0.1) {
            return;
        }
        this.serpent5 = true;
        // DABD[A]
        Dialogs.show(
            Story.SERPENT_NAME,
            `Things could have gone differently. They really could have. But you can't say I didn't
            try my best.
            <br><br>
            Sure woulda been fun to devour the universe though. Dang.`,
            Story.SERPENT_AVATAR_PATH
        );
    }

    maybeSerpent6(health) {
        if (this.serpent6) {
            return;
        }
        if (health > 0.05) {
            return;
        }
        this.serpent6 = true;
        Dialogs.show(
            Story.COMPANY_LEADER_NAME,
            `You've nearly done it. Strike the final blows! Do not let up now!`,
            this.leaderAvatarPath,
            8
        );
    }

    onGameOver(won, dismissCallback) {
        if (won) {
            this.onGameWon(dismissCallback);
        } else {
            this.onGameLost(dismissCallback);
        }
        Dialogs.show(
            this.researcherName,
            `I just want to tell you good luck. We're all counting on you.`,
            this.researcherAvatarPath
        );
    }

    onGameLost(dismissCallback) {
        Dialogs.show(
            Story.SERPENT_NAME,
            `The ritual is complete! Full power has been returned to my body.
            <br><br>
            This is the beginning of the end for you and your Company, Leader.`,
            Story.SERPENT_AVATAR_PATH,
            -1
        );
        let path = window.SETTINGS.censor
            ? Story.COMPANY_LEADER_CENSORED_DEATH_AVATAR_PATH
            : Story.COMPANY_LEADER_DEATH_AVATAR_PATH;
        Dialogs.show(Story.COMPANY_LEADER_NAME, `Aaaaauuuugh!`, path, 8, dismissCallback);
    }

    onGameWon(dismissCallback) {
        Dialogs.show(
            Story.SERPENT_NAME,
            `Ssssssssss... it'ssss... all... sss... over...
            <br><br>
            ...sss.`,
            Story.SERPENT_DEATH_AVATAR_PATH,
            12
        );
        Dialogs.show(
            Story.COMPANY_LEADER_NAME,
            `We are victorious! I have defeated The Serpent!
            <br><br>
            The shareholders will be ecstatic. Double the rations for the crew for the NEXT!
            FOUR! DAYS!`,
            this.leaderAvatarPath,
            -1,
            dismissCallback
        );
    }

    thanks(stats, karma) {
        let plusSign = karma > 0 ? "+" : "";
        Dialogs.show(
            Story.GAME_DEV_NAME,
            `You played for ${stats.runtimeAsHMS}. In that time, you...
            <br><br>
            <i class="fa-solid fa-computer-mouse"></i> Clicked or tapped ${stats.clickCount} times
            <br>
            <i class="fa-solid fa-person-digging"></i> Oversaw the mining of ${stats.digCount} blocks
            <br>
            <i class="fa-solid fa-skull"></i> Expended the lives of ${stats.deathCount} loyal workers
            <br>
            <i class="fa-solid fa-hand-sparkles"></i> Finished with ${plusSign}${karma} karma`,
            Story.GAME_DEV_AVATAR_PATH,
            30
        );
        Dialogs.show(Story.GAME_DEV_NAME, `Thanks for playing!`, Story.GAME_DEV_AVATAR_PATH, 8);
    }
}
