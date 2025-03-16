import Dialogs from "./dialogs.js";

export default class Story {
    static _instance;

    static FOREMAN_NAME = "Foreman";
    static FOREMAN_AVATAR_PATH = "assets/foreman_avatar.png";
    static FOREMAN_DIAMONDS_AVATAR_PATH = "assets/foreman_diamonds_avatar.png";
    static RESEARCHER_NAME = "Researcher";
    static RESEARCHER_AVATAR_PATH = "assets/researcher_avatar.png";
    static SERPENT_DISGUISE_NAME = "Shep Trente";
    static SERPENT_DISGUISE_AVATAR_PATH = "assets/serpent_disguise_avatar.png";
    static SERPENT_PARTIAL_DISGUISE_NAME = this.SERPENT_DISGUISE_NAME + "?";
    static SERPENT_PARTIAL_DISGUISE_AVATAR_PATH = "assets/serpent_partial_disguise_avatar.png";
    static SERPENT_NAME = "The Serpent";
    static SERPENT_AVATAR_PATH = "assets/serpent_avatar.png";

    static IMAGE_PATHS = [Story.FOREMAN_AVATAR_PATH, Story.RESEARCHER_AVATAR_PATH];

    constructor() {
        if (Story._instance) {
            return Story._instance;
        }
        Story._instance = this;

        this.preloaded = false;

        this.maybeSonDeadCount = 0;
        this.sonDead = false;
        this.researchIntroduced = false;
        this.halfwayReached = false;
        this.firstDiamond = false;
        this.foremanDead = false;
        this.eggPlanetQ1 = false;
        this.eggPlanetQ2 = false;
        this.eggPlanetQ3 = false;
        this.eggReveal1 = false;
        this.eggReveal2 = false;
    }

    static get instance() {
        return Story._instance || new Story();
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
        Dialogs.show(
            Story.FOREMAN_NAME,
            `You know the drill: extract the resources, leave nothing behind, and then on to the
            next one.<br>
            Let's get started, boss-man.`,
            Story.FOREMAN_AVATAR_PATH,
            30
        );
    }

    maybeForemansSonDead() {
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
            Story.FOREMAN_NAME + " (bereaved)",
            `That was my son.<br><br>
            He served The Company well.`,
            Story.FOREMAN_AVATAR_PATH,
            8
        );
    }

    maybeIntroduceResearch() {
        if (this.researchIntroduced) {
            return;
        }
        this.researchIntroduced = true;
        Dialogs.show(
            Story.RESEARCHER_NAME,
            `The mobile research lab has been quite productive. Please visit at your earliest
            convenience so we can share with you what we've been working on.`,
            Story.RESEARCHER_AVATAR_PATH,
            15
        );
    }

    maybeHalfway() {
        if (this.halfwayReached) {
            return;
        }
        this.halfwayReached = true;
        Dialogs.show(
            Story.FOREMAN_NAME,
            `The bad news is we've had a 100% workplace mortality rate, but the good news is we're
            halfway done with this project and morale is sky high.`,
            Story.FOREMAN_AVATAR_PATH,
            15
        );
    }

    maybeFirstDiamond() {
        if (this.firstDiamond) {
            return;
        }
        this.firstDiamond = true;
        Dialogs.show(
            Story.FOREMAN_NAME,
            `The eggheads in the lab were really onto something with these diamonds. Have you held
            one? Makes me feel mighty powerful.`,
            Story.FOREMAN_DIAMONDS_AVATAR_PATH,
            10
        );
    }

    onSwissPlanet() {
        Dialogs.show(
            Story.FOREMAN_NAME,
            `Looks like we're not the first crew to be assigned this planet. I'm sure we'll have
            better luck, just keep that respirator on.`,
            Story.FOREMAN_AVATAR_PATH,
            15
        );
    }

    onSpikyPlanet() {
        Dialogs.show(
            Story.FOREMAN_NAME,
            `This should be a nice change of pace. The air is cold but clean. I think the crew will
            really enjoy living out the remainder of their days here.`,
            Story.FOREMAN_AVATAR_PATH,
            15
        );
    }

    maybeDeathOfForeman() {
        if (this.foremanDead) {
            return;
        }
        this.foremanDead = true;
        Dialogs.show(
            Story.FOREMAN_NAME,
            `Just between me, you, and The Company: I think we've made a great team. Big things to
            come, for us. Biiiiiig things. And the best part? Nothing can stop us.`,
            Story.FOREMAN_AVATAR_PATH,
            15,
            () => {
                setTimeout(() => {
                    Dialogs.show(
                        Story.SERPENT_DISGUISE_NAME,
                        `I regret to inform you that your previouss foreman fell down a hole and
                        perished.
                        <br><br>
                        It'ss a dangerouss line of work. I'll be your new foreman. Pleased to meet
                        you.`,
                        Story.SERPENT_DISGUISE_AVATAR_PATH,
                        15
                    );
                }, 1000);
            }
        );
    }

    onEggPlanet() {
        Dialogs.show(
            Story.SERPENT_DISGUISE_NAME,
            `I personally located this next planet for uss. What luck. A perfectly hosspitable place
            for uss humanss to work and bassk.`,
            Story.SERPENT_DISGUISE_AVATAR_PATH,
            15
        );
    }

    maybeEggPlanetQ1() {
        if (this.eggPlanetQ1) {
            return;
        }
        this.eggPlanetQ1 = true;
        Dialogs.show(
            Story.SERPENT_DISGUISE_NAME,
            `The Company knowss not the myssteriess of the universe. Do not let them or their
            "sscientistss" fool you.`,
            Story.SERPENT_DISGUISE_AVATAR_PATH,
            15
        );
    }

    maybeEggPlanetQ2() {
        if (this.eggPlanetQ2) {
            return;
        }
        this.eggPlanetQ2 = true;
        Dialogs.show(
            Story.SERPENT_DISGUISE_NAME,
            `Pay no attention to the incredible power emanating from within thiss planet. Let it not
            disstract you from the important work at hand, extracting human currency for your...
            our... beloved Company.`,
            Story.SERPENT_DISGUISE_AVATAR_PATH,
            15
        );
    }

    maybeEggPlanetQ3() {
        if (this.eggPlanetQ3) {
            return;
        }
        this.eggPlanetQ3 = true;
        Dialogs.show(
            Story.SERPENT_PARTIAL_DISGUISE_NAME,
            `Quiet! Itss sssong sssibilatessss. The great conssstriction is nigh.`,
            Story.SERPENT_PARTIAL_DISGUISE_AVATAR_PATH,
            10
        );
    }

    maybeEggReveal1() {
        if (this.eggReveal1) {
            return;
        }
        this.eggReveal1 = true;
        Dialogs.show(
            Story.SERPENT_PARTIAL_DISGUISE_NAME,
            `YES. The crew is vibrating with thirssst for the earth. Dig! Dig faster! More!`,
            Story.SERPENT_PARTIAL_DISGUISE_AVATAR_PATH,
            6
        );
    }

    maybeEggReveal2() {
        if (this.eggReveal2) {
            return;
        }
        this.eggReveal2 = true;
        Dialogs.show(
            Story.SERPENT_PARTIAL_DISGUISE_NAME,
            `You ssssee it now, do you? Your purpose. Proceed with abandon.`,
            Story.SERPENT_PARTIAL_DISGUISE_AVATAR_PATH,
            10
        );
    }
}
