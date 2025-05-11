// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import { Howl, Howler } from "howler";
import PixelType from "./diggables/pixel_type.js";
import SwissPlanet from "./pixel_bodies/swiss_planet.js";
import SpikyPlanet from "./pixel_bodies/spiky_planet.js";
import Serpent from "./pixel_bodies/serpent.js";

export default class Audio {
    static DIG_DMG_DIRT = "dig_dmg_dirt";
    static DIG_FINISH_DIRT = "dig_finish_dirt";
    static DIG_DMG_GOLD = "dig_dmg_gold";
    static DIG_FINISH_GOLD = "dig_finish_gold";
    static DIG_DMG_TOMBSTONE = "dig_dmg_tombstone";
    static DIG_FINISH_TOMBSTONE = "dig_finish_tombstone";
    static DIG_DMG_DIAMOND = "dig_dmg_diamond";
    static DIG_FINISH_DIAMOND = "dig_finish_diamond";
    static DIG_DMG_MAGIC = "dig_dmg_magic";
    static DIG_FINISH_MAGIC = "dig_finish_magic";
    static DIG_DMG_EGG = "dig_dmg_egg";
    static DIG_FINISH_EGG = "dig_finish_egg";
    static DIG_DMG_SERPENT = "dig_dmg_serpent";
    static DIG_FINISH_SERPENT = "dig_finish_serpent";
    static DEATH_REGULAR = "death_regular";
    static DEATH_ASCEND = "death_ascend";
    static DEATH_DESCEND = "death_descend";
    static DEATH_EXPLODE = "death_explode";
    static DEATH_EGG = "death_egg";
    static DEATH_SERPENT_ATTACK = "death_serpent_attack";
    static STORY_SERPENT_HISS = "story_serpent_hiss";
    static STORY_FOREMAN_DEATH = "story_foreman_death";
    static STORY_SKY_CHANGE = "story_sky_change";
    static STORY_SERPENT_REVEAL = "story_serpent_reveal";
    static STORY_COMPANY_RADIO_STATIC = "story_company_radio_static";
    static STORY_SERPENT_DEATH = "story_serpent_death";
    static WALK_REGULAR = "walk_regular";
    static WALK_GOOP = "walk_goop";
    static WALK_SNOW = "walk_snow";
    static WALK_SERPENT = "walk_serpent";
    static NEXT_PLANET = "next_planet";
    static SHIELD_ACTIVATE = "shield_activate";
    static SHIELD_DEACTIVATE = "shield_deactivate";
    static SHIELD_BLOCK_ATTACK = "shield_block_attack";
    static SERPENT_ATTACK = "serpent_attack";
    static UI_UPGRADES_OPEN = "ui_upgrades_open";
    static UI_UPGRADES_CLOSE = "ui_upgrades_close";
    static UI_UPGRADE_PURCHASED = "ui_upgrade_purchased";
    static UI_VOLUME_CHANGE = "ui_volume_change";

    static #DIG_DMG_MAP = new Map([
        [PixelType.DIRT.name, Audio.DIG_DMG_DIRT],
        [PixelType.GOLD.name, Audio.DIG_DMG_GOLD],
        [PixelType.TOMBSTONE.name, Audio.DIG_DMG_TOMBSTONE],
        [PixelType.DIAMOND.name, Audio.DIG_DMG_DIAMOND],
        [PixelType.MAGIC.name, Audio.DIG_DMG_MAGIC],
        [PixelType.EGG.name, Audio.DIG_DMG_EGG],
        [PixelType.SERPENT.name, Audio.DIG_DMG_SERPENT],
    ]);
    static #DIG_FINISH_MAP = new Map([
        [PixelType.DIRT.name, Audio.DIG_FINISH_DIRT],
        [PixelType.GOLD.name, Audio.DIG_FINISH_GOLD],
        [PixelType.TOMBSTONE.name, Audio.DIG_FINISH_TOMBSTONE],
        [PixelType.DIAMOND.name, Audio.DIG_FINISH_DIAMOND],
        [PixelType.MAGIC.name, Audio.DIG_FINISH_MAGIC],
        [PixelType.EGG.name, Audio.DIG_FINISH_EGG],
        [PixelType.SERPENT.name, Audio.DIG_FINISH_SERPENT],
    ]);
    static #WALK_MAP = new Map([
        [SwissPlanet.name, Audio.WALK_GOOP],
        [SpikyPlanet.name, Audio.WALK_SNOW],
        [Serpent.name, Audio.WALK_SERPENT],
    ]);

    static #SFX_PATH_PREFIX = "assets/sfx/";
    static #instance;
    #sfxMap;

    constructor() {
        Audio.#instance = this;
        this.#sfxMap = new Map();
    }

    static get instance() {
        if (Audio.#instance) {
            return Audio.#instance;
        }
        return Audio.init();
    }

    static init() {
        const audio = new Audio();
        audio.initWithJson("sfx.json");
        return audio;
    }

    initWithJson(jsonPath) {
        const result = (async () => {
            const response = await fetch(Audio.#SFX_PATH_PREFIX + jsonPath);
            return await response.json();
        })();

        // Block on the result and parse.
        result.then((sfxJson) => {
            for (const [key, values] of Object.entries(sfxJson)) {
                const files = values.files || [];
                const volume = values.volume || 1;
                const rateLimit = values.rate_limit || 0;
                const sequential = values.sequential || false;
                this.#sfxMap.set(
                    key,
                    new SoundEffect(
                        key,
                        Audio.#SFX_PATH_PREFIX,
                        files,
                        volume,
                        rateLimit,
                        sequential
                    )
                );
            }
        });
    }

    playDigDamage(pixelType) {
        this.#sfxMap.get(Audio.#DIG_DMG_MAP.get(pixelType.name))?.play();
    }

    playDigFinish(pixelType) {
        this.#sfxMap.get(Audio.#DIG_FINISH_MAP.get(pixelType.name))?.play();
    }

    playWalk(pixelBodyName) {
        if (!Audio.#WALK_MAP.has(pixelBodyName)) {
            this.#sfxMap.get(Audio.WALK_REGULAR)?.play();
            return;
        }
        this.#sfxMap.get(Audio.#WALK_MAP.get(pixelBodyName))?.play();
    }

    play(key) {
        if (!this.#sfxMap.has(key)) {
            console.error("Attempted to play SFX for key that doesn't exist: " + key);
            return;
        }
        this.#sfxMap.get(key)?.play();
    }
}

class SoundEffect {
    constructor(key, path_prefix, files, volume, rateLimit, sequential) {
        this.key = key;
        this.rateLimit = rateLimit;
        this.sequential = sequential;
        this.howls = [];
        for (const file of files) {
            const howl = new Howl({
                src: [path_prefix + file],
                volume: volume,
            });
            if (this.rateLimit > 0) {
                howl.on("end", this.onEnd.bind(this));
            }
            this.howls.push(howl);
        }
        this.playIndex = 0;
        // Only tracked if this has a rate limit.
        this.playingCount = 0;
    }

    play() {
        if (this.howls.length == 0) {
            return;
        }
        if (this.rateLimit > 0) {
            if (this.playingCount >= this.rateLimit) {
                if (window.DEBUG_MODE) {
                    console.log(
                        "Not playing " +
                            this.key +
                            " due to rate limit (" +
                            this.playingCount +
                            " >= " +
                            this.rateLimit +
                            ")"
                    );
                }
                return;
            }
            this.playingCount++;
        }
        if (this.sequential) {
            this.playIndex = (this.playIndex + 1) % this.howls.length;
        } else {
            const previousPlayIndex = this.playIndex;
            this.playIndex = Math.floor(Math.random() * this.howls.length);
            // Avoid repeating if we have enough choices to prevent simply alternativing between 2
            // SFX.
            if (this.howls.length > 2 && this.playIndex === previousPlayIndex) {
                this.playIndex = (this.playIndex + 1) % this.howls.length;
            }
        }
        this.howls[this.playIndex].play();
    }

    onEnd() {
        this.playingCount--;
    }
}
