class Eater {
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
        this.chompDepth = 0.1;

        // Chance of finding treasure per 'width' per chomp
        // i.e. wider chomp = more chances to find treasure
        this.luck = 0.1;

        this.isDead = false;

        this.listeners = [];
    }

    addListener(listener) {
        this.listeners.push(listener);
    }

    removeListener(listener) {
        this.listeners = this.listeners.filter((l) => l !== listener);
    }

    notifyDeath() {
        for (let listener of this.listeners) {
            listener.onDeath(this);
        }
    }

    notifyTreasure() {
        for (let listener of this.listeners) {
            listener.onTreasure(this);
        }
    }

    tick(deltaTime) {
        if (deltaTime == 0 || this.isDead) {
            return;
        }
        if (this.r <= 0 || this.chompDepth <= 0) {
            this.isDead = true;
            this.notifyDeath();
        }
        let chomps = Math.ceil(this.speed * (deltaTime / 100));
        for (let i = 0; i < chomps; i++) {
            this.chomp();
        }
    }

    chomp() {
        this.r -= this.chompDepth;
        for (let i = 0; i < this.width; i++) {
            let ate = this.planet.eat(this.r, this.theta + i / 1000);
            if (ate && Math.random() < this.luck) {
                this.notifyTreasure();
            }
        }
        this.chompDepth -= 0.001 / this.durability;
    }
}
