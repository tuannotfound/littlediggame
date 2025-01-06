export default class Upgrades {
    constructor() {
        // Pct pts increase per frame towards a complete dig.
        this.digSpeed = 0.5;
        this.digCount = 2;
        this.goldPerDig = 1;
        this.spawnCostReduction = 0;
        this.afterlife = false;
        this.heavenRevealed = false;
        this.hellRevealed = false;
        this.angelAttackIntervalMs = -1;
        this.damnedAttackIntervalMs = -1;
        this.damnedUpgradeCount = 0;
    }

    static fromJSON(json) {
        let upgrades = new Upgrades();
        Object.assign(upgrades, json);
        return upgrades;
    }
}
