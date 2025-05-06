// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import Game from "./game.js";
import SaveLoad from "./save_load.js";
import VolumeWidget from "./volume_widget.js";

import "./main.css";
import "@fortawesome/fontawesome-free/css/all.css";

import Bot from "../testing/bot.js";

// Whether or not the debug search param is present.
window.DEBUG = false;
// Whether or not the 'debugging mode' checkbox is checked.
window.DEBUG_MODE = false;
window.SETTINGS = {
    censored: false,
    volume: 0.5,
    dialogDurationModifier: 1,
};
// For testing only.
window.GAME_SPEED = 1;

var game = null;
var bot = null;

document.onreadystatechange = function () {
    if (document.readyState == "complete") {
        const paramsString = window.location.search;
        const searchParams = new URLSearchParams(paramsString);
        window.DEBUG = searchParams.has("debug");
        initialize();
    }
};

function initialize() {
    initUi();
    initSettings();

    if (window.DEBUG) {
        initDebug();
    }

    document.body.style.visibility = "visible";
}

function initSettings() {
    SaveLoad.loadSettings();

    const settingsButton = document.getElementById("settings-button");
    const settingsDropdown = document.getElementById("settings-dropdown");

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

    const updateVolume = function (volume) {
        window.SETTINGS.volume = volume;
        if (volume == 0) {
            Howler.mute(true);
        } else {
            Howler.mute(false);
            console.log("Setting Howler volume to " + volume);
            Howler.volume(volume);
        }
    };
    updateVolume(window.SETTINGS.volume);
    const sfxVolumeContainer = document.getElementById("sfx-volume-container");
    const sfxVolumeWidget = new VolumeWidget(sfxVolumeContainer, "sfx", window.SETTINGS.volume);
    sfxVolumeWidget.addListener({
        onVolumeChange: updateVolume,
        onVolumeChangeComplete: () => {
            SaveLoad.saveSettings();
        },
    });

    const censorBtn = document.getElementById("censor");
    const toBeCensored = document.getElementById("to-be-censored");
    censorBtn.checked = window.SETTINGS.censor;
    if (censorBtn.checked) {
        toBeCensored.classList.add("blurry-text");
    }
    censorBtn.addEventListener("change", () => {
        window.SETTINGS.censor = censorBtn.checked;
        toBeCensored.classList.toggle("blurry-text");
        SaveLoad.saveSettings();
    });

    const dialogDurationInputs = document.querySelectorAll("#dialog-durations input");
    const dialogDurationListener = (event) => {
        window.SETTINGS.dialogDurationModifier = event.target.value;
        SaveLoad.saveSettings();
    };
    let foundInitialValueMatch = false;
    for (const dialogDurationInput of dialogDurationInputs) {
        if (dialogDurationInput.value == window.SETTINGS.dialogDurationModifier) {
            dialogDurationInput.checked = true;
            foundInitialValueMatch = true;
        } else {
            dialogDurationInput.checked = false;
        }
        dialogDurationInput.addEventListener("change", dialogDurationListener);
    }
    if (!foundInitialValueMatch) {
        dialogDurationInputs[Math.floor(dialogDurationInputs.length / 2)].checked = true;
        dialogDurationListener({ target: dialogDurationInputs[0] });
    }
}

function initUi() {
    const gameContainer = document.getElementById("game");
    const newGameBtn = document.getElementById("new-game");
    newGameBtn.addEventListener("click", () => {
        console.log("Starting new game");
        game = new Game();
        game.init(window.innerWidth, window.innerHeight, gameContainer);
        updateUiVisibility();
        updateUiSizes();
    });
    const loadGameBtn = document.getElementById("load-game");
    loadGameBtn.addEventListener("click", () => {
        console.log("Loading game");
        game = SaveLoad.load();
        game.init(window.innerWidth, window.innerHeight, gameContainer);
        updateUiVisibility();
        updateUiSizes();
    });
    const saveGameBtn = document.getElementById("save-game");
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

    const upgradesContainer = document.getElementById("upgrades-container");

    function updateUiVisibility() {
        if (game) {
            newGameBtn.classList.add("hidden");
            loadGameBtn.classList.add("hidden");
            saveGameBtn.classList.remove("hidden");
            const pauseBtn = document.getElementById("pause-resume");
            pauseBtn.classList.remove("hidden");
            pauseBtn.removeAttribute("disabled");
            document.getElementById("pregame-placeholder").classList.add("hidden");
            overlay.classList.remove("hidden");
            document.getElementById("legend").classList.remove("hidden");
            document.getElementById("info-container").classList.remove("dark");
            // Upgrades container is hidden by default
        } else {
            newGameBtn.classList.remove("hidden");
            loadGameBtn.classList.remove("hidden");
            saveGameBtn.classList.add("hidden");
            document.getElementById("pause-resume").classList.add("hidden");
            document.getElementById("pregame-placeholder").classList.remove("hidden");
            overlay.classList.add("hidden");
            upgradesContainer.classList.add("hidden");
        }
    }

    const RESIZE_DELAY_MS = 100;
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
        const upgradesContainer = document.querySelector("#upgrades-container");
        upgradesContainer.style.width = widthPx;
        upgradesContainer.style.height = heightPx;
    }
    function doResize() {
        if (!game) {
            return;
        }
        console.log("Resize: " + window.innerWidth + " x " + window.innerHeight);
        game.onResize(window.innerWidth, window.innerHeight, gameContainer);
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
}

function initDebug() {
    const debugDiv = document.getElementById("debug");
    debugDiv.classList.remove("hidden");

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
            if (!game) {
                document.getElementById("new-game").click();
            }
            bot = new Bot(game);
            bot.start();
        }
        updateBotText();
    });

    const debugCheckbox = document.getElementById("debug-checkbox");
    window.DEBUG_MODE = debugCheckbox.checked;
    debugCheckbox.addEventListener("change", () => {
        if (window.DEBUG_MODE == debugCheckbox.checked) {
            return;
        }
        window.DEBUG_MODE = debugCheckbox.checked;
        if (game && game.activePixelBody) {
            // Really getting into the weeds here. Should probably add a
            // callback for when the checkbox is changed.
            game.activePixelBody.needsUpdate = true;
        }
        console.log("Debug: " + window.DEBUG_MODE);
    });
}
