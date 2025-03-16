import Dialogs from "./dialogs.js";

export default class Story {
    static _instance;

    static FOREMAN_NAME = "Foreman";
    static FOREMAN_AVATAR_PATH = "assets/foreman_avatar.png";
    static RESEARCHER_NAME = "Researcher";
    static RESEARCHER_AVATAR_PATH = "assets/researcher_avatar.png";

    constructor() {
        if (Story._instance) {
            return Story._instance;
        }
        Story._instance = this;

        this.sonDead = false;
        this.researchIntroduced = false;
    }

    static get instance() {
        return Story._instance || new Story();
    }

    showIntro() {
        Dialogs.show(
            Story.FOREMAN_NAME,
            `Welcome aboard! The Company decided to start you off on a small planet, but I
            read your resume so <i>I</i> know <i>you</i> know the drill: extract the
            resources, leave nothing behind, and on to the next one.<br>
            Us fellas in your crew are ready and excited to throw all we've got at it, so let's get
            started, boss-man.`,
            Story.FOREMAN_AVATAR_PATH,
            30
        );
    }

    maybeForemansSonDead() {
        if (this.sonDead) {
            return;
        }
        if (Dialogs.hasVisibleDialog) {
            // Don't want to queue this up, timing is important.
            return;
        }
        if (Math.random() > 0.8) {
            return;
        }
        this.sonDead = true;

        Dialogs.show(
            Story.FOREMAN_NAME,
            `That was my son. He served The Company well. I'll miss him.`,
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
            30
        );
    }
}
