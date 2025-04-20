import Game from "./game.js";
import SaveLoad from "./save_load.js";

import "./main.css";
import "./cooldown_button.css";
import "./dialogs.css";
import "./timer_bar.css";
import "@fortawesome/fontawesome-free/css/all.css";

import Bot from "./testing/bot.js";

const RESIZE_DELAY_MS = 100;
window.DEBUG = false;
window.SETTINGS = {
    censored: false,
};

var game = null;
var bot = null;
document.onreadystatechange = function () {
    if (document.readyState == "complete") {
        const paramsString = window.location.search;
        const searchParams = new URLSearchParams(paramsString);
        initialize(searchParams.has("debug"));
    }
};

function initialize(debug) {
    const newGameBtn = document.getElementById("new_game");
    newGameBtn.addEventListener("click", () => {
        console.log("Starting new game");
        game = new Game(window.innerWidth, window.innerHeight);
        game.init(document.getElementById("game"));
        updateUiVisibility();
        updateUiSizes();
    });
    const loadGameBtn = document.getElementById("load_game");
    loadGameBtn.addEventListener("click", () => {
        console.log("Loading game");
        game = SaveLoad.load();
        game.init(document.getElementById("game"));
        updateUiVisibility();
        updateUiSizes();
    });
    const saveGameBtn = document.getElementById("save_game");
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

    const upgradesContainer = document.getElementById("upgrades_container");

    function updateUiVisibility() {
        if (game) {
            newGameBtn.classList.add("hidden");
            loadGameBtn.classList.add("hidden");
            saveGameBtn.classList.remove("hidden");
            const pauseBtn = document.getElementById("pause_resume");
            pauseBtn.classList.remove("hidden");
            pauseBtn.removeAttribute("disabled");
            overlay.classList.remove("hidden");
            document.getElementById("legend").classList.remove("hidden");
            document.getElementById("info_container").classList.remove("dark");
            // Upgrades container is hidden by default
        } else {
            newGameBtn.classList.remove("hidden");
            loadGameBtn.classList.remove("hidden");
            saveGameBtn.classList.add("hidden");
            document.getElementById("pause_resume").classList.add("hidden");
            overlay.classList.add("hidden");
            upgradesContainer.classList.add("hidden");
        }
    }

    function updateUiSizes() {
        if (!game) {
            return;
        }
        const widthPx = game.width + "px";
        const heightPx = game.height + "px";
        const header = document.querySelector("#header");
        header.style.width = widthPx;
        const overlay = document.querySelector("#overlay");
        overlay.style.width = widthPx;
        overlay.style.height = heightPx;
        const upgradesContainer = document.querySelector("#upgrades_container");
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
        const botBtn = document.getElementById("bot");
        botBtn.innerText = bot && bot.running ? "Stop bot" : "Start bot";
    }
    const botBtn = document.getElementById("bot");
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

    const settingsButton = document.getElementById("settings_button");
    const settingsDropdown = document.getElementById("settings_dropdown");

    settingsButton.addEventListener("click", function (event) {
        event.stopPropagation(); // Prevent the click from immediately closing the dropdown
        settingsDropdown.classList.toggle("hidden");
    });

    // Close the dropdown if the user clicks outside of it
    window.addEventListener("click", function (event) {
        if (!settingsButton.contains(event.target) && !settingsDropdown.contains(event.target)) {
            settingsDropdown.classList.add("hidden");
        }
    });

    let censorBtn = document.getElementById("censor");
    censorBtn.addEventListener("change", () => {
        window.SETTINGS.censor = censorBtn.checked;
    });

    if (debug) {
        const debugDiv = document.getElementById("debug");
        debugDiv.classList.remove("hidden");
    }
    const debugCheckbox = document.getElementById("debug_checkbox");
    window.DEBUG = debugCheckbox.checked;
    debugCheckbox.addEventListener("change", () => {
        if (window.DEBUG == debugCheckbox.checked) {
            return;
        }
        window.DEBUG = debugCheckbox.checked;
        if (game && game.activePixelBody) {
            // Really getting into the weeds here. Should probably add a
            // callback for when the checkbox is changed.
            game.activePixelBody.needsUpdate = true;
        }
        console.log("Debug: " + window.DEBUG);
    });
}
