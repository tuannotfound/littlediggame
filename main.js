import Game from "./game.js";
import SaveLoad from "./save_load.js";

import "./main.css";
import "./dialogs.css";
import "@fortawesome/fontawesome-free/css/all.css";

import Bot from "./testing/bot.js";

const RESIZE_DELAY_MS = 100;
window.DEBUG = false;

var game = null;
var bot = null;
document.onreadystatechange = function () {
    if (document.readyState == "complete") {
        let newGameBtn = document.getElementById("new_game");
        newGameBtn.addEventListener("click", () => {
            if (game) {
                console.log("Destroying existing game");
                game.destroy();
            }
            if (bot) {
                bot.stop();
                updateBotText();
            }
            console.log("Starting new game");
            game = new Game(window.innerWidth, window.innerHeight);
            game.init(document.getElementById("game"));
            updateUiVisibility();
            updateUiSizes();
        });
        let loadGameBtn = document.getElementById("load_game");
        loadGameBtn.addEventListener("click", () => {
            if (game) {
                console.log("Destroying existing game");
                game.destroy();
            }
            if (bot) {
                bot.stop();
                updateBotText();
            }
            console.log("Loading game");
            game = SaveLoad.load();
            game.init(document.getElementById("game"));
            updateUiVisibility();
            updateUiSizes();
        });
        if (SaveLoad.saveDataExists()) {
            loadGameBtn.removeAttribute("disabled");
        }
        window.addEventListener("storage", () => {
            if (SaveLoad.saveDataExists()) {
                loadGameBtn.removeAttribute("disabled");
            } else {
                loadGameBtn.setAttribute("disabled", "");
            }
        });
        // if (SaveLoad.saveDataExists()) {
        //     loadGameBtn.removeAttribute("disabled");
        //     loadGameBtn.click();
        // } else {
        //     newGameBtn.click();
        // }

        let debugCheckbox = document.getElementById("debug_checkbox");
        window.DEBUG = debugCheckbox.checked;
        debugCheckbox.addEventListener("change", () => {
            if (window.DEBUG == debugCheckbox.checked) {
                return;
            }
            window.DEBUG = debugCheckbox.checked;
            let debugDiv = document.getElementById("debug");
            if (window.DEBUG) {
                debugDiv.classList.remove("hidden");
            } else {
                debugDiv.classList.add("hidden");
            }
            if (game && game.activePixelBody) {
                // Really getting into the weeds here. Should probably add a
                // callback for when the checkbox is changed.
                game.activePixelBody.needsUpdate = true;
            }
            console.log("Debug: " + window.DEBUG);
        });

        let upgradesContainer = document.getElementById("upgrades_container");

        function updateUiVisibility() {
            if (game) {
                overlay.classList.remove("hidden");
                document.getElementById("legend").classList.remove("hidden");
                document.getElementById("info_container").classList.remove("dark");
                // Upgrades container is hidden by default
            } else {
                overlay.classList.add("hidden");
                upgradesContainer.classList.add("hidden");
            }
        }

        function updateUiSizes() {
            if (!game) {
                return;
            }
            let widthPx = game.width + "px";
            let heightPx = game.height + "px";
            let header = document.querySelector("#header");
            header.style.width = widthPx;
            let overlay = document.querySelector("#overlay");
            overlay.style.width = widthPx;
            overlay.style.height = heightPx;
            let upgradesContainer = document.querySelector("#upgrades_container");
            upgradesContainer.style.width = widthPx;
            upgradesContainer.style.height = heightPx;
        }
        function doResize() {
            if (!game) {
                return;
            }
            console.log("Resize: " + window.innerWidth + " x " + window.innerHeight);
            game.onResize(window.innerWidth, window.innerHeight);
            updateUiSizes();
        }
        var doResizeTimeout;
        window.addEventListener(
            "resize",
            () => {
                clearTimeout(doResizeTimeout);
                doResizeTimeout = setTimeout(doResize, RESIZE_DELAY_MS);
            },
            false
        );
        updateUiVisibility();
        updateUiSizes();

        function updateBotText() {
            let botBtn = document.getElementById("bot");
            botBtn.innerText = bot && bot.running ? "Stop bot" : "Start bot";
        }
        let botBtn = document.getElementById("bot");
        updateBotText();
        botBtn.addEventListener("click", () => {
            if (bot && bot.running) {
                bot.stop();
            } else {
                bot = new Bot(game);
                bot.start();
            }
            updateBotText();
        });
    }
};
