export default class UpgradesUi {
    constructor() {
        this.container = null;
        this.upgrades = null;
        this.getCurrentGoldFunc = null;
        this.buttonMap = new Map();
        this.onPurchaseAttemptFunc = null;
        this.upgradeListener = {
            onPurchased: (upgrade) => {
                this.buttonMap.get(upgrade.id).setAttribute("disabled", true);
                this.buttonMap.get(upgrade.id).classList.remove("cannot_afford");
                this.buttonMap.get(upgrade.id).classList.add("purchased");

                if (this.buttonMap.size < this.upgrades.upgradeTree.size) {
                    // New research trees may have been unlocked. Look for any root upgrades that
                    // don't yet exist in the button map and add them.
                    let rootUpgrades = this.getRootUpgrades();
                    for (const rootUpgrade of rootUpgrades) {
                        if (!this.buttonMap.has(rootUpgrade.id)) {
                            this.addRootUpgrade(rootUpgrade);
                        }
                    }
                    this.onGoldChanged(this.getCurrentGoldFunc());
                }
            },
            onUnlocked: (upgrade) => {
                let button = this.buttonMap.get(upgrade.id);
                button.removeAttribute("disabled");
                let upgradeDetailsEl = document.querySelector(
                    "button#" + upgrade.id + " > div.upgrade_details"
                );
                upgradeDetailsEl.classList.remove("hidden");
                let obscuredDetailsEl = document.querySelector(
                    "button#" + upgrade.id + " > div.obscured_details"
                );
                obscuredDetailsEl.classList.add("hidden");
            },
        };
        this.clickListener = (e) => {
            let id = e.currentTarget.id;
            if (!this.upgrades.upgradeTree.has(id)) {
                return;
            }
            let upgrade = this.upgrades.upgradeTree.get(id);
            if (upgrade.purchased) {
                console.warn("Attempted to purchase " + upgrade.id + " more than once");
                return;
            }
            if (this.onPurchaseAttemptFunc) {
                this.onPurchaseAttemptFunc(upgrade, e.currentTarget);
            }
        };
    }

    init(container, upgrades, onPurchaseAttemptFunc, getCurrentGoldFunc) {
        this.container = container;
        this.upgrades = upgrades;
        this.onPurchaseAttemptFunc = onPurchaseAttemptFunc;
        this.getCurrentGoldFunc = getCurrentGoldFunc;
        let rootUpgrades = this.getRootUpgrades();
        for (const rootUpgrade of rootUpgrades) {
            this.addRootUpgrade(rootUpgrade);
        }
    }

    destroy() {
        while (this.container.firstChild) {
            this.container.removeChild(this.container.lastChild);
        }
    }

    getRootUpgrades() {
        return [...this.upgrades.upgradeTree.values().filter((u) => u.prereqs.size == 0)];
    }

    addRootUpgrade(rootUpgrade) {
        console.log("Adding root upgrade: " + rootUpgrade.id);
        let column = document.createElement("div");
        column.classList.add("column");
        this.container.appendChild(column);
        this.createUpgradeButtonRecursive(rootUpgrade, column);
        if (!rootUpgrade.purchased) {
            rootUpgrade.unlock();
        }
    }

    onGoldChanged(gold) {
        for (const [id, button] of this.buttonMap) {
            if (!this.upgrades.upgradeTree.has(id)) {
                return;
            }
            let upgrade = this.upgrades.upgradeTree.get(id);
            if (upgrade.purchased) {
                button.classList.remove("cannot_afford");
                continue;
            }
            if (upgrade.cost > gold) {
                button.classList.add("cannot_afford");
            } else {
                button.classList.remove("cannot_afford");
            }
        }
    }

    createUpgradeButtonRecursive(upgrade, column) {
        if (this.buttonMap.has(upgrade.id)) {
            console.warn("Upgrade with ID " + upgrade.id + " already exists in UI button map");
            return;
        }
        this.createUpgradeButton(upgrade, column);

        for (const downstreamUpgrade of upgrade.downstream.values()) {
            this.createUpgradeButtonRecursive(downstreamUpgrade, column);
        }
    }

    createUpgradeButton(upgrade, column) {
        let buttonInnerHtml = `<div class='upgrade_title'>
                                 <strong>${upgrade.title}</strong>
                                 <span class='cost'> (${upgrade.cost}🪙)</span>
                               </div>
                               <div class='upgrade_details hidden'>
                                 <p>${upgrade.desc}</p>
                                 <ul>`;
        for (const bulletPt of upgrade.bulletPts) {
            buttonInnerHtml += `<li>${bulletPt}</li>`;
        }
        buttonInnerHtml += `  </ul>
                            </div>
                            <div class='obscured_details'>
                              <span>???</span>
                            </div>`;

        let button = document.createElement("button");
        button.classList.add("upgrade");
        button.innerHTML = buttonInnerHtml;
        button.id = upgrade.id;
        if (!upgrade.unlocked || upgrade.purchased) {
            button.setAttribute("disabled", true);
        }
        upgrade.addListener(this.upgradeListener);
        button.addEventListener("click", this.clickListener);
        column.appendChild(button);
        this.buttonMap.set(upgrade.id, button);
        if (upgrade.unlocked) {
            this.upgradeListener.onUnlocked(upgrade);
        }
        if (upgrade.purchased) {
            this.upgradeListener.onPurchased(upgrade);
        }
    }
}
