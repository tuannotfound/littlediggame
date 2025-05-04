// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import "./css_effects.css";

export default class CssEffects {
    static PULSE_ANIMATION_NAME = "pulsing";
    static PULSE_ANIMATION_DURATION_MS = 1000 * 0.5 * 4;

    static startAnimation(elements, name, durationMs) {
        console.log("Starting " + name + " animation");
        for (const element of elements) {
            element.classList.add(name);
        }
        setTimeout(() => {
            CssEffects.stopAnimation(elements, name);
        }, durationMs);
    }

    static stopAnimation(elements, name) {
        console.log("Stopping " + name + " animation");
        for (const element of elements) {
            element.classList.remove(name);
        }
    }

    static startPulseAnimation(elements) {
        CssEffects.startAnimation(
            elements,
            CssEffects.PULSE_ANIMATION_NAME,
            CssEffects.PULSE_ANIMATION_DURATION_MS
        );
    }

    static stopPulseAnimation(elements) {
        CssEffects.stopAnimation(elements, CssEffects.PULSE_ANIMATION_NAME);
    }
}
