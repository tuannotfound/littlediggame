class Game {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        const targetFps = 60;
        this.frameTime = 1000 / targetFps;
        this.lastFrameTime = 0;
        this.containerElement = null;
        this.planet = null;
        this.eaters = [];

        this.gold = 0;
        this.goldElement = null;

        this.upgrades = {
            speed: 0,
            width: 0,
            durability: 0,
            gold: 1,
        };
    }

    init(containerElement) {
        this.containerElement = containerElement;
        this.planet = new Planet(this.containerElement, this.width, this.height, 300, 300, 300);
        this.initUi();
        this.initHandlers();
        this.addEater();
        this.tick(0);
    }

    initUi() {
        let speedBtn = document.getElementById("speed");
        speedBtn.addEventListener("click", () => {
            this.upgrades.speed += 1;
            console.log("Speed: " + this.upgrades.speed);
        });
        let widthBtn = document.getElementById("width");
        widthBtn.addEventListener("click", () => {
            this.upgrades.width += 1;
            console.log("Width: " + this.upgrades.width);
        });
        let durabilityBtn = document.getElementById("durability");
        durabilityBtn.addEventListener("click", () => {
            this.upgrades.durability += 1;
            console.log("Durability: " + this.upgrades.durability);
        });
        this.goldElement = document.getElementById("gold");
        this.updateGold();
    }

    updateGold() {
        this.goldElement.innerHTML = this.gold;
    }

    initHandlers() {
        this.containerElement.addEventListener("click", this.handleMouseEvent.bind(this), {
            passive: true,
        });
    }

    addEater() {
        var eater = new Eater(this.width, this.height, this.planet, Math.random() * 2 * Math.PI);
        eater.speed += this.upgrades.speed;
        eater.width += this.upgrades.width;
        eater.durability += this.upgrades.durability;
        eater.addListener({
            onTreasure: (eater) => {
                this.gold += this.upgrades.gold;
                this.updateGold();
                console.log("Gold: " + this.gold);
            },
            onDeath: (eater) => {
                eater.removeListener(this);
                this.eaters = this.eaters.filter((e) => e !== eater);
            },
        });
        this.eaters.push(eater);
    }

    tick(deltaTime) {
        // Update game state based on deltaTime
        // ...
        //this.addEater();
        for (let eater of this.eaters) {
            eater.tick(deltaTime);
        }
        this.planet.draw();

        this.lastFrameTime = Date.now();
        setTimeout(() => {
            const currentTime = Date.now();
            const deltaTime = currentTime - this.lastFrameTime;
            this.tick(deltaTime);
        }, this.frameTime);
    }

    handleMouseEvent(event) {
        if (event.button != 0) {
            return;
        }
        this.addEater();
        console.log("Health: " + (this.planet.getHealth() * 100).toFixed(2) + "%");
    }
}
