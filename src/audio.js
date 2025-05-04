// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import { Howl, Howler } from "howler";

export default class Audio {
    static SFX_PREFIX = "assets/sfx/";
    static #instance;

    constructor() {
        if (Audio.#instance) {
            return Audio.#instance;
        }
        Audio.#instance = this;

        this.playCountMap = new Map();

        this.dirtDamageSfx = new MultiAudioWrapper([
            Audio.SFX_PREFIX + "dirt_dmg_0.ogg",
            Audio.SFX_PREFIX + "dirt_dmg_1.ogg",
        ]);
        this.initRateLimited(this.dirtDamageSfx);

        this.dirtDigSfx = new MultiAudioWrapper([
            Audio.SFX_PREFIX + "dirt_dig_0.ogg",
            Audio.SFX_PREFIX + "dirt_dig_1.ogg",
        ]);
        this.initRateLimited(this.dirtDigSfx);

        this.oreDamageSfx = new MultiAudioWrapper([
            Audio.SFX_PREFIX + "ore_dmg_0.ogg",
            Audio.SFX_PREFIX + "ore_dmg_1.ogg",
        ]);
        this.initRateLimited(this.oreDamageSfx);

        this.oreDigSfx = new Howl({
            src: [Audio.SFX_PREFIX + "ore_dig_0.ogg"],
        });
        this.initRateLimited(this.oreDigSfx);

        this.walkSfx = new MultiAudioWrapper(
            [Audio.SFX_PREFIX + "walk_0.ogg", Audio.SFX_PREFIX + "walk_1.ogg"],
            0.5,
            false
        );
        this.initRateLimited(this.walkSfx);

        this.deathSfx = new MultiAudioWrapper([
            Audio.SFX_PREFIX + "death_tombstone_0.ogg",
            Audio.SFX_PREFIX + "death_tombstone_1.ogg",
        ]);
        this.initRateLimited(this.deathSfx);

        this.deathAscentSfx = new Howl({
            src: [Audio.SFX_PREFIX + "death_ascent.ogg"],
        });
        this.initRateLimited(this.deathAscentSfx);

        this.ominousWindSfx = new Howl({
            src: [Audio.SFX_PREFIX + "wind.wav"],
            volume: 1.0,
        });
        this.ominousStingSfx = new Howl({
            src: [Audio.SFX_PREFIX + "horror.wav"],
            volume: 1.0,
        });
        this.shieldSfx = new Howl({
            src: [Audio.SFX_PREFIX + "shield.ogg"],
        });
    }

    initRateLimited(sfx) {
        this.playCountMap.set(sfx, 0);
        sfx.on("end", () => {
            this.onEndCallback(sfx);
        });
    }

    static get instance() {
        return Audio.#instance || new Audio();
    }

    playDirtDamage() {
        this.playRateLimited(this.dirtDamageSfx);
    }

    playDirtDig() {
        this.playRateLimited(this.dirtDigSfx);
    }

    playOreDamage() {
        this.playRateLimited(this.oreDamageSfx);
    }

    playOreDig() {
        this.playRateLimited(this.oreDigSfx);
    }

    playWalk() {
        this.playRateLimited(this.walkSfx);
    }

    playDeath() {
        this.playRateLimited(this.deathSfx);
    }

    playDeathAscent() {
        this.playRateLimited(this.deathAscentSfx);
    }

    playOminousWind() {
        this.ominousWindSfx.play();
    }

    playOminousSting() {
        this.ominousStingSfx.play();
    }

    playShield() {
        this.shieldSfx.play();
    }

    playRateLimited(sfx) {
        if (this.shouldRateLimit(sfx)) {
            return;
        }
        sfx.play();
    }

    shouldRateLimit(sound) {
        if (!this.playCountMap.has(sound)) {
            return false;
        }
        if (this.playCountMap.get(sound) >= 2) {
            return true;
        }
        this.playCountMap.set(sound, this.playCountMap.get(sound) + 1);
        return false;
    }

    onEndCallback(sound) {
        if (!this.playCountMap.has(sound)) {
            return;
        }
        this.playCountMap.set(sound, this.playCountMap.get(sound) - 1);
    }
}

class MultiAudioWrapper {
    constructor(audioFiles, vol = 0.75, random = true) {
        this.howls = [];
        for (let i = 0; i < audioFiles.length; i++) {
            this.howls.push(
                new Howl({
                    src: [audioFiles[i]],
                    volume: vol,
                })
            );
        }
        this.random = random;
        this.index = 0;
    }

    play() {
        if (this.random) {
            this.index = Math.floor(Math.random() * this.howls.length);
        } else {
            this.index = (this.index + 1) % this.howls.length;
        }
        this.howls[this.index].play();
    }

    on(event, callback) {
        for (let howl of this.howls) {
            howl.on(event, callback);
        }
    }
}
