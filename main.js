import Game from "./game.js";
import SaveLoad from "./save_load.js";
import "./main.css";

const RESIZE_DELAY_MS = 100;
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
            game = new Game(window.innerWidth, window.innerHeight);
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

        let upgradesContainer = document.getElementById("upgrades_container");
        let showUpgradesBtn = document.getElementById("show_upgrades");
        showUpgradesBtn.addEventListener("click", () => {
            upgradesContainer.classList.remove("hidden");
            showUpgradesBtn.classList.add("hidden");
        });
        let hideUpgradesBtn = document.getElementById("hide_upgrades");
        hideUpgradesBtn.addEventListener("click", () => {
            upgradesContainer.classList.add("hidden");
            showUpgradesBtn.classList.remove("hidden");
        });

        function updateUiSizes() {
            let widthPx = game.width + "px";
            let heightPx = game.height + "px";
            document.querySelector("#header").style.width = widthPx;
            let overlay = document.querySelector("#overlay");
            overlay.style.width = widthPx;
            overlay.style.height = heightPx;
            let upgradesContainer = document.querySelector("#upgrades_container");
            upgradesContainer.style.width = widthPx;
            upgradesContainer.style.height = heightPx;
        }
        function doResize() {
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
        updateUiSizes();
    }
};
