// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import Vector from "../vector.js";
import Diamond from "./diamond.js";
import Dirt from "./dirt.js";
import Egg from "./egg.js";
import Gold from "./gold.js";
import Magic from "./magic.js";
import PixelType from "./pixel_type.js";
import Serpent from "./serpent.js";
import Tombstone from "./tombstone.js";

export default class PixelFactory {
    static create(position, upgrades, type, healthModifier = 1) {
        switch (type) {
            case PixelType.DIRT:
                return new Dirt(position, upgrades, healthModifier);
            case PixelType.TOMBSTONE:
                return new Tombstone(position, upgrades, healthModifier);
            case PixelType.GOLD:
                return new Gold(position, upgrades, healthModifier);
            case PixelType.DIAMOND:
                return new Diamond(position, upgrades, healthModifier);
            case PixelType.MAGIC:
                return new Magic(position, upgrades);
            case PixelType.EGG:
                return new Egg(position, upgrades);
            case PixelType.SERPENT:
                return new Serpent(position, upgrades);
            default:
                throw Exception("Unsupported pixel type: " + type);
        }
    }

    static createFromJSON(json, upgrades) {
        let position = Vector.fromJSON(json.position);
        let type = PixelType[json.typeName];
        let pixel = PixelFactory.create(position, upgrades, type);
        pixel.color = json.color;
        pixel.surfaceColor = json.surfaceColor;
        pixel.health = json.health;
        pixel.healthModifier = json.healthModifier;
        pixel.isSurface = json.isSurface;
        pixel.darkness = json.darkness;
        return pixel;
    }
}
