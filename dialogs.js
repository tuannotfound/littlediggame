import StringUtils from "./string_utils.js";

export default class Dialogs {
    static DEFAULT_DURATION_S = 8;
    static sDialogQueue = [];

    static show(
        title,
        msg,
        avatarPath,
        durationS = DEFAULT_DURATION_S,
        dismissCallback = () => {}
    ) {
        let dialog = new Dialog.Builder(document.getElementById("overlay"))
            .withAvatar(avatarPath) // Optional
            .withTitle(title)
            .withMessage(StringUtils.dedent(msg))
            .withDuration(durationS)
            .withDismissCallback(() => {
                Dialogs.onDialogDismissed();
                dismissCallback();
            })
            .build();
        Dialogs.sDialogQueue.push(dialog);
        if (Dialogs.sDialogQueue.length > 1) {
            // Must wait for the queue to reach this new dialog.
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
}

class Dialog {
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

        this.title = document.createElement("h3");
        this.title.classList.add("dialog-title");
        this.title.innerHTML = builder.title;
        this.content.appendChild(this.title);

        this.message = document.createElement("p");
        this.message.classList.add("dialog-message");
        this.message.innerHTML = builder.message;
        this.content.appendChild(this.message);

        this.dialog.appendChild(this.content);

        this.timerBar = document.createElement("div");
        this.timerBar.classList.add("dialog-timer-bar");
        this.dialog.appendChild(this.timerBar);

        this.dialogRoot.appendChild(this.dialog);

        this.durationS = builder.durationS;
        this.dismissCallback = builder.dismissCallback;
        this.dismissed = false;

        this.dialog.addEventListener("click", this.dismiss.bind(this));
    }

    static get Builder() {
        class Builder {
            constructor(container) {
                this.container = container;
                this.avatarSrc = null;
                this.title = "";
                this.message = "";
                this.durationS = Dialogs.DEFAULT_DURATION_S;
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
        this.timerStartTime = performance.now();
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
        this.container.appendChild(this.dialogRoot);
        this.startTimer();
    }
}
