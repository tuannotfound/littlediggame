import CircularPlanet from "./circular_planet.js";
import Game from "./game.js";
import Layer from "./layer.js";
import LittleGuy from "./little_guy.js";
import Pixel from "./diggables/pixel.js";
import Planet from "./planet.js";
import Upgrades from "./upgrades.js";
import Vector from "./vector.js";

export default class SaveLoad {
    KEY = "planeteater";

    static saveDataExists() {
        return !!localStorage.getItem(SaveLoad.KEY);
    }

    static save(game) {
        console.log("Saving @ " + new Date().toISOString());
        let json = JSON.stringify(game);
        localStorage.setItem(SaveLoad.KEY, json);
        window.dispatchEvent(new Event("storage"));
    }

    static load() {
        let savedJsonStr = localStorage.getItem(SaveLoad.KEY);
        return JSON.parse(savedJsonStr, SaveLoad.revive);
    }

    static revive(key, value) {
        if (typeof value === "object" && value !== null && value.hasOwnProperty("className")) {
            const className = value.className;

            const classMap = {
                CircularPlanet: CircularPlanet,
                Game: Game,
                Layer: Layer,
                LittleGuy: LittleGuy,
                Pixel: Pixel,
                Planet: Planet,
                Upgrades: Upgrades,
                Vector: Vector,
            };

            const cls = classMap[className];

            if (cls) {
                delete value.className;
                return cls.fromJSON(value);
            } else {
                throw new Error(
                    "Unknown class '" +
                        className +
                        "' - Alec, did you forget to add this to SaveLoad?"
                );
            }
        }
        return value;
    }
}
