// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import Color from "../color.js";
import MathExtras from "../math_extras.js";
import Story from "../story.js";
import Pixel from "./pixel.js";
import PixelType from "./pixel_type.js";

export default class Magic extends Pixel {
    static FRAMES_PER_COLOR_CHANGE = 15;

    static SURFACE_COLORS = [
        Color.RED,
        Color.YELLOW,
        Color.GREEN,
        Color.BLUE,
        Color.PURPLE,
        Color.YELLOW,
        Color.PINK,
    ];

    static HEALTH = 12345;

    static DARKNESS_HIDE_THRESHOLD = 0.25;

    constructor(position, upgrades) {
        super(position, upgrades, PixelType.MAGIC, Magic.HEALTH);

        this.colorIndex = 0;
        this.nextColorIndex = 1;
        this.framesSinceLastColorChange = 0;

        this.color = Magic.SURFACE_COLORS[this.colorIndex];
        this.surfaceColor = this.color;

        this.previouslyActedLikeDirt = true;
    }

    actLikeDirt() {
        if (window.DEBUG_MODE) {
            return false;
        }
        const actLikeDirt = this.darkness >= Magic.DARKNESS_HIDE_THRESHOLD;
        if (actLikeDirt !== this.previouslyActedLikeDirt) {
            Story.instance.onMagicRevealed();
        }
        this.previouslyActedLikeDirt = actLikeDirt;
        return actLikeDirt;
    }

    getRenderColor() {
        if (this.actLikeDirt()) {
            return this.isSurface ? this.getDirtSurfaceColor() : this.getDirtColor();
        }
        return this.isSurface ? this.surfaceColor : this.color;
    }

    render(imageData) {
        if (this.framesSinceLastColorChange >= Magic.FRAMES_PER_COLOR_CHANGE) {
            this.colorIndex = this.nextColorIndex;
            this.nextColorIndex = Math.round(
                MathExtras.randomBetween(0, Magic.SURFACE_COLORS.length - 1)
            );
            if (this.nextColorIndex === this.colorIndex) {
                this.nextColorIndex = (this.nextColorIndex + 1) % Magic.SURFACE_COLORS.length;
            }
            this.framesSinceLastColorChange = 0;
        } else {
            this.framesSinceLastColorChange++;
        }
        const progress = this.framesSinceLastColorChange / Magic.FRAMES_PER_COLOR_CHANGE;
        this.color = Color.lerp(
            Magic.SURFACE_COLORS[this.colorIndex],
            Magic.SURFACE_COLORS[this.nextColorIndex],
            progress
        );
        this.surfaceColor = this.color;
        super.render(imageData);
        if (!this.actLikeDirt()) {
            this.needsUpdate = true;
        }
    }
}
