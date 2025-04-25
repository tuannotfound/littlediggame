// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import Color from "../color.js";
import Constants from "./constants.js";
import Pixel from "./pixel.js";
import PixelType from "./pixel_type.js";

export default class Egg extends Pixel {
    static SURFACE_COLOR = new Color(130, 126, 109).immutableCopy();
    static COLOR_VARIABILITY = 10;
    static DARKNESS_HIDE_THRESHOLD = 0.3;
    static EGG_SPECKLE_CHANCE_PCT = 14;
    static SPECKLE_COLOR = new Color(196, 188, 159).immutableCopy();

    static HEALTH = 10000;

    constructor(position, upgrades) {
        super(position, upgrades, PixelType.EGG, Egg.HEALTH);

        let color =
            100 * Math.random() < Egg.EGG_SPECKLE_CHANCE_PCT
                ? Egg.SPECKLE_COLOR
                : Constants.EGG_COLOR;
        this.color = Color.wiggle(color, Egg.COLOR_VARIABILITY);
        this.surfaceColor = Color.wiggle(Egg.SURFACE_COLOR, Egg.COLOR_VARIABILITY);
    }

    actLikeDirt() {
        if (window.DEBUG) {
            return false;
        }
        return this.darkness >= Egg.DARKNESS_HIDE_THRESHOLD;
    }
}
