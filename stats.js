export default class Stats {
    constructor() {
        this.runtimeMs_ = 0;
        this.lastRuntimeUpdate_ = performance.now();
        this.clickCount_ = 0;
        this.digCount_ = 0;
        this.deathCount_ = 0;
        this.karma_ = 100;
    }

    static fromJSON(json) {
        const stats = new Stats();
        Object.assign(stats, json);
        stats.resetLastUpdateTime();
        return stats;
    }

    updateRuntime() {
        const now = performance.now();
        this.runtimeMs_ += now - this.lastRuntimeUpdate_;
        this.lastRuntimeUpdate_ = now;
    }

    resetLastUpdateTime() {
        this.lastRuntimeUpdate_ = performance.now();
    }

    get runtimeAsHMS() {
        let seconds = Math.floor((this.runtimeMs_ / 1000) % 60);
        let minutes = Math.floor((this.runtimeMs_ / (1000 * 60)) % 60);
        let hours = Math.floor((this.runtimeMs_ / (1000 * 60 * 60)) % 24);

        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
    }

    recordClick() {
        this.clickCount_++;
    }

    get clickCount() {
        return this.clickCount_;
    }

    recordDeath() {
        this.recordDeaths(1);
    }

    recordDeaths(count) {
        this.deathCount_ += count;
    }

    get deathCount() {
        return this.deathCount_;
    }

    recordDig() {
        this.digCount_++;
    }

    get digCount() {
        return this.digCount_;
    }

    updateKarma(dk) {
        this.karma_ += dk;
    }

    get karma() {
        return this.karma_;
    }
}
