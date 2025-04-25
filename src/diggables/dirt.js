// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import Color from "../color.js";
import Pixel from "./pixel.js";
import PixelType from "./pixel_type.js";
import Constants from "./constants.js";

export default class Dirt extends Pixel {
    static COLOR_VARIABILITY = 10;

    constructor(position, upgrades, healthModifier = 1) {
        super(position, upgrades, PixelType.DIRT, Constants.DIRT_INITIAL_HEALTH, healthModifier);

        this.color = Color.wiggle(this.getDirtColor(), Dirt.COLOR_VARIABILITY);
        this.surfaceColor = Color.wiggle(this.getDirtSurfaceColor(), Dirt.COLOR_VARIABILITY);
    }

    actLikeDirt() {
        // We want to use the 'wiggled' dirt colors.
        return false;
    }
}
