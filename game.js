class Game {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        const targetFps = 60;
        this.frameTime = 1000 / targetFps;
        this.lastFrameTime = 0;
        this.containerElement = null;
        this.planet = null;
        this.eaters = null;

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
        this.eaters = new Eaters(this);
        this.initUi();
        this.initHandlers();
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
        this.updateGold(0);
    }

    updateGold(amount) {
        this.gold += amount;
        this.goldElement.innerHTML = this.gold;
    }

    initHandlers() {
        this.containerElement.addEventListener("click", this.handleMouseEvent.bind(this), {
            passive: true,
        });
    }

    // Main game loop
    tick(deltaTime) {
        this.eaters.tick(deltaTime);
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
        console.log(event);
        // Get the angle between the mouse event and the center of the planet
        let angle = Math.atan2(
            event.offsetY - this.planet.centerY,
            event.offsetX - this.planet.centerX
        );
        this.eaters.spawn(angle);
        console.log("Health: " + (this.planet.getHealth() * 100).toFixed(2) + "%");
    }
}
