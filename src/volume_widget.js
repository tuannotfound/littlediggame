// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

import MathExtras from "./math_extras.js";

import "./volume_widget.css";

export default class VolumeWidget {
    static MUTED_VOLUME_ICON_CLASS = "fa-volume-xmark";
    static LOW_VOLUME_ICON_CLASS = "fa-volume-low";
    static HIGH_VOLUME_ICON_CLASS = "fa-volume-high";
    static MUTED_VOLUME_ICON_REMOVES = [
        VolumeWidget.LOW_VOLUME_ICON_CLASS,
        VolumeWidget.HIGH_VOLUME_ICON_CLASS,
    ];
    static LOW_VOLUME_ICON_REMOVES = [
        VolumeWidget.MUTED_VOLUME_ICON_CLASS,
        VolumeWidget.HIGH_VOLUME_ICON_CLASS,
    ];
    static HIGH_VOLUME_ICON_REMOVES = [
        VolumeWidget.MUTED_VOLUME_ICON_CLASS,
        VolumeWidget.LOW_VOLUME_ICON_CLASS,
    ];

    static STEP = 5;

    constructor(container, idPrefix, initialVolume = 0.5) {
        this.volume = initialVolume;

        this.volumeIcon = document.createElement("i");
        this.volumeIcon.id = idPrefix + "-volume-icon";
        this.volumeIcon.classList.add("fa-solid");
        this.volumeIcon.classList.add("volume-icon");
        this.updateIcon();
        container.appendChild(this.volumeIcon);

        this.slider = document.createElement("input");
        this.slider.type = "range";
        this.slider.value = this.volume * 100;
        this.slider.min = 0;
        this.slider.step = VolumeWidget.STEP;
        this.slider.max = 100;
        this.slider.id = idPrefix + "-volume-slider";
        this.slider.classList.add("volume-slider");
        container.appendChild(this.slider);

        this.value = document.createElement("span");
        this.value.id = idPrefix + "-volume-value";
        this.value.classList.add("volume-value");
        this.updateValue();
        container.appendChild(this.value);

        this.listeners = [];

        this.slider.addEventListener("input", () => {
            this.updateVolume();
            for (const listener of this.listeners) {
                listener.onVolumeChange(this.volume);
            }
        });

        this.slider.addEventListener("change", () => {
            for (const listener of this.listeners) {
                listener.onVolumeChangeComplete();
            }
        });
    }

    addListener(listener) {
        this.listeners.push(listener);
    }

    removeListener(listener) {
        this.listeners.splice(this.listeners.indexOf(listener), 1);
    }

    updateIcon() {
        if (this.volume == 0) {
            this.volumeIcon.classList.add(VolumeWidget.MUTED_VOLUME_ICON_CLASS);
            this.volumeIcon.classList.remove(...VolumeWidget.MUTED_VOLUME_ICON_REMOVES);
        } else if (this.volume < 0.6) {
            this.volumeIcon.classList.add(VolumeWidget.LOW_VOLUME_ICON_CLASS);
            this.volumeIcon.classList.remove(...VolumeWidget.LOW_VOLUME_ICON_REMOVES);
        } else {
            this.volumeIcon.classList.add(VolumeWidget.HIGH_VOLUME_ICON_CLASS);
            this.volumeIcon.classList.remove(...VolumeWidget.HIGH_VOLUME_ICON_REMOVES);
        }
    }

    updateValue() {
        this.value.innerText = MathExtras.ceilToNearest(VolumeWidget.STEP, this.volume * 100);
    }

    updateVolume() {
        console.log("Updating volume to " + this.slider.value);
        this.volume = this.slider.value / 100;
        this.updateIcon();
        this.updateValue();
    }
}
