import Game from "./game2.js";

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
window.DEBUG = false;

var game = new Game(GAME_WIDTH, GAME_HEIGHT);

document.onreadystatechange = function () {
    if (document.readyState == "complete") {
        game.init(document.getElementById("game"));
    }
};
