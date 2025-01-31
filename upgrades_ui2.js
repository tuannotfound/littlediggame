import dagre from "@dagrejs/dagre";
import LinkerLine from "linkerline";

export default class UpgradesUi {
    constructor() {
        this.graph = null;
        this.container = null;
        this.upgrades = null;
        this.getCurrentAspisFunc = null;
        this.buttonMap = new Map();
        this.lines = [];
        this.onPurchaseAttemptFunc = null;
        this.upgradeListener = {
            onPurchased: (upgrade) => {
                this.buttonMap.get(upgrade.id).setAttribute("disabled", true);
                this.buttonMap.get(upgrade.id).classList.remove("cannot_afford");
                this.buttonMap.get(upgrade.id).classList.add("purchased");
                let upgradeDetailsEl = document.querySelector(
                    "button#" + upgrade.id + " > div > p.upgrade_desc"
                );
                upgradeDetailsEl.classList.add("hidden");

                if (this.buttonMap.size < this.upgrades.upgradeTree.size) {
                    // New research trees may have been unlocked. Look for any root upgrades that
                    // don't yet exist in the button map and add them.
                    let rootUpgrades = this.getRootUpgrades();
                    for (const rootUpgrade of rootUpgrades) {
                        if (!this.buttonMap.has(rootUpgrade.id)) {
                            this.addRootUpgrade(rootUpgrade);
                        }
                    }
                    this.onAspisChanged(this.getCurrentAspisFunc());
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

    init(container, upgrades, onPurchaseAttemptFunc, getCurrentAspisFunc) {
        this.container = container;
        this.upgrades = upgrades;
        this.onPurchaseAttemptFunc = onPurchaseAttemptFunc;
        this.getCurrentAspisFunc = getCurrentAspisFunc;

        this.initGraph();

        this.updateButtonPositions();

        this.createLines();
    }

    initGraph() {
        this.graph = new dagre.graphlib.Graph();
        this.graph.setGraph({});
        this.graph.setDefaultEdgeLabel(() => ({}));

        for (const upgrade of this.upgrades.upgradeTree.values()) {
            let button = this.createUpgradeButton(upgrade);
            this.container.appendChild(button);
            this.graph.setNode(upgrade.id, {
                width: 300,
                height: 100,
            });
            // document.body.appendChild(button);
            // let buttonBounds = button.getBoundingClientRect();
            // document.body.removeChild(button);
            // this.graph.setNode(upgrade.id, {
            //     width: buttonBounds.width,
            //     height: buttonBounds.height,
            // });
            for (const prereqId of upgrade.prereqs.keys()) {
                this.graph.setEdge(upgrade.id, prereqId);
            }
            if (upgrade.prereqs.size == 0 && !upgrade.purchased) {
                upgrade.unlock();
            }
        }
    }

    updateButtonPositions() {
        dagre.layout(this.graph);
        this.container.style.width = this.graph.graph().width + "px";
        this.container.style.height = this.graph.graph().height + "px";

        for (const id of this.graph.nodes()) {
            let button = this.buttonMap.get(id);
            let node = this.graph.node(id);
            button.style.left = node.x + "px";
            button.style.top = node.y + "px";
        }
    }

    createLines() {
        for (const upgrade of this.upgrades.upgradeTree.values()) {
            let button = this.buttonMap.get(upgrade.id);
            for (const prereqId of upgrade.prereqs.keys()) {
                let prereqButton = this.buttonMap.get(prereqId);
                let line = new LinkerLine({
                    parent: this.container,
                    start: prereqButton,
                    end: button,
                });
                this.lines.push(line);
            }
        }
        // This needs to be called when the upgrade div is actually shown.
        // LinkerLine.positionAll();
    }

    destroy() {
        while (this.container.firstChild) {
            this.container.removeChild(this.container.lastChild);
        }
    }

    onAspisChanged(aspis) {
        for (const [id, button] of this.buttonMap) {
            if (!this.upgrades.upgradeTree.has(id)) {
                return;
            }
            let upgrade = this.upgrades.upgradeTree.get(id);
            if (upgrade.purchased) {
                button.classList.remove("cannot_afford");
                continue;
            }
            if (upgrade.cost > aspis) {
                button.classList.add("cannot_afford");
            } else {
                button.classList.remove("cannot_afford");
            }
        }
    }

    createUpgradeButton(upgrade) {
        let buttonInnerHtml = `<div class='upgrade_title'>
                                 <strong>${upgrade.title}</strong>
                                 <span class='cost'> (${upgrade.cost}&nbsp;<i class="fa-solid fa-austral-sign"></i>)</span>
                               </div>
                               <div class='upgrade_details hidden'>
                                 <p class='upgrade_desc'>${upgrade.desc}</p>
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
        this.buttonMap.set(upgrade.id, button);
        if (upgrade.unlocked) {
            this.upgradeListener.onUnlocked(upgrade);
        }
        if (upgrade.purchased) {
            this.upgradeListener.onPurchased(upgrade);
        }
        return button;
    }
}
