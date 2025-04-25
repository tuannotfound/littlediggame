// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import Color from "../color.js";
import Pixel from "./pixel.js";
import PixelType from "./pixel_type.js";
import Constants from "./constants.js";

export default class Diamond extends Pixel {
    static SURFACE_COLOR = new Color(155, 232, 250).immutableCopy();
    static DARKNESS_HIDE_THRESHOLD = 0.15;

    static HEALTH = 250;

    constructor(position, upgrades, healthModifier = 1) {
        super(position, upgrades, PixelType.DIAMOND, Diamond.HEALTH, healthModifier);

        this.color = Constants.DIAMOND_COLOR.copy();
        this.surfaceColor = Diamond.SURFACE_COLOR.copy();
    }

    actLikeDirt() {
        if (window.DEBUG_MODE) {
            return false;
        }
        if (!this.upgrades.unlockDiamonds) {
            return true;
        }
        return this.darkness >= Diamond.DARKNESS_HIDE_THRESHOLD;
    }
}
