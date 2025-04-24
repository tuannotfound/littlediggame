import "./cooldown_button.css";
import "./timer_bar.css";

export default class CooldownButton {
    constructor(buttonEl, cooldownDurationMs, onCooldownElapsedCallback) {
        this.buttonEl = buttonEl;
        this.buttonEl.classList.add("cooldown-button");
        this.cooldownDurationMs = cooldownDurationMs;
        this.onCooldownElapsedCallback = onCooldownElapsedCallback;

        this.timerBar = document.createElement("div");
        this.timerBar.classList.add("timer-bar", "hidden");
        this.buttonEl.appendChild(this.timerBar);

        this.timerInterval = null;
        this.timerStartTime = 0;
        this.timerPausedTime = null;
    }

    get isCooldownInProgress() {
        return this.timerInterval != null || this.timerPausedTime != null;
    }

    startCooldown() {
        if (this.timerInterval) {
            return;
        }

        this.buttonEl.disabled = true;
        this.timerBar.classList.remove("hidden");

        this.timerStartTime = performance.now();

        this.timerInterval = setInterval(() => {
            this.updateTimer();
        }, 100);
    }

    pauseCooldown() {
        if (this.timerPausedTime) {
            return;
        }
        this.timerPausedTime = performance.now();
        clearInterval(this.timerInterval);
    }

    resumeCooldown() {
        if (!this.timerPausedTime) {
            return;
        }
        this.timerStartTime += performance.now() - this.timerPausedTime;
        this.timerPausedTime = null;
        this.timerInterval = setInterval(() => {
            this.updateTimer();
        }, 100);
    }

    updateTimer() {
        if (!this.timerInterval) {
            return;
        }
        const elapsed = performance.now() - this.timerStartTime;
        const progress = Math.min(1, elapsed / this.cooldownDurationMs);
        this.timerBar.style.width = `${(1 - progress) * 100}%`;

        if (progress >= 1) {
            this.cooldownElapsed();
        }
    }

    cooldownElapsed() {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        this.buttonEl.disabled = false;
        this.timerBar.classList.add("hidden");
        this.timerBar.style.width = "100%";
        if (this.onCooldownElapsedCallback) {
            this.onCooldownElapsedCallback();
        }
    }
}
