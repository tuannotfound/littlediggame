import PixelType from "./pixel_type.js";
import Dirt from "./dirt.js";
import Tombstone from "./tombstone.js";
import Gold from "./gold.js";
import Diamond from "./diamond.js";
import Egg from "./egg.js";
import Serpent from "./serpent.js";

export default class PixelFactory {
    static create(position, upgrades, type) {
        switch (type) {
            case PixelType.DIRT:
                return new Dirt(position, upgrades);
            case PixelType.TOMBSTONE:
                return new Tombstone(position, upgrades);
            case PixelType.GOLD:
                return new Gold(position, upgrades);
            case PixelType.DIAMOND:
                return new Diamond(position, upgrades);
            case PixelType.EGG:
                return new Egg(position, upgrades);
            case PixelType.SERPENT:
                return new Serpent(position, upgrades);
            default:
                throw Exception("Unsupported pixel type: " + type);
        }
    }
}
