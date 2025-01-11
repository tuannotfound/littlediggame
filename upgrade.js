export default class Upgrade {
    constructor(id, title, desc, cost, currency, impactFunc) {
        this.id = id;
        this.title = title;
        this.desc = desc;
        this.cost = cost;
        this.currency = currency;
        this.impactFunc = impactFunc;
        this.prereqs = new Map();
        this.unlocked = false;
        this.purchased = false;
        this.listeners = [];
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
        };
    }

    addPrereq(upgrade) {
        upgrade.addListener(this.prereqListener);
        this.prereqs.set(upgrade.id, upgrade);
    }

    addListener(listener) {
        this.listeners.push(listener);
    }

    removeListener(listener) {
        this.listeners.splice(this.listeners.indexOf(listener), 1);
    }

    unlock() {
        console.log("Unlock: " + this.id);
        this.unlocked = true;
    }

    purchase() {
        console.log("Purchase: " + this.id);
        this.purchased = true;
        this.impactFunc();
        for (listener of this.listeners) {
            listener.onPurchased(this);
        }
    }
}
