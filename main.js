import Game from "./game.js";
import SaveLoad from "./save_load.js";

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
window.DEBUG = false;

var game = null;
document.onreadystatechange = function () {
    if (document.readyState == "complete") {
        let newGameBtn = document.getElementById("new_game");
        newGameBtn.addEventListener("click", () => {
            if (game) {
                console.log("Destroying existing game");
                game.destroy();
            }
            console.log("Starting new game");
            game = new Game(GAME_WIDTH, GAME_HEIGHT);
            game.init(document.getElementById("game"));
        });
        let loadGameBtn = document.getElementById("load_game");
        loadGameBtn.addEventListener("click", () => {
            if (game) {
                console.log("Destroying existing game");
                game.destroy();
            }
            console.log("Loading game");
            game = SaveLoad.load();
            game.init(document.getElementById("game"));
        });
        if (SaveLoad.saveDataExists()) {
            loadGameBtn.removeAttribute("disabled");
        }
        // Just for now, remove later
        newGameBtn.click();
    }
};
