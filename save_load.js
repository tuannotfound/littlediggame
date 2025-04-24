import Game from "./game.js";

export default class SaveLoad {
    static KEY = "planeteater";
    static SETTINGS_KEY = "planeteater_settings";

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

    static saveSettings() {
        let json = JSON.stringify(window.SETTINGS);
        localStorage.setItem(SaveLoad.SETTINGS_KEY, json);
    }

    static loadSettings() {
        let savedJsonStr = localStorage.getItem(SaveLoad.SETTINGS_KEY);
        if (savedJsonStr) {
            window.SETTINGS = JSON.parse(savedJsonStr);
        }
    }
}
