// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

export default class Stats {
    constructor() {
        this.runtimeMs = 0;
        this.lastRuntimeUpdate = performance.now();
        this.clickCount = 0;
        this.digCount = 0;
        this.deathCount = 0;
    }

    static fromJSON(json) {
        const stats = new Stats();
        Object.assign(stats, json);
        stats.resetLastUpdateTime();
        return stats;
    }

    updateRuntime() {
        const now = performance.now();
        this.runtimeMs += now - this.lastRuntimeUpdate;
        this.lastRuntimeUpdate = now;
    }

    resetLastUpdateTime() {
        this.lastRuntimeUpdate = performance.now();
    }

    get runtimeAsHMS() {
        let seconds = Math.floor((this.runtimeMs / 1000) % 60);
        let minutes = Math.floor((this.runtimeMs / (1000 * 60)) % 60);
        let hours = Math.floor((this.runtimeMs / (1000 * 60 * 60)) % 24);

        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
    }

    recordClick() {
        this.clickCount++;
    }

    recordDeath() {
        this.recordDeaths(1);
    }

    recordDeaths(count) {
        this.deathCount += count;
    }

    recordDig() {
        this.digCount++;
    }

    recordDigs(count) {
        this.digCount += count;
    }
}
