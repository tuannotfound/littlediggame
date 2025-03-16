import Dialogs from "./dialogs.js";

export default class Story {
    static _instance;

    static FOREMAN_NAME = "Foreman";
    static FOREMAN_AVATAR_PATH = "assets/foreman_avatar.png";
    static FOREMAN_DIAMONDS_AVATAR_PATH = "assets/foreman_diamonds_avatar.png";
    static RESEARCHER_NAME = "Researcher";
    static RESEARCHER_AVATAR_PATH = "assets/researcher_avatar.png";

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
}
