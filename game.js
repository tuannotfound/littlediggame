class Game {
    MAX_ZOOM = 4;
    MIN_ZOOM = 0.25;

    constructor(width, height) {
        this.width = width;
        this.height = height;
        const targetFps = 60;
        this.frameTime = 1000 / targetFps;
        this.lastFrameTime = 0;
        this.containerElement = null;
        this.planet = null;
        this.eaters = null;
        this.zoomLevel = 1;
        this.layer = null;

        this.gold = 0;
        this.goldElement = null;
        this.zoomPctElement = null;

        this.upgrades = {
            speed: 0,
            width: 0,
            durability: 0,
            gold: 1,
        };
    }

    init(containerElement) {
        this.containerElement = containerElement;
        this.layer = new Layer("main", this.width, this.height);
        this.layer.initOnscreen(containerElement);
        this.planet = new Planet(this.width, this.height, 300, 300, 300);
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
        let zoomInBtn = document.getElementById("zoom_in");
        zoomInBtn.addEventListener("click", () => this.zoom(0.25));
        let zoomOutBtn = document.getElementById("zoom_out");
        zoomOutBtn.addEventListener("click", () => this.zoom(-0.25));

        this.zoomPctElement = document.getElementById("zoom_pct");

        this.goldElement = document.getElementById("gold");
        this.updateGold(0);
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

        this.layer.getContext().clearRect(0, 0, this.layer.canvas.width, this.layer.canvas.height);
        let zoomedLayerWidth = this.planet.layer.width * this.zoomLevel;
        let zoomedLayerHeight = this.planet.layer.height * this.zoomLevel;

        this.layer.getContext().drawImage(
            this.planet.layer.canvas,
            0, // source x
            0, // source y
            this.planet.layer.width, // source width
            this.planet.layer.height, // source height
            this.width / 2, // - zoomedLayerWidth / 2, // destination x
            this.height / 2, // - zoomedLayerHeight / 2, // destination y
            zoomedLayerWidth,
            zoomedLayerHeight
        );

        this.lastFrameTime = Date.now();
        setTimeout(() => {
            const currentTime = Date.now();
            const deltaTime = currentTime - this.lastFrameTime;
            this.tick(deltaTime);
        }, this.frameTime);
    }

    zoom(amount) {
        if (this.zoomLevel + amount < this.MIN_ZOOM) {
            return;
        }
        if (this.zoomLevel + amount > this.MAX_ZOOM) {
            return;
        }
        this.zoomLevel += amount;
        this.zoomPctElement.innerHTML = (this.zoomLevel * 100).toFixed(0);
    }

    updateGold(amount) {
        this.gold += amount;
        this.goldElement.innerHTML = this.gold;
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
