import StringUtils from "./string_utils.js";

import "./dialogs.css";
import "./timer_bar.css";

export default class Dialogs {
    static MIN_CALCULATED_DURATION_S = 5;
    static DEFAULT_DURATION_S = 10;
    static WORDS_PER_SECOND = 1.7;
    static SECONDS_PER_BREAK = 1;
    static sDialogQueue = [];
    static sPaused = false;

    static pause() {
        Dialogs.sPaused = true;
        if (Dialogs.sDialogQueue.length > 0) {
            Dialogs.sDialogQueue[0].pauseTimer();
        }
    }

    static resume() {
        Dialogs.sPaused = false;
        if (Dialogs.sDialogQueue.length > 0) {
            Dialogs.sDialogQueue[0].show();
            Dialogs.sDialogQueue[0].resumeTimer();
        }
    }

    static calculateDurationSeconds(msg) {
        if (msg.length == 0) {
            return Dialogs.DEFAULT_DURATION_S;
        }
        const lineBreakTag = "<br>";
        let breakCount = 0;
        let index = msg.indexOf(lineBreakTag);

        while (index !== -1) {
            breakCount++;
            index = msg.indexOf(lineBreakTag, index + lineBreakTag.length);
        }

        const wordCount = msg.split(/\s+/).filter((word) => word.length > 0).length;
        const calculatedDurationS = Math.ceil(
            wordCount / Dialogs.WORDS_PER_SECOND + breakCount * Dialogs.SECONDS_PER_BREAK
        );
        return Math.max(Dialogs.MIN_CALCULATED_DURATION_S, calculatedDurationS);
    }

    static show(
        title,
        msg,
        avatarPath,
        durationS = -1,
        shownCallback = () => {},
        dismissCallback = () => {}
    ) {
        const dedentedMsg = StringUtils.dedent(msg);
        if (durationS <= 0) {
            durationS = Dialogs.calculateDurationSeconds(dedentedMsg);
        }
        const dialog = new Dialog.Builder(document.getElementById("overlay"))
            .withAvatar(avatarPath) // Optional
            .withTitle(title)
            .withMessage(dedentedMsg)
            .withDuration(durationS)
            .withShownCallback(shownCallback)
            .withDismissCallback(() => {
                Dialogs.onDialogDismissed();
                dismissCallback();
            })
            .build();
        Dialogs.sDialogQueue.push(dialog);
        if (Dialogs.sPaused || Dialogs.sDialogQueue.length > 1) {
            // Must wait for the queue to reach this new dialog or to resume dialogs.
            return;
        }
        // We're the only dialog queued, show now.
        dialog.show();
    }

    static onDialogDismissed() {
        Dialogs.sDialogQueue.shift();
        if (Dialogs.sDialogQueue.length > 0) {
            Dialogs.sDialogQueue[0].show(Dialogs.sDialogQueue[0].container);
        }
    }

    static get hasVisibleDialog() {
        return Dialogs.sDialogQueue.length > 0;
    }

    static clearAll() {
        Dialogs.sDialogQueue.forEach((dialog) => {
            dialog.dismiss();
        });
    }
}

class Dialog {
    // To prevent accidental dismissals of dialogs as soon as they appear, prevent dismissal for
    // some short duration.
    static DISMISSABLE_DELAY_MS = 750;

    constructor(builder) {
        this.container = builder.container;
        this.dialogRoot = document.createElement("div");
        this.dialogRoot.classList.add("dialog-root");

        this.dialog = document.createElement("div");
        this.dialog.classList.add("dialog");

        if (builder.avatarSrc) {
            this.avatar = document.createElement("img");
            this.avatar.classList.add("dialog-avatar");
            this.avatar.src = builder.avatarSrc;
            this.dialog.appendChild(this.avatar);
        }

        this.content = document.createElement("div");
        this.content.classList.add("dialog-content");

        this.titleContainer = document.createElement("div");
        this.titleContainer.classList.add("dialog-title");
        this.title = document.createElement("h3");
        this.title.innerHTML = builder.title;
        this.titleContainer.appendChild(this.title);
        this.content.appendChild(this.titleContainer);

        this.message = document.createElement("p");
        this.message.classList.add("dialog-message");
        this.message.innerHTML = builder.message;
        this.content.appendChild(this.message);

        this.dialog.appendChild(this.content);

        this.timerBar = document.createElement("div");
        this.timerBar.classList.add("timer-bar");
        this.dialog.appendChild(this.timerBar);

        this.dialogRoot.appendChild(this.dialog);

        this.shownCallback = builder.shownCallback;

        this.durationS = builder.durationS;
        this.dismissCallback = builder.dismissCallback;
        this.dismissed = false;

        this.shown = false;
        this.timerStarted = false;
        this.timerPausedTime = null;
        this.timerInterval = null;

        this.dialog.addEventListener("click", () => {
            if (!this.timerStarted || this.dismissed) {
                return;
            }
            this.dismiss();
        });
    }

    static get Builder() {
        class Builder {
            constructor(container) {
                this.container = container;
                this.avatarSrc = null;
                this.title = "";
                this.message = "";
                this.durationS = Dialogs.DEFAULT_DURATION_S;
                this.shownCallback = null;
                this.dismissCallback = null;
            }

            withAvatar(avatarSrc) {
                this.avatarSrc = avatarSrc;
                return this;
            }

            withTitle(title) {
                this.title = title;
                return this;
            }

            withMessage(message) {
                this.message = message;
                return this;
            }

            withDuration(durationS) {
                if (durationS) {
                    this.durationS = durationS;
                }
                return this;
            }

            withShownCallback(shownCallback) {
                this.shownCallback = shownCallback;
                return this;
            }

            withDismissCallback(dismissCallback) {
                this.dismissCallback = dismissCallback;
                return this;
            }

            build() {
                return new Dialog(this);
            }
        }
        return Builder;
    }

    startTimer() {
        this.timerStarted = true;
        this.timerStartTime = performance.now();
        this.dialog.classList.add("dismissable");
        this.timerInterval = setInterval(() => {
            this.updateTimer();
        }, 100);
    }

    pauseTimer() {
        if (!this.timerStarted || this.timerPausedTime) {
            return;
        }
        this.timerPausedTime = performance.now();
        clearInterval(this.timerInterval);
    }

    resumeTimer() {
        if (!this.timerStarted || !this.timerPausedTime) {
            return;
        }
        this.timerStartTime += performance.now() - this.timerPausedTime;
        this.timerPausedTime = null;
        this.timerInterval = setInterval(() => {
            this.updateTimer();
        }, 100);
    }

    updateTimer() {
        if (this.dismissed) {
            return;
        }
        const elapsed = performance.now() - this.timerStartTime;
        const progress = Math.min(1, elapsed / (1000 * this.durationS));
        this.timerBar.style.width = `${(1 - progress) * 100}%`;

        if (progress >= 1) {
            this.dismiss();
        }
    }

    dismiss() {
        if (this.dismissed) {
            return;
        }
        this.dismissed = true;
        clearInterval(this.timerInterval);
        this.dialogRoot.remove();
        if (this.dismissCallback) {
            this.dismissCallback();
        }
    }

    show() {
        if (this.shown) {
            return;
        }
        this.shown = true;
        this.container.appendChild(this.dialogRoot);
        if (this.shownCallback) {
            this.shownCallback(this);
        }
        setTimeout(() => {
            this.startTimer();
        }, Dialog.DISMISSABLE_DELAY_MS);
    }
}
