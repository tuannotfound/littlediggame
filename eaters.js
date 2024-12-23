import Eater from "./eater.js";
import Layer from "./layer.js";

export default class Eaters {
    constructor(game) {
        this.game = game;
        this.layer = new Layer("eaters", game.width, game.height);

        this.eaters = [];
    }

    init() {
        this.layer.initOffscreen();
    }

    spawn(theta) {
        var eater = new Eater(this.game.planet, theta);
        eater.speed += this.game.upgrades.speed;
        eater.width += this.game.upgrades.width;
        eater.durability += this.game.upgrades.durability;
        eater.addListener({
            onTreasure: (eater) => {
                this.game.updateGold(this.game.upgrades.gold);
            },
            onDeath: (eater) => {
                eater.removeListener(this);
                this.despawn(eater);
            },
        });
        eater.init();
        this.eaters.push(eater);
    }

    despawn(eater) {
        this.eaters = this.eaters.filter((e) => e !== eater);
    }

    tick(deltaTime) {
        this.layer.getContext().clearRect(0, 0, this.game.width, this.game.height);
        this.layer.getContext().fillStyle = "black";

        for (let eater of this.eaters) {
            // let size = (3 * eater.chompDepth) / eater.initialChompDepth;
            // eater.tick(deltaTime);
            // let x = this.game.planet.centerX + (eater.r - size / 2) * Math.cos(eater.theta);
            // let y = this.game.planet.centerY + (eater.r - size / 2) * Math.sin(eater.theta);
            // this.layer.getContext().fillRect(x, y, size, size);
            eater.tick(deltaTime);
            let { x, y } = this.game.planet.polarToCartesian(eater.r, eater.theta);
            this.layer.getContext().fillRect(x, y, 1, 1);
        }
    }
}
