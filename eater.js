class Eater {
    MIN_CHOMP_DEPTH = 0.01;
    INITIAL_CHOMP_DEPTH = 0.1;

    constructor(gameWidth, gameHeight, planet, theta) {
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        this.planet = planet;
        this.theta = theta;
        this.r = planet.radius;
        // Chomps per 100 ms
        this.speed = 1;
        // In 1/1000ths of a radian
        this.width = 1;

        this.durability = 1;
        this.chompDepth = this.INITIAL_CHOMP_DEPTH;

        // Chance of finding treasure per 'width' per chomp
        // i.e. wider chomp = more chances to find treasure
        this.luck = 0.1;

        this.totalEaten = 0;

        this.isDead = false;

        this.listeners = [];
    }

    addListener(listener) {
        this.listeners.push(listener);
    }

    removeListener(listener) {
        this.listeners = this.listeners.filter((l) => l !== listener);
    }

    init() {
        let onSurface = this.bringToSurface();
        console.log("init - onSurface = " + onSurface + ", r = " + this.r);
    }

    notifyDeath() {
        console.log("notifyDeath - total = " + this.totalEaten);
        for (let listener of this.listeners) {
            listener.onDeath(this);
        }
    }

    notifyTreasure() {
        for (let listener of this.listeners) {
            listener.onTreasure(this);
        }
    }

    bringToSurface() {
        let onSurface = false;
        while (this.r > 0) {
            for (let i = 0; i < this.width; i++) {
                let angle = this.theta + (i - this.width / 2) / 1000;
                let { x, y } = this.planet.polarToCartesian(this.r, angle);
                onSurface = onSurface || this.planet.getPixel(x, y).a > 0;
                if (onSurface) {
                    break;
                }
            }
            if (onSurface) {
                break;
            }
            this.r -= this.chompDepth;
        }
        return onSurface;
    }

    tick(deltaTime) {
        if (deltaTime == 0 || this.isDead) {
            return [];
        }
        if (this.r <= 0 || this.chompDepth <= this.MIN_CHOMP_DEPTH) {
            this.isDead = true;
            this.notifyDeath();
        }
        let chompCount = Math.ceil(this.speed * (deltaTime / 100));
        for (let i = 0; i < chompCount; i++) {
            this.chomp();
        }
    }

    chomp() {
        this.r -= this.chompDepth;
        for (let i = 0; i < this.width; i++) {
            // Ensure we center the chomp around our current angle as width changes.
            let angle = this.theta + (i - this.width / 2) / 1000;
            let { x, y } = this.planet.polarToCartesian(this.r, angle);
            let pixel = this.planet.getPixel(x, y);
            if (pixel.a == 0) {
                continue;
            }
            this.totalEaten++;
            this.chompDepth -= 0.01 / (this.durability + this.width);
            this.planet.setPixel(x, y, { r: 0, g: 0, b: 0, a: 0 });
            if (Math.random() < this.luck) {
                this.notifyTreasure();
            }
        }
    }
}
