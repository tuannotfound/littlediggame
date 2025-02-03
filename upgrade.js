export default class Upgrade {
    constructor(id, title, desc, bulletPts, cost, currency, impactFunc, row, column) {
        this.id = id;
        this.title = title;
        this.desc = desc;
        this.bulletPts = bulletPts;
        this.cost = cost;
        this.currency = currency;
        this.impactFunc = impactFunc;
        this.prereqs = new Map();
        this.downstream = new Map();
        this.unlocked = false;
        this.purchased = false;
        this.row = row;
        this.column = column;
        this.cachedDepth = -1;
        this.listeners = new Set();
        this.prereqListener = {
            onPurchased: (upgrade) => {
                if (this.unlocked || !this.prereqs.has(upgrade.id)) {
                    return;
                }
                upgrade.removeListener(this);
                for (const prereq of this.prereqs.values()) {
                    if (!prereq.purchased) {
                        // There's an unpurchased prereq, bail now.
                        return;
                    }
                }
                // All of the prereqs are purchased
                this.unlock();
            },
            onUnlocked: (upgrade) => {},
        };
    }

    toJSON() {
        return {
            id: this.id,
            unlocked: this.unlocked,
            purchased: this.purchased,
        };
    }

    getMaxDepth() {
        if (this.cachedDepth >= 0) {
            return this.cachedDepth;
        }
        if (this.prereqs.size === 0) {
            this.cachedDepth = 0;
            return this.cachedDepth;
        }

        let maxPrereqDepth = 0;
        for (const prereq of this.prereqs.values()) {
            maxPrereqDepth = Math.max(maxPrereqDepth, prereq.getMaxDepth());
        }

        this.cachedDepth = maxPrereqDepth + 1;
        return this.cachedDepth;
    }

    addDownstream(upgrade) {
        this.downstream.set(upgrade.id, upgrade);
    }

    addPrereq(upgrade) {
        upgrade.addListener(this.prereqListener);
        this.prereqs.set(upgrade.id, upgrade);
        upgrade.addDownstream(this);
        this.cachedDepth = -1;
    }

    addListener(listener) {
        this.listeners.add(listener);
    }

    removeListener(listener) {
        this.listeners.delete(listener);
    }

    unlock() {
        console.log("Unlock: " + this.id);
        this.unlocked = true;
        for (const listener of this.listeners) {
            listener.onUnlocked(this);
        }
    }

    purchase() {
        console.log("Purchase: " + this.id);
        this.purchased = true;
        this.impactFunc();
        for (const listener of this.listeners) {
            listener.onPurchased(this);
        }
    }
}
