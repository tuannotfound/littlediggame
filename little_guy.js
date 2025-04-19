import Layer from "./layer.js";
import Vector from "./vector.js";
import PixelType from "./diggables/pixel_type.js";
import Color from "./color.js";

export default class LittleGuy {
    static HEAD_COLORS = [
        new Color(252, 220, 210).immutableCopy(),
        new Color(245, 192, 157).immutableCopy(),
        new Color(241, 170, 144).immutableCopy(),
        new Color(249, 220, 177).immutableCopy(),
        new Color(254, 209, 165).immutableCopy(),
        new Color(250, 173, 115).immutableCopy(),
        new Color(219, 177, 137).immutableCopy(),
        new Color(204, 142, 74).immutableCopy(),
        new Color(205, 125, 54).immutableCopy(),
        new Color(178, 92, 32).immutableCopy(),
        new Color(134, 76, 43).immutableCopy(),
        new Color(86, 49, 23).immutableCopy(),
    ];
    static DEBUG_OUTLINE_COLOR = new Color(0, 0, 0, 40).immutableCopy();
    static SHIELDED_OUTLINE_COLOR = new Color(93, 140, 194, 190).immutableCopy();
    static ASSUMED_FPS = 60;
    static EXPLOSIVE_BODY_COLOR = new Color(214, 58, 41).immutableCopy();
    static DEFAULT_BODY_COLOR = new Color(87, 125, 180).immutableCopy();
    // Angelic robes.
    static ASCENDING_BODY_COLOR = new Color(215, 215, 215).immutableCopy();
    // Lil' devil.
    static DESCENDING_BODY_COLOR = new Color(217, 30, 43).immutableCopy();
    // Burnt toast.
    static DEATH_BY_EGG_COLOR = new Color(26, 19, 10).immutableCopy();
    static TRANSPARENT_COLOR = new Color(0, 0, 0, 0).immutableCopy();
    static MIN_FRAMES_BETWEEN_MOVES = 10;
    // The likelihood this little guy will wander in a given frame.
    static MOVE_PROBABILITY_PCT = 2;
    static DIG_PROBABILITY_PCT = 0.005;
    // The likelihood that we'll continue moving in the direction we were already moving in.
    static DIRECTION_PERSISTENCE_FACTOR = 0.9;
    static DEATH_BY_EGG_FRAMES_BEFORE_INACTIVE = 40;

    constructor(pixelBody, positionInPixelBodySpace, upgrades, immaculate) {
        this.pixelBody = pixelBody;
        this.positionInPixelBodySpace = positionInPixelBodySpace;
        this.upgrades = upgrades;
        this.immaculate = immaculate;

        // This is relative to the center of the pixelBody
        this.position = this.toLocalSpace(this.positionInPixelBodySpace);

        let angle = Math.atan2(this.position.y, this.position.x);
        this.orientation = this.angleToOrientation(angle);

        let headColorIndex = Math.floor(Math.random() * LittleGuy.HEAD_COLORS.length);
        this.headColor = Color.wiggle(LittleGuy.HEAD_COLORS[headColorIndex], 5);

        this.layer = new Layer("little_guy", 3, 3);
        this.center = new Vector(1, 1);
        this.previousPositions = [];
        this.previousDirection = 0;
        this.closestSurfacePixel = null;
        this.digging = false;
        this.diggingFrames = 0;
        this.pixelBeingDug = null;
        this.framesSinceLastMove = 0;
        this._shielded = false;
        // Whether we're dead or alive.
        this.alive = true;
        this.ascentionProgressPct = 0;
        // Whether we should do anything at all, which is different than being alive or dead.
        this.active = true;

        this.digsRemaining = this.upgrades.digCount;

        // Less likely to be saintly if they were not immaculate.
        let saintlyThreshold = this.immaculate
            ? this.upgrades.saintlyPctImmaculate
            : this.upgrades.saintlyPctMaculate;
        this.saintly = Math.random() < saintlyThreshold;
        if (!this.saintly) {
            console.log("Uh oh, we got a bad one, folks");
        }
        this.explosive = Math.random() < this.upgrades.explosionChance;
        this.deathByEgg = false;
        this.framesSinceDeath = 0;
        this.deathBySerpent = false;

        this.listeners = [];
    }

    toJSON() {
        return {
            positionInPixelBodySpace: this.positionInPixelBodySpace,
            immaculate: this.immaculate,
            orientation: this.orientation,
            headColor: this.headColor,
            previousPositions: this.previousPositions,
            previousDirection: this.previousDirection,
            digging: this.digging,
            pixelBeingDug: this.pixelBeingDug,
            digProcessPct: this.digProcessPct,
            shielded: this._shielded,
            alive: this.alive,
            ascentionProgressPct: this.ascentionProgressPct,
            active: this.active,
            digsRemaining: this.digsRemaining,
            saintly: this.saintly,
            explosive: this.explosive,
            deathByEgg: this.deathByEgg,
            deathBySerpent: this.deathBySerpent,
        };
    }

    static fromJSON(json, pixelBody, upgrades, pixelBeingDug) {
        let littleGuy = new LittleGuy(
            pixelBody,
            Vector.fromJSON(json.positionInPixelBodySpace),
            upgrades,
            json.immaculate
        );
        littleGuy.orientation = Vector.fromJSON(json.orientation);
        littleGuy.headColor = Color.fromJSON(json.headColor);
        for (const previousPositionJson of json.previousPositions) {
            littleGuy.previousPositions.push(Vector.fromJSON(previousPositionJson));
        }
        littleGuy.previousDirection = json.previousDirection;
        littleGuy.digging = json.digging;
        littleGuy.pixelBeingDug = pixelBeingDug;
        littleGuy.digProcessPct = json.digProcessPct;
        littleGuy.shielded = json.shielded;
        littleGuy.alive = json.alive;
        littleGuy.ascentionProgressPct = json.ascentionProgressPct;
        littleGuy.active = json.active;
        littleGuy.digsRemaining = json.digsRemaining;
        littleGuy.saintly = json.saintly;
        littleGuy.explosive = json.explosive;
        littleGuy.deathByEgg = json.deathByEgg;
        littleGuy.deathBySerpent = json.deathBySerpent;
        return littleGuy;
    }

    init() {
        this.layer.initOffscreen();

        this.addPreviousPosition(this.positionInPixelBodySpace);

        this.goToNearestSurfacePixel();
    }

    notifyDigsComplete(pixels) {
        for (const listener of this.listeners) {
            listener.onDigsComplete(pixels);
        }
    }

    notifyDeath() {
        for (const listener of this.listeners) {
            listener.onDeath(this);
        }
    }

    notifyInactive() {
        for (const listener of this.listeners) {
            listener.onInactive(this);
        }
    }

    addListener(listener) {
        this.listeners.push(listener);
    }

    removeListener(listener) {
        let index = this.listeners.indexOf(listener);
        if (index >= 0) {
            this.listeners.splice(index, 1);
        }
    }

    addPreviousPosition(positionInPixelBodySpace) {
        this.previousPositions.push(positionInPixelBodySpace);
        // Limit it to the 4 most recent positions
        if (this.previousPositions.length > 4) {
            this.previousPositions.shift();
        }
    }

    toLocalSpace(positionInPlaceSpace) {
        let positionInLocalSpace = this.pixelBody.center.copy();
        positionInLocalSpace.sub(positionInPlaceSpace);
        positionInLocalSpace.x = -positionInLocalSpace.x;
        positionInLocalSpace.y = -positionInLocalSpace.y;
        return positionInLocalSpace;
    }

    toPixelBodySpace(position) {
        let positionInPixelBodySpace = this.pixelBody.center.copy();
        positionInPixelBodySpace.add(position);
        return positionInPixelBodySpace;
    }

    getHeadColor() {
        if (!this.alive) {
            if (this.deathByEgg) {
                if (this.framesSinceDeath < LittleGuy.DEATH_BY_EGG_FRAMES_BEFORE_INACTIVE / 2) {
                    return LittleGuy.DEATH_BY_EGG_COLOR;
                } else {
                    return LittleGuy.TRANSPARENT_COLOR;
                }
            } else if (this.upgrades.afterlife) {
                let alpha = this.getAscensionAlpha();
                let color = this.headColor.copy();
                color.a = alpha;
                return color;
            }
        }
        if (this.shouldRenderDigPose()) {
            return null;
        }
        return this.headColor;
    }

    getBodyColor() {
        if (!this.alive) {
            if (this.deathByEgg) {
                return LittleGuy.DEATH_BY_EGG_COLOR;
            } else if (this.upgrades.afterlife) {
                let alpha = this.getAscensionAlpha();
                let color = this.saintly
                    ? LittleGuy.ASCENDING_BODY_COLOR.copy()
                    : LittleGuy.DESCENDING_BODY_COLOR.copy();
                color.a = alpha;
                return color;
            }
        }
        if (this.shouldRenderDigPose()) {
            return this.headColor;
        }
        if (this.explosive) {
            return LittleGuy.EXPLOSIVE_BODY_COLOR;
        }
        return LittleGuy.DEFAULT_BODY_COLOR;
    }

    set shielded(value) {
        this._shielded = value;
        this.updateRenderData();
    }

    shouldRenderDigPose() {
        // The dig pose is where the head replaces the body, as if the little guy is crouched down
        // at work. The little guy should pop in and out of the dig pose during dig operations.
        if (!this.digging) {
            return false;
        }

        // Assuming 60 FPS, we want to enter the dig pose for frames 0-20.
        return this.diggingFrames % LittleGuy.ASSUMED_FPS < LittleGuy.ASSUMED_FPS / 3;
    }

    getAscensionAlpha() {
        return ((100 - this.ascentionProgressPct) * 255) / 100;
    }

    updateRenderData() {
        const imageData = this.layer
            .getContext()
            .createImageData(this.layer.width, this.layer.height);

        if (this._shielded || window.DEBUG) {
            const color = this._shielded
                ? LittleGuy.SHIELDED_OUTLINE_COLOR
                : LittleGuy.DEBUG_OUTLINE_COLOR;
            for (let x = 0; x < this.layer.width; x++) {
                for (let y = 0; y < this.layer.height; y++) {
                    const i = (x + y * imageData.width) * 4;
                    imageData.data[i] = color.r; // Red
                    imageData.data[i + 1] = color.g; // Green
                    imageData.data[i + 2] = color.b; // Blue
                    imageData.data[i + 3] = color.a; // Alpha
                }
            }
        }

        const bodyPosition = new Vector(1, 1);
        const bodyIndex = (bodyPosition.x + bodyPosition.y * imageData.width) * 4;
        const bodyColor = this.getBodyColor();
        imageData.data[bodyIndex] = bodyColor.r; // Red
        imageData.data[bodyIndex + 1] = bodyColor.g; // Green
        imageData.data[bodyIndex + 2] = bodyColor.b; // Blue
        imageData.data[bodyIndex + 3] = bodyColor.a; // Alpha

        const headPosition = bodyPosition.copy();
        headPosition.add(this.orientation);
        const headIndex = (headPosition.x + headPosition.y * imageData.width) * 4;
        const headColor = this.getHeadColor();
        if (headColor) {
            imageData.data[headIndex] = headColor.r; // Red
            imageData.data[headIndex + 1] = headColor.g; // Green
            imageData.data[headIndex + 2] = headColor.b; // Blue
            imageData.data[headIndex + 3] = headColor.a; // Alpha
        }
        this.layer.getContext().putImageData(imageData, 0, 0);
    }

    angleToOrientation(angle) {
        const sliceCount = 4;
        const sliceAngle = (2 * Math.PI) / sliceCount;
        const sliceOffset = sliceAngle / 2; // Center the slices

        // Normalize angle to be between 0 and 2*PI
        let normalizedAngle = (angle - sliceOffset) % (2 * Math.PI);
        if (normalizedAngle < 0) {
            normalizedAngle += 2 * Math.PI;
        }

        // Calculate the slice index based on the normalized angle
        let sliceIndex = Math.floor(normalizedAngle / sliceAngle);
        // Map slice index to (x, y) coordinates
        switch (sliceIndex) {
            case 0:
                // S
                return new Vector(0, 1);
            case 1:
                // E
                return new Vector(-1, 0);
            case 2:
                // N
                return new Vector(0, -1);
            case 3:
                // W
                return new Vector(1, 0);
            default:
                // Shouldn't happen
                console.error("Invalid slice index: " + sliceIndex);
                return new Vector(0, -1);
        }
    }

    updateOrientation() {
        if (this.closestSurfacePixel == null) {
            return;
        }
        // First check if our current orientation is valid.
        let testPixel = this.pixelBody.getPixel(
            Vector.add(this.closestSurfacePixel.position, this.orientation)
        );
        if (testPixel == null) {
            // No work to be done, we can be happy with our current orientation.
            return;
        }

        // Check all possible orientations (we'll possibly recheck our current orientation, but
        // whatever, it's cheap).
        let orientations = [
            new Vector(0, 1),
            new Vector(-1, 0),
            new Vector(0, -1),
            new Vector(1, 0),
        ];
        for (const orientation of orientations) {
            testPixel = this.pixelBody.getPixel(
                Vector.add(this.closestSurfacePixel.position, orientation)
            );
            if (testPixel == null) {
                if (window.DEBUG) {
                    console.info(
                        "Updating orientation from " +
                            this.orientation.toString() +
                            " to " +
                            orientation.toString()
                    );
                }
                // Found a valid orientation, no need to keep looking.
                this.orientation = orientation;
                this.updateRenderData();
                return;
            }
        }
        // Uh oh, if we're here then somehow the pixel we're standing on is fully surrounded by
        // other pixels (which means it's not really a surface pixel). Uh. Whatever, let's just
        // log it and move on with our lives.
        if (window.DEBUG) {
            console.error("No valid orientation found");
        }
    }

    setInactive() {
        this.active = false;
        this.notifyInactive();
    }

    update() {
        if (!this.active) {
            return;
        }
        if (!this.alive) {
            this.framesSinceDeath++;
            if (this.deathByEgg) {
                if (this.framesSinceDeath >= LittleGuy.DEATH_BY_EGG_FRAMES_BEFORE_INACTIVE) {
                    this.setInactive();
                }
            } else if (this.upgrades.afterlife) {
                this.ascend();
            } else {
                this.bury();
            }
            this.updateRenderData();
            return;
        }
        this.framesSinceLastMove++;
        if (this.closestSurfacePixel == null || this.closestSurfacePixel.health <= 0) {
            // Find something new to stand on.
            this.closestSurfacePixel = this.findPixelToStandOn();
            if (this.digging) {
                this.pixelBeingDug = this.closestSurfacePixel;
            }
        }

        if (!this.closestSurfacePixel) {
            this.die();
            return;
        } else if (this.closestSurfacePixel.type == PixelType.EGG && !this.upgrades.eggHandling) {
            this.deathByEgg = true;
            this.die();
            return;
        } else if (
            this.closestSurfacePixel.type == PixelType.SERPENT &&
            this.closestSurfacePixel.hasColorOverride()
        ) {
            // Kind of a roundabout way to know that this guy needs to die. Why should LittleGuy
            // have to know about the inner workings of Serpent.js? 'Cause I'm lazy, that's why.
            if (!this._shielded) {
                this.deathBySerpent = true;
                this.die();
                return;
            }
        }

        // Update our position to match the pixel we're standing on, in case it moved.
        let prevOrientation = this.orientation.copy();
        let prevPosition = this.position.copy();
        this.updateOrientation();
        this.positionInPixelBodySpace = Vector.add(
            this.closestSurfacePixel.position,
            this.orientation
        );
        this.position = this.toLocalSpace(this.positionInPixelBodySpace);
        if (
            !Vector.equals(prevOrientation, this.orientation) ||
            !Vector.equals(prevPosition, this.position)
        ) {
            this.updateRenderData();
        }

        let forcedToDig = false;
        if (this.upgrades.goldSeeker) {
            forcedToDig =
                (this.upgrades.unlockGold && this.closestSurfacePixel.type == PixelType.GOLD) ||
                (this.upgrades.unlockDiamonds &&
                    this.closestSurfacePixel.type == PixelType.DIAMOND) ||
                this.closestSurfacePixel.type == PixelType.MAGIC;
        }
        if (forcedToDig || Math.random() < LittleGuy.DIG_PROBABILITY_PCT) {
            this.startDigging();
        }
        if (this.digging) {
            this.dig();
        } else {
            this.wander();
        }
    }

    bury() {
        let tombstonePosition = null;
        if (this.pixelBeingDug) {
            tombstonePosition = this.pixelBeingDug.position;
        } else {
            tombstonePosition = this.positionInPixelBodySpace.copy();
            tombstonePosition.add(this.orientation);
        }
        let added = this.pixelBody.addPixel(tombstonePosition, PixelType.TOMBSTONE);
        if (added) {
            this.pixelBody.updateSurface();
        }

        this.setInactive();
    }

    ascend() {
        // (to heaven)
        if (this.alive) {
            console.error("Attempted to ascend before dying");
            return;
        }
        let angle = Math.atan2(this.position.y, this.position.x);
        let distToCenter = this.position.mag();
        if (this.saintly) {
            distToCenter += 0.1;
        } else {
            // Just kidding, we're going straight to hell.
            distToCenter -= 0.1;
        }
        this.position = new Vector(distToCenter * Math.cos(angle), distToCenter * Math.sin(angle));
        this.positionInPixelBodySpace = this.toPixelBodySpace(this.position);
        this.ascentionProgressPct += 1;
        if (this.ascentionProgressPct >= 100 || this.distToCenter < 0.2) {
            this.setInactive();
        }
    }

    // Will return null if the pixel body has zero pixels left, otherwise will return the best match
    // for whatever pixel we're standing on or near.
    findPixelToStandOn() {
        // Look directly at our feet first
        let underFoot = this.pixelBody.getPixel(this.positionInPixelBodySpace);
        if (underFoot && underFoot.isSurface) {
            return underFoot;
        }
        // Look just below our feet next. Note: I don't know why this isn't always the best
        // option, but sometimes there's a pixel right @ positionInPlaceSpace that we need to
        // set as the highest priority. Life is full of mysteries. And/or bugs.
        let underFootCoords = Vector.sub(this.positionInPixelBodySpace, this.orientation);
        underFoot = this.pixelBody.getPixel(underFootCoords);
        if (underFoot && underFoot.isSurface) {
            return underFoot;
        }
        // This should only happen if we're, like, floating? Flying around? If this little guy
        // is being a total /bird/, then we need to fall back to this.
        // (Can also happen if we just finished digging up the pixel we were standing on)
        return this.pixelBody.getClosestSurfacePixel(this.positionInPixelBodySpace);
    }

    startDigging() {
        if (this.digging) {
            return;
        }
        this.digging = true;
        this.diggingFrames = 0;
        this.pixelBeingDug = this.findPixelToStandOn();
        if (this.pixelBeingDug == null) {
            this.digging = false;
            return;
        }
        this.updateRenderData();
    }

    finishDigging() {
        if (!this.digging) {
            return;
        }
        this.digging = false;
        if (this.pixelBeingDug != null) {
            this.pixelBody.removePixel(this.pixelBeingDug);
            this.notifyDigsComplete([this.pixelBeingDug]);
        }
        this.goToNearestSurfacePixel();

        this.digsRemaining--;
        if (this.digsRemaining <= 0) {
            this.die();
        }
        this.updateRenderData();
    }

    die() {
        this.alive = false;
        if (this.deathByEgg || this.deathBySerpent) {
            this.explosive = false;
        }

        if (this.explosive) {
            const nearbyPixels = this.pixelBody.getPixelsAround(
                this.positionInPixelBodySpace,
                this.upgrades.explosionRadius
            );
            const toRemove = [];
            for (const nearbyPixel of nearbyPixels) {
                if (nearbyPixel.type == PixelType.EGG && !this.upgrades.eggHandling) {
                    continue;
                }
                if (nearbyPixel.type == PixelType.MAGIC) {
                    continue;
                }
                toRemove.push(nearbyPixel);
            }
            this.pixelBody.removePixels(toRemove);
            this.notifyDigsComplete(toRemove);
        }
        this.notifyDeath();
    }

    goToNearestSurfacePixel() {
        let newSurfacePixel = this.findPixelToStandOn();
        if (!newSurfacePixel) {
            this.die();
            return;
        }
        this.closestSurfacePixel = newSurfacePixel;
        // Take a guess at a good orientation to be standing at. Really only makes sense for
        // planets, but we re-check it in updateOrientation(), so it really just sets our preference
        // for an orientation.
        let pixelPositionInLocalSpace = this.toLocalSpace(this.closestSurfacePixel.position);
        let angle = Math.atan2(pixelPositionInLocalSpace.y, pixelPositionInLocalSpace.x);
        this.orientation = this.angleToOrientation(angle);
        this.updateOrientation();

        // Make sure we're standing /on top of/ the surface pixel, not in it.
        this.positionInPixelBodySpace = Vector.add(
            this.closestSurfacePixel.position,
            this.orientation
        );
        // This is relative to the center of the pixelBody
        this.position = this.toLocalSpace(this.positionInPixelBodySpace);

        // Reset our movement history since we just made some kind of leap.
        this.framesSinceLastMove = 0;
        this.previousPositions = [];
        this.updateRenderData();
    }

    dig() {
        if (!this.digging) {
            return;
        }
        // Make sure the pixel we're digging at is still present
        if (!this.pixelBeingDug || !this.pixelBody.hasPixel(this.pixelBeingDug)) {
            console.log("Shifting to new pixel during dig");
            // Update our position and get a new pixel to work on
            this.goToNearestSurfacePixel();
            this.pixelBeingDug = this.closestSurfacePixel;
            if (this.pixelBeingDug == null) {
                // Just give up. Who cares? Whatever. Not me.
                this.digging = false;
                this.updateRenderData();
                return;
            }
        }
        if (this.diggingFrames % LittleGuy.ASSUMED_FPS == 0) {
            this.pixelBeingDug.damage(this.upgrades.digSpeed * LittleGuy.ASSUMED_FPS);
        }
        let wasRenderingDigPose = this.shouldRenderDigPose();
        this.diggingFrames++;
        if (wasRenderingDigPose != this.shouldRenderDigPose()) {
            this.updateRenderData();
        }

        if (this.pixelBeingDug.getHealth() <= 0) {
            this.finishDigging();
        }
    }

    wander() {
        if (this.digging) {
            return;
        }
        if (this.framesSinceLastMove < LittleGuy.MIN_FRAMES_BETWEEN_MOVES) {
            return;
        }
        let willMove = Math.random() * 100 <= LittleGuy.MOVE_PROBABILITY_PCT;
        if (!willMove) {
            return;
        }
        // Prefer continuing in the current direction to avoid quickly going back and forth too
        // much.
        let threshold =
            this.previousDirection < 0
                ? LittleGuy.DIRECTION_PERSISTENCE_FACTOR
                : 1 - LittleGuy.DIRECTION_PERSISTENCE_FACTOR;

        this.move(Math.random() > threshold ? 1 : -1);
    }

    // This is insanity and needs to be cleaned up, badly. But we'll get to that later (never).
    move(direction) {
        if (this.previousDirection != direction) {
            this.previousPositions = [];
            this.previousDirection = direction;
        }

        function orientationVecToArrow(orientation) {
            let direction = "?";
            if (orientation.x == 0 && orientation.y == -1) {
                direction = "↑";
            } else if (orientation.x == 0 && orientation.y == 1) {
                direction = "↓";
            } else if (orientation.x == -1 && orientation.y == 0) {
                direction = "←";
            } else if (orientation.x == 1 && orientation.y == 0) {
                direction = "→";
            }
            return direction;
        }

        // 1. Get the surrounding pixels
        let positionInPixelBodySpace = this.pixelBody.center.copy();
        positionInPixelBodySpace.add(this.position);
        if (window.DEBUG) {
            console.log(
                "Current position: " +
                    positionInPixelBodySpace +
                    " (" +
                    orientationVecToArrow(this.orientation) +
                    ")"
            );
        }

        let surroundingPixels = this.pixelBody.getSurroundingPixels(
            positionInPixelBodySpace,
            false
        );
        if (surroundingPixels.size == 0) {
            this.goToNearestSurfacePixel();
            return;
        }
        // 2. Figure out which of the surrounding pixels are surface pixels.
        //    Assumption: there must be at least one surrounding pixel that is a surface.
        let surfacePixels = [];
        for (let pixel of surroundingPixels.values()) {
            if (pixel.surface) {
                surfacePixels.push(pixel);
            }
        }
        // 3. Get the possible EDGEs that we can stand on. A given surface may have up to 4 edges
        //    to stand on.
        let edges = new Map();
        // top edge:    ( 0, -1)
        // bottom edge: ( 0,  1)
        // left edge:   (-1,  0)
        // right edge:  ( 1,  0)
        let toCheck = [new Vector(0, -1), new Vector(0, 1), new Vector(-1, 0), new Vector(1, 0)];
        for (let pixel of surfacePixels) {
            let pEdges = [];
            for (let d of toCheck) {
                let edgePos = pixel.position.copy();
                edgePos.add(d);
                if (this.pixelBody.getPixel(edgePos)) {
                    continue;
                }
                pEdges.push(d);
            }
            edges.set(pixel, pEdges);
        }
        // 4. Iterate through the edges until we get one that results in a position different than
        //    our current position.
        let candidates = [];
        for (const [pixel, pEdges] of edges.entries()) {
            for (const edge of pEdges) {
                let candidate = pixel.position.copy();
                candidate.add(edge);
                if (
                    candidate.x == positionInPixelBodySpace.x &&
                    candidate.y == positionInPixelBodySpace.y
                ) {
                    continue;
                }
                let wasPreviousPosition = false;
                for (const previousPosition of this.previousPositions) {
                    if (previousPosition.x == candidate.x && previousPosition.y == candidate.y) {
                        wasPreviousPosition = true;
                        break;
                    }
                }
                if (wasPreviousPosition) {
                    continue;
                }
                if (window.DEBUG) {
                    console.log(
                        "Candidate @ " +
                            candidate.toString() +
                            " (" +
                            orientationVecToArrow(edge) +
                            "), dist = " +
                            candidate.dist(positionInPixelBodySpace)
                    );
                }
                candidates.push({ position: candidate, orientation: edge });
            }
        }
        if (candidates.length == 0) {
            if (window.DEBUG) {
                console.log("No candidates");
            }
            this.goToNearestSurfacePixel();
            return;
        }

        let rotatedPositionInPixelBodySpace = positionInPixelBodySpace.copy();
        if (this.orientation.x == 0 && this.orientation.y == -1) {
            // ↑, no rotation needed
        } else if (this.orientation.x == 0 && this.orientation.y == 1) {
            // ↓, need to rotate 180 deg
            rotatedPositionInPixelBodySpace = Vector.rotate180(
                positionInPixelBodySpace,
                this.pixelBody.layer.width,
                this.pixelBody.layer.height
            );
        } else if (this.orientation.x == -1 && this.orientation.y == 0) {
            // ←, need to rotate 90 deg CW
            rotatedPositionInPixelBodySpace = Vector.rotate90CW(
                positionInPixelBodySpace,
                this.pixelBody.layer.height
            );
        } else if (this.orientation.x == 1 && this.orientation.y == 0) {
            // →, need to rotate 90 deg CCW
            rotatedPositionInPixelBodySpace = Vector.rotate90CCW(
                positionInPixelBodySpace,
                this.pixelBody.layer.width
            );
        }

        let rotatedCandidates = [];
        for (let candidate of candidates) {
            if (this.orientation.x == 0 && this.orientation.y == -1) {
                // ↑, no rotation needed
                rotatedCandidates.push({
                    rotatedPosition: candidate.position,
                    original: candidate,
                });
            } else if (this.orientation.x == 0 && this.orientation.y == 1) {
                // ↓, need to rotate 180 deg
                rotatedCandidates.push({
                    rotatedPosition: Vector.rotate180(
                        candidate.position,
                        this.pixelBody.layer.width,
                        this.pixelBody.layer.height
                    ),
                    original: candidate,
                });
            } else if (this.orientation.x == -1 && this.orientation.y == 0) {
                // ←, need to rotate 90 deg CW
                rotatedCandidates.push({
                    rotatedPosition: Vector.rotate90CW(
                        candidate.position,
                        this.pixelBody.layer.width,
                        this.pixelBody.layer.height
                    ),
                    original: candidate,
                });
            } else if (this.orientation.x == 1 && this.orientation.y == 0) {
                // →, need to rotate 90 deg CCW
                rotatedCandidates.push({
                    rotatedPosition: Vector.rotate90CCW(
                        candidate.position,
                        this.pixelBody.layer.width,
                        this.pixelBody.layer.height
                    ),
                    original: candidate,
                });
            }
        }
        let selected = rotatedCandidates[0];
        let currentDist = Math.max(this.pixelBody.layer.width, this.pixelBody.layer.height);
        if (direction < 0) {
            for (let i = 0; i < rotatedCandidates.length; i++) {
                // Only consider candidates to the left of us, post rotation.
                if (window.DEBUG) {
                    console.log(
                        "Looking at candidate @ " +
                            rotatedCandidates[i].rotatedPosition.toString() +
                            " relative to " +
                            rotatedPositionInPixelBodySpace.toString() +
                            " at distance " +
                            rotatedCandidates[i].original.position.dist(positionInPixelBodySpace)
                    );
                }
                let newDist = rotatedCandidates[i].original.position.dist(positionInPixelBodySpace);
                if (
                    newDist < currentDist ||
                    (newDist == currentDist &&
                        rotatedCandidates[i].rotatedPosition.x < selected.rotatedPosition.x)
                ) {
                    selected = rotatedCandidates[i];
                    if (window.DEBUG) {
                        console.log(
                            "New best candidate @ " +
                                selected.original.position.toString() +
                                " (" +
                                orientationVecToArrow(selected.original.orientation) +
                                "), dist = " +
                                newDist
                        );
                    }
                    currentDist = newDist;
                }
            }
        } else {
            for (let i = 0; i < rotatedCandidates.length; i++) {
                if (window.DEBUG) {
                    console.log(
                        "Looking at candidate @ " +
                            rotatedCandidates[i].rotatedPosition.toString() +
                            " relative to " +
                            rotatedPositionInPixelBodySpace.toString() +
                            " at distance " +
                            rotatedCandidates[i].original.position.dist(positionInPixelBodySpace)
                    );
                }
                let newDist = rotatedCandidates[i].original.position.dist(positionInPixelBodySpace);
                if (
                    newDist < currentDist ||
                    (newDist == currentDist &&
                        rotatedCandidates[i].rotatedPosition.x > selected.rotatedPosition.x)
                ) {
                    selected = rotatedCandidates[i];
                    if (window.DEBUG) {
                        console.log(
                            "New best candidate @ " +
                                selected.original.position.toString() +
                                " (" +
                                orientationVecToArrow(selected.original.orientation) +
                                "), dist = " +
                                newDist
                        );
                    }
                    currentDist = newDist;
                }
            }
        }
        let selectedCandidate = selected.original;

        // 5. Move to that position.
        //let selectedCandidate = candidates[direction > 0 ? 0 : candidates.length - 1];
        let newPosition = selectedCandidate.position.copy();
        this.orientation = selectedCandidate.orientation;
        if (window.DEBUG) {
            console.log(
                "New position: " +
                    newPosition.toString() +
                    " (" +
                    orientationVecToArrow(this.orientation) +
                    ")"
            );
        }
        newPosition.sub(this.pixelBody.center);
        this.position.set(newPosition);
        this.positionInPixelBodySpace = this.toPixelBodySpace(this.position);
        this.addPreviousPosition(this.positionInPixelBodySpace);
        this.closestSurfacePixel = this.findPixelToStandOn();
        this.updateOrientation();
        this.updateRenderData();
        this.framesSinceLastMove = 0;
    }
}
