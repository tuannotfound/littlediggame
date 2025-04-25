// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import Color from "../color.js";

const DIRT_INITIAL_HEALTH = 100;

const DIRT_COLOR = new Color(133, 84, 5).immutableCopy();
const DIRT_SURFACE_COLOR = new Color(60, 180, 90).immutableCopy();
const ICE_COLOR = new Color(160, 194, 250).immutableCopy();
const ICE_SURFACE_COLOR = new Color(83, 145, 245).immutableCopy();
const GOOP_COLOR = new Color(203, 140, 230).immutableCopy();
const GOOP_SURFACE_COLOR = new Color(222, 16, 81).immutableCopy();

const TOMBSTONE_COLOR = new Color(170, 170, 170).immutableCopy();
const GOLD_COLOR = new Color(222, 176, 24).immutableCopy();
const DIAMOND_COLOR = new Color(130, 192, 207).immutableCopy();
const EGG_COLOR = new Color(247, 246, 230).immutableCopy();
const SERPENT_COLOR = new Color(160, 90, 184).immutableCopy();

export default class Constants {
    static get DIRT_INITIAL_HEALTH() {
        return DIRT_INITIAL_HEALTH;
    }
    static get DIRT_COLOR() {
        return DIRT_COLOR;
    }
    static get DIRT_SURFACE_COLOR() {
        return DIRT_SURFACE_COLOR;
    }
    static get ICE_DIRT_COLOR() {
        return ICE_COLOR;
    }
    static get ICE_DIRT_SURFACE_COLOR() {
        return ICE_SURFACE_COLOR;
    }
    static get GOOP_DIRT_COLOR() {
        return GOOP_COLOR;
    }
    static get GOOP_DIRT_SURFACE_COLOR() {
        return GOOP_SURFACE_COLOR;
    }
    static get TOMBSTONE_COLOR() {
        return TOMBSTONE_COLOR;
    }
    static get GOLD_COLOR() {
        return GOLD_COLOR;
    }
    static get DIAMOND_COLOR() {
        return DIAMOND_COLOR;
    }
    static get EGG_COLOR() {
        return EGG_COLOR;
    }
    static get SERPENT_COLOR() {
        return SERPENT_COLOR;
    }
}
