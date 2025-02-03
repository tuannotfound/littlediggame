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
        this.gridMap = new Map();
        this.rowTrackMap = new Map();
        this.rootUpgradesAdded = [];
        this.linesMap = new Map();
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
                    let newRootUpgrades = false;
                    for (const rootUpgrade of rootUpgrades) {
                        if (this.rootUpgradesAdded.includes(rootUpgrade.id)) {
                            continue;
                        }

                        this.createButtonsFromRoot(rootUpgrade, this.rootUpgradesAdded.length + 1);
                        newRootUpgrades = true;
                    }
                    if (newRootUpgrades) {
                        for (const upgrade of rootUpgrades) {
                            if (!upgrade.unlocked) {
                                upgrade.unlock();
                            }
                        }
                        this.createLines();
                    }
                    this.onAspisChanged(this.getCurrentAspisFunc());
                }
                LinkerLine.positionAll();
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
                LinkerLine.positionAll();
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

    getRootUpgrades() {
        return [...this.upgrades.upgradeTree.values().filter((u) => u.prereqs.size == 0)];
    }

    createButtons() {
        let rootUpgrades = this.getRootUpgrades();
        for (const upgrade of rootUpgrades) {
            this.createButtonsFromRoot(upgrade, this.rootUpgradesAdded.length + 1);
        }
        // After all buttons are created, go through and unlock any root upgrades.
        for (const upgrade of rootUpgrades) {
            if (!upgrade.unlocked) {
                upgrade.unlock();
            }
        }
    }

    createButtonsFromRoot(rootUpgrade, row) {
        // Perform a breadth-first traversal starting from the root upgrade
        const queue = [];
        const visited = new Set();

        this.createUpgradeButton(rootUpgrade, row);
        this.rootUpgradesAdded.push(rootUpgrade.id);
        queue.push(rootUpgrade);
        visited.add(rootUpgrade.id);

        while (queue.length > 0) {
            const currentUpgrade = queue.shift();

            // Iterate through downstream upgrades
            for (const downstreamUpgrade of currentUpgrade.downstream.values()) {
                if (this.buttonMap.has(downstreamUpgrade.id)) {
                    let rows = this.rowTrackMap.get(downstreamUpgrade.id);
                    rows.push(row);
                    let newRow = Math.floor(rows.reduce((a, b) => a + b) / rows.length) + 1;
                    let column = downstreamUpgrade.getMaxDepth() + 1;
                    let button = this.buttonMap.get(downstreamUpgrade.id);
                    let prevRow = button.parentElement.style.gridRow;
                    console.log(
                        downstreamUpgrade.id +
                            " moving from row " +
                            prevRow +
                            " to " +
                            newRow +
                            " (avg of " +
                            rows.toString() +
                            ")"
                    );
                    if (newRow != prevRow) {
                        button.parentElement.removeChild(button);
                        this.getGridDiv(newRow, column).appendChild(button);
                    }
                    continue;
                }
                if (visited.has(downstreamUpgrade.id)) {
                    continue;
                }
                this.createUpgradeButton(downstreamUpgrade, row);
                queue.push(downstreamUpgrade);
                visited.add(downstreamUpgrade.id);
            }
        }
    }

    createLines() {
        for (const upgrade of this.upgrades.upgradeTree.values()) {
            let button = this.buttonMap.get(upgrade.id);
            for (const prereqId of upgrade.prereqs.keys()) {
                let linesMapKey = upgrade.id + "->" + prereqId;
                if (this.linesMap.has(linesMapKey)) {
                    continue;
                }
                let prereqButton = this.buttonMap.get(prereqId);
                let line = new LinkerLine({
                    parent: this.container,
                    start: prereqButton,
                    end: button,
                });
                this.linesMap.set(upgrade.id + "->" + prereqId, line);
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
        LinkerLine.positionAll();
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

    createUpgradeButton(upgrade, row) {
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

        let column = upgrade.getMaxDepth() + 1;
        this.getGridDiv(row, column).appendChild(button);
        this.rowTrackMap.set(upgrade.id, [row]);
        return button;
    }

    getGridDiv(row, column) {
        let gridKey = row + "x" + column;
        if (!this.gridMap.has(gridKey)) {
            let gridDiv = document.createElement("div");
            gridDiv.style.gridRow = row;
            gridDiv.style.gridColumn = column;
            this.container.appendChild(gridDiv);
            this.gridMap.set(gridKey, gridDiv);
        }
        return this.gridMap.get(gridKey);
    }

    maybeUpdateLines() {
        let now = performance.now();
        if (now - this.lastLineUpdate > this.LINE_UPDATE_INTERVAL_MS) {
            this.lastLineUpdate = now;
            LinkerLine.positionAll();
        }
    }
}
