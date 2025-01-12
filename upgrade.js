export default class Upgrade {
    constructor(id, title, desc, bulletPts, cost, currency, impactFunc) {
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

    addDownstream(upgrade) {
        this.downstream.set(upgrade.id, upgrade);
    }

    addPrereq(upgrade) {
        upgrade.addListener(this.prereqListener);
        this.prereqs.set(upgrade.id, upgrade);
        upgrade.addDownstream(this);
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
