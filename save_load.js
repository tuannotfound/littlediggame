import CircularPlanet from "./pixel_bodies/circular_planet.js";
import Game from "./game.js";
import Layer from "./layer.js";
import LittleGuy from "./little_guy.js";
import Pixel from "./diggables/pixel.js";
import Planet from "./pixel_bodies/planet.js";
import Upgrades from "./upgrades.js";
import Vector from "./vector.js";
import Serpent from "./pixel_bodies/serpent.js";

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
        if (
            typeof value === "object" &&
            value !== null &&
            value.hasOwnProperty("className") &&
            value.className == Game.name
        ) {
            return Game.fromJSON(value);
        }
        return value;
    }
}
