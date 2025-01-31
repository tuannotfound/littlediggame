import dagre from "@dagrejs/dagre";
import LinkerLine from "linkerline";
import Draggable from "./draggable.js";

export default class UpgradesUi {
    LINE_UPDATE_INTERVAL_MS = 60 / 1000;

    constructor() {
        this.graph = null;
        this.container = null;
        this.draggable = null;
        this.upgrades = null;
        this.getCurrentAspisFunc = null;
        this.buttonMap = new Map();
        this.lines = [];
        this.lastLineUpdate = 0;
        this.onPurchaseAttemptFunc = null;
        this.upgradeListener = {
            onPurchased: (upgrade) => {
                let button = this.buttonMap.get(upgrade.id);
                button.setAttribute("disabled", true);
                button.classList.remove("cannot_afford");
                button.classList.add("purchased");
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
                setTimeout(() => {
                    this.updateGraph();
                }, 10);
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

                setTimeout(() => {
                    this.updateGraph();
                }, 10);
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

        this.draggable = new Draggable(this.container);

        this.createButtons();
        this.createLines();
    }

    createButtons() {
        for (const upgrade of this.upgrades.upgradeTree.values()) {
            let button = this.createUpgradeButton(upgrade);
            this.container.appendChild(button);
        }
        // After all buttons are created, go through and unlock any root upgrades.
        for (const upgrade of this.upgrades.upgradeTree.values()) {
            if (upgrade.prereqs.size == 0 && !upgrade.purchased) {
                upgrade.unlock();
            }
        }
    }

    updateGraph() {
        console.log("Updating upgrades graph");
        this.graph = new dagre.graphlib.Graph();
        this.graph.setGraph({});
        this.graph.setDefaultEdgeLabel(() => ({}));

        for (const upgrade of this.upgrades.upgradeTree.values()) {
            let button = this.buttonMap.get(upgrade.id);
            let buttonRect = button.getBoundingClientRect();
            this.graph.setNode(upgrade.id, {
                width: buttonRect.width,
                height: buttonRect.height,
            });
            for (const prereqId of upgrade.prereqs.keys()) {
                this.graph.setEdge(upgrade.id, prereqId);
            }
        }

        dagre.layout(this.graph, {
            //ranker: "tight-tree",
        });

        this.container.style.width = this.graph.graph().width + "px";
        this.container.style.height = this.graph.graph().height + "px";

        for (const id of this.graph.nodes()) {
            let button = this.buttonMap.get(id);
            let node = this.graph.node(id);
            button.style.left = node.x + "px";
            button.style.top = node.y + "px";
        }
        this.maybeUpdateLines();
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
    }

    destroy() {
        while (this.container.firstChild) {
            this.container.removeChild(this.container.lastChild);
        }
        if (this.draggable) {
            this.draggable.destroy();
            this.draggable = null;
        }
    }

    onShown() {
        this.updateGraph();
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
        let transitionActive = false;
        button.addEventListener("transitionstart", () => {
            transitionActive = true;
            function animate() {
                if (!transitionActive) {
                    return;
                }
                this.maybeUpdateLines();
                requestAnimationFrame(animate.bind(this));
            }
            requestAnimationFrame(animate.bind(this));
        });
        button.addEventListener("transitionend", () => {
            transitionActive = false;
            this.maybeUpdateLines();
        });
        button.addEventListener("transitioncancel", () => {
            transitionActive = false;
            this.maybeUpdateLines();
        });
        return button;
    }

    maybeUpdateLines() {
        let now = performance.now();
        if (now - this.lastLineUpdate > this.LINE_UPDATE_INTERVAL_MS) {
            this.lastLineUpdate = now;
            LinkerLine.positionAll();
        }
    }
}
