// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import MathExtras from "./math_extras.js";

export default class AnagramRevealer {
    static DEFAULT_PLACEHOLDER_CHAR = "_";
    static DEFAULT_DURATION_MS = 1250;
    static DEFAULT_LETTER_DELAY_MS = 100;
    constructor(
        container,
        start,
        end,
        caseSensitive = false,
        durationMs = AnagramRevealer.DEFAULT_DURATION_MS,
        letterDelayMs = AnagramRevealer.DEFAULT_LETTER_DELAY_MS,
        placeholderChar = AnagramRevealer.DEFAULT_PLACEHOLDER_CHAR
    ) {
        this.container = container;
        this.start = start;
        this.end = end;
        this.caseSensitive = caseSensitive;
        this.initialized = false;
        this.revealed = false;
        this.durationMs = durationMs;
        this.letterDelayMs = letterDelayMs;
        this.placeholderChar = placeholderChar;

        // The index of the div corresponds to the index for that character in the start string.
        this.divs = [];
        // Treat like a map where key = index in start string and value = index in end string.
        this.transitions = [];

        if (!this.isAnagram(start, end)) {
            throw new Error("Start and end strings must be anagrams of each other.");
        }

        if (this.start.indexOf(this.placeholderChar) >= 0) {
            throw new Error(
                "Anagram text cannot contain the placeholder character: '" +
                    this.placeholderChar +
                    "'"
            );
        }
    }

    init(textElementType = "span") {
        // For each character in start, create div + span elements with the character.
        this.container.innerHTML = "";
        let endTextRemaining = this.end;
        for (let i = 0; i < this.start.length; i++) {
            const textElement = document.createElement(textElementType);
            textElement.style.whiteSpace = "pre";
            textElement.innerText = this.start[i];
            // The div is required to have the translate style applied to it.
            const div = document.createElement("div");
            div.style.position = "relative";
            div.style.display = "inline-block";
            div.appendChild(textElement);
            this.container.appendChild(div);
            this.divs.push(div);

            const endIndex = endTextRemaining.lastIndexOf(this.start[i]);
            this.transitions.push(endIndex);
            // Replace the character in the end string so we don't use it again.
            if (endIndex >= 0) {
                endTextRemaining =
                    endTextRemaining.substring(0, endIndex) +
                    this.placeholderChar +
                    endTextRemaining.substring(endIndex + 1);
            }
        }

        this.initialized = true;
    }

    isAnagram(str1, str2, caseSensitive = false) {
        if (str1.length !== str2.length) {
            return false;
        }
        if (!caseSensitive) {
            str1 = str1.toLowerCase();
            str2 = str2.toLowerCase();
        }
        const sortedStr1 = str1.toLowerCase().split("").sort().join("");
        const sortedStr2 = str2.toLowerCase().split("").sort().join("");
        return sortedStr1 === sortedStr2;
    }

    reveal() {
        if (!this.initialized) {
            console.error("AnagramRevealer not initialized.");
            return;
        }

        if (this.revealed) {
            return;
        }

        const boxes = this.divs.map((span) => {
            const box = span.getBoundingClientRect();
            return {
                left: box.left,
                top: box.top,
                width: box.width,
                height: box.height,
            };
        });

        let leftSum = boxes[0].left;
        const endLefts = [];
        for (let i = 0; i < this.transitions.length; i++) {
            let startIndex = this.transitions.indexOf(i);
            endLefts.push(leftSum);
            leftSum += boxes[startIndex].width;
        }

        let nextIndex = Math.round(MathExtras.randomBetween(0, this.transitions.length - 1));
        let remainingIndices = new Set(Array.from({ length: this.divs.length }, (e, i) => i));
        for (let i = 0; i < this.divs.length; i++) {
            const div = this.divs[nextIndex];
            div.style.transition = `transform ${this.durationMs}ms ease-in ${
                this.letterDelayMs * i
            }ms`;
            div.style.transformOrigin = "top left";
            const startLeft = boxes[nextIndex].left;
            const endLeft = endLefts[this.transitions[nextIndex]];
            const deltaX = endLeft - startLeft;
            div.style.transform = `translateX(${deltaX}px)`;
            remainingIndices.delete(nextIndex);
            nextIndex = this.transitions[nextIndex];
            if (!remainingIndices.has(nextIndex)) {
                // If two characters trade positions, then we end up in a loop just swapping them
                // back and forth. Break out of this by just picking the next letter that's still
                // remaining.
                nextIndex = remainingIndices.values().next().value;
            }
        }

        this.revealed = true;
    }
}
