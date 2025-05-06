// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import Color from "./color.js";
import LinkerLine from "linkerline";
import PanZoomWrapper from "./pan_zoom_wrapper.js";
import Vector from "./vector.js";

import "./upgrades_ui.css";

export default class UpgradesUi {
    static LINE_UPDATE_INTERVAL_MS = 30 / 1000;
    static LINE_COLOR_LOCKED = new Color(200, 200, 200).immutableCopy();
    static LINE_COLOR_CAN_AFFORD = new Color(95, 214, 105).immutableCopy();
    static LINE_COLOR_CANNOT_AFFORD = new Color(226, 79, 79).immutableCopy();

    constructor() {
        this.graph = null;
        this.container = null;
        this.hintsContainer = null;
        this.panZoom = null;
        this.upgrades = null;
        this.getCurrentAspisFunc = null;
        // Upgrade ID -> button element
        this.buttonMap = new Map();
        this.gridMap = new Map();
        this.rowTrackMap = new Map();
        this.linesMap = new Map();
        this.lastLineUpdate = 0;
        this.showing = false;
        this.onPurchaseAttemptFunc = null;
        this.upgradeListener = {
            onPurchased: (upgrade) => {
                this.handlePurchase(upgrade);
            },
            onUnlocked: (upgrade) => {
                this.handleUnlock(upgrade);
            },
        };
        this.animatingButtons = false;
        this.purchasableUpgradeButtons = [];
        this.hintsMap = new Map();
        this.hintContainerRect = null;
        this.hintContainerIntersectionRect = null;
    }

    init(container, hintsContainer, upgrades, onPurchaseAttemptFunc, getCurrentAspisFunc) {
        this.container = container;
        this.hintsContainer = hintsContainer;
        this.upgrades = upgrades;
        this.onPurchaseAttemptFunc = onPurchaseAttemptFunc;
        this.getCurrentAspisFunc = getCurrentAspisFunc;

        for (const upgradeId of this.upgrades.upgradeTree.keys()) {
            const hint = document.createElement("div");
            hint.classList.add("upgrade-hint", "fa-solid", "fa-circle-right", "hidden");
            hint.id = upgradeId + "-hint";
            this.hintsContainer.appendChild(hint);
            this.hintsMap.set(upgradeId, hint);
        }

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
                    // parent: document.getElementById("lines-container"),
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

    onResize() {
        if (!this.showing) {
            return;
        }
        this.updateHintContainerRects();
    }

    onShown(aspis) {
        this.showing = true;
        for (const upgrade of this.upgrades.upgradeTree.values()) {
            if (upgrade.unlocked) {
                this.handleUnlock(upgrade);
            }
            if (upgrade.purchased) {
                this.handlePurchase(upgrade);
            }
        }
        LinkerLine.positionAll();

        this.onAspisChanged(aspis);

        this.updateHintContainerRects();
        requestAnimationFrame(this.animate.bind(this));
    }

    onHidden() {
        this.showing = false;
    }

    updateHintContainerRects() {
        this.hintContainerRect = this.container.parentElement.getBoundingClientRect();
        this.hintContainerIntersectionRect = JSON.parse(JSON.stringify(this.hintContainerRect));
        // Shrink the intersection rect by one rem plus a little buffer to pull in the right/bottom
        // by the size of the font icons used for arrows.
        const oneRem = parseFloat(getComputedStyle(document.documentElement).fontSize) + 2;
        this.hintContainerIntersectionRect.height -= oneRem;
        this.hintContainerIntersectionRect.width -= oneRem;
        this.hintContainerIntersectionRect.right -= oneRem;
        this.hintContainerIntersectionRect.bottom -= oneRem;
    }

    handleUnlock(upgrade) {
        const button = this.buttonMap.get(upgrade.id);
        if (upgrade.purchasable) {
            button.removeAttribute("disabled");
        }
        const upgradeDetailsEl = document.querySelector(
            "button#" + upgrade.id + " > div.upgrade-details"
        );
        // This does not play nicely with Panzoom. Needs to take into account the current scale?
        upgradeDetailsEl.style.height = this.getTotalHeightOfChildren(upgradeDetailsEl) + "px";
        console.log(upgrade.id + " details height: " + upgradeDetailsEl.style.height);
        const obscuredDetailsEl = document.querySelector(
            "button#" + upgrade.id + " > div.obscured-details"
        );
        obscuredDetailsEl.style.height = "0px";
        LinkerLine.positionAll();
        this.updateLineStyles(upgrade);
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
        button.classList.remove("cannot-afford");
        button.classList.add("purchased");
        LinkerLine.positionAll();
        this.updateLineStyles(upgrade);
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

    updateLineStyles(upgrade) {
        if (upgrade.purchased) {
            // Grey out all of the lines leading up to this upgrade
            for (const preReqId of upgrade.prereqs.keys()) {
                const line = this.linesMap.get(this.getLineMapKey(preReqId, upgrade.id));
                line.setOptions({ color: UpgradesUi.LINE_COLOR_LOCKED.asCssString(), dash: false });
            }
            // Testing: don't do this - the downstream upgrades will update these lines
            for (const downstreamId of upgrade.downstream.keys()) {
                if (this.upgrades.upgradeTree.get(downstreamId).unlocked) {
                    // Unlocked upgrades will update their own lines below.
                    continue;
                }
                const line = this.linesMap.get(this.getLineMapKey(upgrade.id, downstreamId));
                // This is expensive - it causes the browser to recalculate the style.
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
        if (!this.showing) {
            return;
        }
        this.purchasableUpgradeButtons = [];
        for (const [id, button] of this.buttonMap) {
            if (!this.upgrades.upgradeTree.has(id)) {
                continue;
            }
            const upgrade = this.upgrades.upgradeTree.get(id);
            if (!upgrade.unlocked) {
                continue;
            }
            if (upgrade.purchased) {
                button.classList.remove("cannot-afford");
                continue;
            }
            this.updateLineStyles(upgrade);
            if (upgrade.cost > aspis) {
                button.classList.add("cannot-afford");
                const hint = this.hintsMap.get(upgrade.id);
                hint.classList.add("hidden");
            } else {
                button.classList.remove("cannot-afford");
                if (upgrade.cost > 0) {
                    this.purchasableUpgradeButtons.push(button);
                }
            }
        }
    }

    createUpgradeButton(upgrade, row) {
        const costClass = upgrade.purchasable ? "cost" : "cost hidden";
        let buttonInnerHtml = `<div class='upgrade-title'>
                                 <strong>${upgrade.title}</strong>
                                 <span class='${costClass}'> (${upgrade.cost}&nbsp;<i class="fa-solid fa-austral-sign"></i>)</span>
                               </div>
                               <div class='upgrade-details' style='height: 0px;'>
                                 <div class='upgrade-desc-container'>
                                   <p class='upgrade-desc'>${upgrade.desc}</p>
                                 </div>`;
        if (upgrade.bulletPts.length > 0) {
            buttonInnerHtml += `<ul>`;
            for (const bulletPt of upgrade.bulletPts) {
                buttonInnerHtml += `<li>${bulletPt}</li>`;
            }
            buttonInnerHtml += `  </ul>`;
        }
        buttonInnerHtml += `</div>
                            <div class='obscured-details'>
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
        button.addEventListener("transitionstart", () => {
            this.animatingButtons = true;
        });
        button.addEventListener("transitionend", () => {
            this.animatingButtons = false;
            this.maybeUpdateLinePositions();
        });
        button.addEventListener("transitioncancel", () => {
            this.animatingButtons = false;
            this.maybeUpdateLinePositions();
        });

        const column = upgrade.getMaxDepth() + 1;
        this.getGridDiv(row, column).appendChild(button);
        this.rowTrackMap.set(upgrade.id, [row]);
        return button;
    }

    animate() {
        if (this.animatingButtons) {
            this.maybeUpdateLinePositions();
        }

        if (this.purchasableUpgradeButtons.length > 0) {
            for (const button of this.purchasableUpgradeButtons) {
                const buttonRect = button.getBoundingClientRect();
                const hint = this.hintsMap.get(button.id);
                if (this.isRectVisible(buttonRect, this.hintContainerRect, 20)) {
                    hint.classList.add("hidden");
                    continue;
                }
                const direction = new Vector(
                    buttonRect.left + buttonRect.width / 2,
                    buttonRect.top + buttonRect.height / 2
                );
                direction.sub(
                    this.hintContainerRect.left + this.hintContainerRect.width / 2,
                    this.hintContainerRect.top + this.hintContainerRect.height / 2
                );
                const intersection = this.findRectEdgeIntersection(
                    this.hintContainerIntersectionRect,
                    direction
                );
                if (intersection) {
                    intersection.add(
                        this.container.parentElement.offsetLeft,
                        this.container.parentElement.offsetTop
                    );
                    hint.style.left = intersection.x + "px";
                    hint.style.top = intersection.y + "px";
                    hint.style.transform = `rotate(${direction.angle()}rad)`;
                    hint.classList.remove("hidden");
                } else {
                    hint.classList.add("hidden");
                }
            }
        }

        if (this.showing) {
            requestAnimationFrame(this.animate.bind(this));
        }
    }

    isRectVisible(rect, containerRect, buffer) {
        if (
            rect.left + buffer > containerRect.left + containerRect.width ||
            rect.right - buffer < containerRect.left
        ) {
            return false;
        }
        if (
            rect.top + buffer > containerRect.top + containerRect.height ||
            rect.bottom - buffer < containerRect.top
        ) {
            return false;
        }
        return true;
    }

    findRectEdgeIntersection(rect, dir) {
        if (rect.width <= 0 || rect.height <= 0) {
            console.error("Rectangle width and height must be positive.");
            return null; // Invalid rectangle dimensions
        }

        const center = new Vector(rect.left + rect.width / 2, rect.top + rect.height / 2);

        // Handle the case of a zero direction vector - it points to the center itself.
        if (dir.x === 0 && dir.y === 0) {
            return center;
        }

        // Calculate the minimum positive t values to intersect the vertical and horizontal edge lines.
        // t = distance / speed, where distance is distance from center to edge line,
        // and speed is the component of the direction vector along that axis.

        let tMin = Infinity;

        // Check intersection with vertical edges (left and right)
        if (dir.x !== 0) {
            // Time to hit the left edge
            const tLeft = (rect.left - center.x) / dir.x;
            // Time to hit the right edge
            const tRight = (rect.right - center.x) / dir.x;

            // We only care about intersections in the direction of the vector.
            if (dir.x > 0) {
                // Moving right
                if (tRight > 0) tMin = Math.min(tMin, tRight);
            } else {
                // Moving left (dir.x < 0)
                if (tLeft > 0) tMin = Math.min(tMin, tLeft);
            }
        }

        // Check intersection with horizontal edges (top and bottom)
        if (dir.y !== 0) {
            // Time to hit the top edge
            const tTop = (rect.top - center.y) / dir.y;
            // Time to hit the bottom edge
            const tBottom = (rect.bottom - center.y) / dir.y;

            // We only care about intersections in the direction of the vector.
            if (dir.y > 0) {
                // Moving down
                if (tBottom > 0) tMin = Math.min(tMin, tBottom);
            } else {
                // Moving up (dir.y < 0)
                if (tTop > 0) tMin = Math.min(tMin, tTop);
            }
        }

        // If tMin is still Infinity, something is wrong (shouldn't happen with valid input)
        // but we can return the center as a fallback.
        if (tMin === Infinity) {
            console.warn("Could not find a valid intersection.");
            return null;
        }

        // Calculate the intersection point using the smallest positive t
        const intersect = new Vector(center.x + tMin * dir.x, center.y + tMin * dir.y);

        // Due to potential floating point inaccuracies, clamp the result to the rectangle bounds
        // This ensures the point lies exactly *on* the edge, not slightly outside/inside.
        const clamped = new Vector(
            Math.max(rect.left, Math.min(intersect.x, rect.right)) - rect.left,
            Math.max(rect.top, Math.min(intersect.y, rect.bottom)) - rect.top
        );

        return clamped;
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

    maybeUpdateLinePositions() {
        const now = performance.now();
        if (now - this.lastLineUpdate > UpgradesUi.LINE_UPDATE_INTERVAL_MS) {
            this.lastLineUpdate = now;
            LinkerLine.positionAll();
        }
    }
}
