// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import LinkerLine from "linkerline";
import PanZoomWrapper from "./pan_zoom_wrapper.js";
import Color from "./color.js";

export default class UpgradesUi {
    static LINE_UPDATE_INTERVAL_MS = 60 / 1000;
    static LINE_COLOR_LOCKED = new Color(200, 200, 200).immutableCopy();
    static LINE_COLOR_CAN_AFFORD = new Color(95, 214, 105).immutableCopy();
    static LINE_COLOR_CANNOT_AFFORD = new Color(226, 79, 79).immutableCopy();

    constructor() {
        this.graph = null;
        this.container = null;
        this.panZoom = null;
        this.upgrades = null;
        this.getCurrentAspisFunc = null;
        // Upgrade ID -> button element
        this.buttonMap = new Map();
        this.gridMap = new Map();
        this.rowTrackMap = new Map();
        this.linesMap = new Map();
        this.lastLineUpdate = 0;
        this.layoutComplete = false;
        this.onPurchaseAttemptFunc = null;
        this.upgradeListener = {
            onPurchased: (upgrade) => {
                this.handlePurchase(upgrade);
            },
            onUnlocked: (upgrade) => {
                this.handleUnlock(upgrade);
            },
        };
    }

    init(container, upgrades, onPurchaseAttemptFunc, getCurrentAspisFunc) {
        this.container = container;
        this.upgrades = upgrades;
        this.onPurchaseAttemptFunc = onPurchaseAttemptFunc;
        this.getCurrentAspisFunc = getCurrentAspisFunc;

        this.panZoom = new PanZoomWrapper(this.container);

        this.createButtons();
        this.createLines();
    }

    getRootUpgrades() {
        return [...this.upgrades.upgradeTree.values().filter((u) => u.prereqs.size == 0)];
    }

    createButtons() {
        const rootUpgrades = this.getRootUpgrades();
        let row = 1;
        for (const upgrade of rootUpgrades) {
            upgrade.unlock();
            this.createButtonsFromRoot(upgrade, row);
            const column = parseInt(
                this.buttonMap.get(upgrade.id).parentElement.style.gridColumn,
                10
            );
            if (column == 1) {
                // Only bump the next root upgrade down a row if we actually added a new root
                // upgrade to the first column, otherwise we end up with a bunch of wasted space.
                row++;
            }
        }
        this.reflow();
    }

    createButtonsFromRoot(rootUpgrade, row) {
        // Perform a breadth-first traversal starting from the root upgrade
        const queue = [];
        const visited = new Set();

        this.createUpgradeButton(rootUpgrade, row);
        queue.push(rootUpgrade);
        visited.add(rootUpgrade.id);

        while (queue.length > 0) {
            const currentUpgrade = queue.shift();

            // Iterate through downstream upgrades
            for (const downstreamUpgrade of currentUpgrade.downstream.values()) {
                if (this.buttonMap.has(downstreamUpgrade.id)) {
                    // We've already added this via some other pre-req, but now we need to update
                    // its position to better average out between its pre-reqs.
                    const rows = this.rowTrackMap.get(downstreamUpgrade.id);
                    rows.push(row);
                    const newRow = Math.floor(rows.reduce((a, b) => a + b) / rows.length) + 1;
                    const button = this.buttonMap.get(downstreamUpgrade.id);
                    const prevRow = button.parentElement.style.gridRow;
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
                    const column = button.parentElement.style.gridColumn;
                    button.parentElement.removeChild(button);
                    this.getGridDiv(newRow, column).appendChild(button);
                    continue;
                }
                if (visited.has(downstreamUpgrade.id)) {
                    continue;
                }
                if (!downstreamUpgrade.purchasable) {
                    downstreamUpgrade.unlock();
                }
                this.createUpgradeButton(downstreamUpgrade, row);
                queue.push(downstreamUpgrade);
                visited.add(downstreamUpgrade.id);
            }
        }
    }

    reflow() {
        // Try to ensure that each button is placed in a row that is an avg. of its pre-reqs.
        // We'll move from column to column, left to right, skipping over the first column
        // (no-prereqs).
        // First, map out the columns:
        const columnMap = new Map();
        let maxColumn = 0;
        for (const [upgradeId, button] of this.buttonMap.entries()) {
            const column = parseInt(button.parentElement.style.gridColumn, 10) - 1;
            if (!columnMap.has(column)) {
                columnMap.set(column, []);
            }
            columnMap.get(column).push(upgradeId);
            maxColumn = Math.max(column, maxColumn);
        }

        if (maxColumn < 1) {
            return;
        }

        for (let column = 1; column < maxColumn + 1; column++) {
            this.reflowColumn(columnMap.get(column));
        }
    }

    reflowColumn(upgradeIds) {
        if (!upgradeIds) {
            return;
        }
        for (const upgradeId of upgradeIds) {
            this.reflowButton(upgradeId);
        }
    }

    reflowButton(upgradeId) {
        const button = this.buttonMap.get(upgradeId);
        if (!button) {
            return;
        }
        const upgrade = this.upgrades.upgradeTree.get(upgradeId);
        let prereqRowSum = 0;
        let prereqRowCount = 0;
        for (const prereqId of upgrade.prereqs.keys()) {
            const prereqButton = this.buttonMap.get(prereqId);
            if (!prereqButton) {
                continue;
            }
            prereqRowCount++;
            prereqRowSum += parseInt(prereqButton.parentElement.style.gridRow, 10);
        }
        if (prereqRowCount == 0) {
            return;
        }
        const currentRow = parseInt(button.parentElement.style.gridRow, 10);
        const newRow = Math.max(1, Math.floor(prereqRowSum / prereqRowCount));
        const column = button.parentElement.style.gridColumn;
        let gridDiv = this.getGridDiv(newRow, column);
        // expectedChildCount is basically just tracking whether the div we're checking is the one
        // we're already in. If we're already in it, then we expect to find just 1 child (us),
        // otherwise we want to find an empty div.
        let expectedChildCount = currentRow == newRow ? 1 : 0;
        if (gridDiv.children.length > expectedChildCount) {
            // Check the divs above or below - if they're empty, use one of them instead.
            let testRow = newRow + 1;
            expectedChildCount = currentRow == testRow ? 1 : 0;
            const below = this.getGridDiv(testRow, column);
            if (below && below.children.length == expectedChildCount) {
                gridDiv = below;
            } else if (newRow > 1) {
                testRow = newRow - 1;
                expectedChildCount = currentRow == testRow ? 1 : 0;
                const above = this.getGridDiv(testRow, column);
                if (above && above.children.length == expectedChildCount) {
                    gridDiv = above;
                }
            }
        }
        if (newRow != currentRow) {
            button.parentElement.removeChild(button);
            gridDiv.appendChild(button);
        }
    }

    getLineMapKey(fromId, toId) {
        return fromId + "->" + toId;
    }

    createLines() {
        for (const upgrade of this.upgrades.upgradeTree.values()) {
            const button = this.buttonMap.get(upgrade.id);
            for (const prereqId of upgrade.prereqs.keys()) {
                const prereqButton = this.buttonMap.get(prereqId);
                const line = new LinkerLine({
                    parent: this.container,
                    // This allows Panzoom + LinkerLine to co-exist in a weird way, but the
                    // framerate really suffers.
                    // parent: document.getElementById("lines_container"),
                    start: prereqButton,
                    end: button,
                });
                line.setOptions({
                    color: UpgradesUi.LINE_COLOR_LOCKED.asCssString(),
                    size: 2,
                    dash: true,
                    endPlug: "square",
                    endPlugSize: 1.5,
                    startSocket: "right",
                    endSocket: "left",
                });
                this.linesMap.set(this.getLineMapKey(prereqId, upgrade.id), line);
            }
        }
    }

    destroy() {
        while (this.container.firstChild) {
            this.container.removeChild(this.container.lastChild);
        }
        if (this.panZoom) {
            this.panZoom.destroy();
            this.panZoom = null;
        }
    }

    onShown() {
        //if (!this.layoutComplete) {
        for (const upgrade of this.upgrades.upgradeTree.values()) {
            if (upgrade.unlocked) {
                this.handleUnlock(upgrade);
            }
            if (upgrade.purchased) {
                this.handlePurchase(upgrade);
            }
        }
        LinkerLine.positionAll();
        this.layoutComplete = true;
        //}
    }

    onHidden() {}

    handleUnlock(upgrade) {
        const button = this.buttonMap.get(upgrade.id);
        if (upgrade.purchasable) {
            button.removeAttribute("disabled");
        }
        const upgradeDetailsEl = document.querySelector(
            "button#" + upgrade.id + " > div.upgrade_details"
        );
        // This does not play nicely with Panzoom. Needs to take into account the current scale?
        upgradeDetailsEl.style.height = this.getTotalHeightOfChildren(upgradeDetailsEl) + "px";
        console.log(upgrade.id + " details height: " + upgradeDetailsEl.style.height);
        const obscuredDetailsEl = document.querySelector(
            "button#" + upgrade.id + " > div.obscured_details"
        );
        obscuredDetailsEl.style.height = "0px";
        LinkerLine.positionAll();
        this.updateLines(upgrade);
    }

    getTotalHeightOfChildren(el) {
        return [...el.children].reduce((a, b) => a + this.getFullHeight(b), 0);
    }

    getFullHeight(el) {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const height = rect.height + parseFloat(style.marginTop) + parseFloat(style.marginBottom);

        return height;
    }

    handlePurchase(upgrade) {
        const button = this.buttonMap.get(upgrade.id);
        button.setAttribute("disabled", true);
        button.classList.remove("cannot_afford");
        button.classList.add("purchased");
        LinkerLine.positionAll();
        this.updateLines(upgrade);
    }

    handleUpgradeButtonClick(e) {
        const id = e.currentTarget.id;
        if (!this.upgrades.upgradeTree.has(id)) {
            return;
        }
        const upgrade = this.upgrades.upgradeTree.get(id);
        if (upgrade.purchased) {
            console.warn("Attempted to purchase " + upgrade.id + " more than once");
            return;
        }
        if (this.onPurchaseAttemptFunc) {
            this.onPurchaseAttemptFunc(upgrade, e.currentTarget);
        }
    }

    updateLines(upgrade) {
        if (upgrade.purchased) {
            // Grey out all of the lines leading up to this upgrade
            for (const preReqId of upgrade.prereqs.keys()) {
                const line = this.linesMap.get(this.getLineMapKey(preReqId, upgrade.id));
                line.setOptions({ color: UpgradesUi.LINE_COLOR_LOCKED.asCssString(), dash: false });
            }
            for (const downstreamId of upgrade.downstream.keys()) {
                const line = this.linesMap.get(this.getLineMapKey(upgrade.id, downstreamId));
                line.setOptions({
                    color: UpgradesUi.LINE_COLOR_LOCKED.asCssString(),
                    dash: false,
                });
            }
        } else if (upgrade.unlocked) {
            // Update all of the lines leading up to this upgrade based on whether it can be afforded
            const canAfford = this.getCurrentAspisFunc() >= upgrade.cost;
            const lineColor = canAfford
                ? UpgradesUi.LINE_COLOR_CAN_AFFORD.asCssString()
                : UpgradesUi.LINE_COLOR_CANNOT_AFFORD.asCssString();
            for (const preReqId of upgrade.prereqs.keys()) {
                const line = this.linesMap.get(this.getLineMapKey(preReqId, upgrade.id));
                line.setOptions({ color: lineColor, dash: false });
            }
            for (const downstreamId of upgrade.downstream.keys()) {
                const line = this.linesMap.get(this.getLineMapKey(upgrade.id, downstreamId));
                line.setOptions({
                    color: UpgradesUi.LINE_COLOR_LOCKED.asCssString(),
                    dash: true,
                });
            }
        }
    }

    onAspisChanged(aspis) {
        for (const [id, button] of this.buttonMap) {
            if (!this.upgrades.upgradeTree.has(id)) {
                continue;
            }
            let upgrade = this.upgrades.upgradeTree.get(id);
            if (!upgrade.unlocked) {
                continue;
            }
            if (upgrade.purchased) {
                button.classList.remove("cannot_afford");
                continue;
            }
            this.updateLines(upgrade);
            if (upgrade.cost > aspis) {
                button.classList.add("cannot_afford");
            } else {
                button.classList.remove("cannot_afford");
            }
        }
    }

    createUpgradeButton(upgrade, row) {
        const costClass = upgrade.purchasable ? "cost" : "cost hidden";
        let buttonInnerHtml = `<div class='upgrade_title'>
                                 <strong>${upgrade.title}</strong>
                                 <span class='${costClass}'> (${upgrade.cost}&nbsp;<i class="fa-solid fa-austral-sign"></i>)</span>
                               </div>
                               <div class='upgrade_details' style='height: 0px;'>
                                 <div class='upgrade_desc_container'>
                                   <p class='upgrade_desc'>${upgrade.desc}</p>
                                 </div>`;
        if (upgrade.bulletPts.length > 0) {
            buttonInnerHtml += `<ul>`;
            for (const bulletPt of upgrade.bulletPts) {
                buttonInnerHtml += `<li>${bulletPt}</li>`;
            }
            buttonInnerHtml += `  </ul>`;
        }
        buttonInnerHtml += `</div>
                            <div class='obscured_details'>
                              <span>???</span>
                            </div>`;

        const button = document.createElement("button");
        button.classList.add("upgrade");
        button.innerHTML = buttonInnerHtml;
        button.id = upgrade.id;
        if (!upgrade.unlocked || upgrade.purchased || !upgrade.purchasable) {
            button.setAttribute("disabled", true);
        }
        upgrade.addListener(this.upgradeListener);
        button.addEventListener("click", this.handleUpgradeButtonClick.bind(this));
        this.buttonMap.set(upgrade.id, button);
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

        const column = upgrade.getMaxDepth() + 1;
        this.getGridDiv(row, column).appendChild(button);
        this.rowTrackMap.set(upgrade.id, [row]);
        return button;
    }

    getGridDiv(row, column) {
        const gridKey = row + "x" + column;
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
        const now = performance.now();
        if (now - this.lastLineUpdate > UpgradesUi.LINE_UPDATE_INTERVAL_MS) {
            this.lastLineUpdate = now;
            LinkerLine.positionAll();
        }
    }
}
