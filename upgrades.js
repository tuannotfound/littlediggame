export default class Upgrades {
    constructor() {
        // Pct pts increase per frame towards a complete dig.
        this.digSpeed = 0.5;
        this.digCount = 2;
        this.goldPerDig = 1;
        this.afterlife = false;
        this.heavensRevealed = false;
        this.hellRevealed = false;
        this.angelAttackIntervalMs = -1;
        this.damnedAttackIntervalMs = -1;
        this.damnedUpgradeCount = 0;
    }
}
