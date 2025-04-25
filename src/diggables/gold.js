// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import Color from "../color.js";
import Pixel from "./pixel.js";
import PixelType from "./pixel_type.js";
import Constants from "./constants.js";

export default class Gold extends Pixel {
    static SURFACE_COLOR = new Color(242, 203, 27).immutableCopy();
    static COLOR_VARIABILITY = 3;
    static DARKNESS_HIDE_THRESHOLD = 0.15;

    static HEALTH = 150;

    constructor(position, upgrades, healthModifier = 1) {
        super(position, upgrades, PixelType.GOLD, Gold.HEALTH, healthModifier);

        this.color = Color.wiggle(Constants.GOLD_COLOR, Gold.COLOR_VARIABILITY);
        this.surfaceColor = Color.wiggle(Gold.SURFACE_COLOR, Gold.COLOR_VARIABILITY);
    }

    actLikeDirt() {
        if (window.DEBUG_MODE) {
            return false;
        }
        if (!this.upgrades.unlockGold) {
            return true;
        }
        return this.darkness >= Gold.DARKNESS_HIDE_THRESHOLD;
    }
}
