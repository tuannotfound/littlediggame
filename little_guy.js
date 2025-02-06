import Layer from "./layer.js";
import Vector from "./vector.js";
import PixelType from "./diggables/pixel_type.js";
import Color from "./color.js";

export default class LittleGuy {
    static DEFAULT_HEAD_COLOR = new Color(242, 222, 187).immutableCopy();
    static DEFAULT_BODY_COLOR = new Color(87, 125, 180).immutableCopy();
    // Yellow helmet. Safety first.
    static DIGGING_HEAD_COLOR = new Color(245, 221, 66).immutableCopy();
    // Filthy, dirt-covered overalls.
    static DIGGING_BODY_COLOR = new Color(107, 56, 28).immutableCopy();
    // Angelic robes.
    static ASCENDING_BODY_COLOR = new Color(215, 215, 215).immutableCopy();
    // Lil' devil.
    static DESCENDING_BODY_COLOR = new Color(217, 30, 43).immutableCopy();
    // Burnt toast.
    static DEATH_BY_EGG_COLOR = new Color(26, 19, 10).immutableCopy();
    static TRANSPARENT_COLOR = new Color(0, 0, 0, 0).immutableCopy();
    // The likelihood this little guy will wander in a given frame.
    static MOVE_PROBABILITY_PCT = 2;
    static DIG_PROBABILITY_PCT = 0.005;
    // The likelihood that we'll continue moving in the direction we were already moving in.
    static DIRECTION_PERSISTENCE_FACTOR = 0.9;
    // The likelihood this little guy will get into heaven.
    static SAINTLY_PCT = 0.95;
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
        this.layer = new Layer("little_guy", 3, 3);
        this.center = new Vector(1, 1);
        this.previousPositions = [];
        this.previousDirection = 0;
        // Cache the nearest surface pixel every time we move. Will be null whenever it needs to be
        // refreshed in the next update.
        this.closestSurfacePixel = null;
        this.digging = false;
        this.pixelBeingDug = null;
        // Whether we're dead or alive.
        this.alive = true;
        this.ascentionProgressPct = 0;
        // Whether we should do anything at all, which is different than being alive or dead.
        this.active = true;

        this.digsRemaining = this.upgrades.digCount;

        // Less likely to be saintly if they were not immaculate.
        let saintlyThreshold = this.immaculate ? this.SAINTLY_PCT : this.SAINTLY_PCT / 1.5;
        this.saintly = Math.random() < saintlyThreshold;
        if (!this.saintly) {
            console.log("Uh oh, we got a bad one, folks");
        }
        this.deathByEgg = false;
        this.framesSinceDeath = 0;

        this.listeners = [];
    }

    toJSON() {
        return {
            positionInPixelBodySpace: this.positionInPixelBodySpace,
            immaculate: this.immaculate,
            orientation: this.orientation,
            previousPositions: this.previousPositions,
            previousDirection: this.previousDirection,
            digging: this.digging,
            pixelBeingDug: this.pixelBeingDug,
            digProcessPct: this.digProcessPct,
            alive: this.alive,
            ascentionProgressPct: this.ascentionProgressPct,
            active: this.active,
            digsRemaining: this.digsRemaining,
            saintly: this.saintly,
            deathByEgg: this.deathByEgg,
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
        for (const previousPositionJson of json.previousPositions) {
            littleGuy.previousPositions.push(Vector.fromJSON(previousPositionJson));
        }
        littleGuy.previousDirection = json.previousDirection;
        littleGuy.digging = json.digging;
        littleGuy.pixelBeingDug = pixelBeingDug;
        littleGuy.digProcessPct = json.digProcessPct;
        littleGuy.alive = json.alive;
        littleGuy.ascentionProgressPct = json.ascentionProgressPct;
        littleGuy.active = json.active;
        littleGuy.digsRemaining = json.digsRemaining;
        littleGuy.saintly = json.saintly;
        littleGuy.deathByEgg = json.deathByEgg;
        return littleGuy;
    }

    init() {
        this.layer.initOffscreen();

        this.position.add(this.orientation);
        this.addPreviousPosition(this.positionInPixelBodySpace);
        this.updateRenderData();
    }

    notifyDigComplete(pixel) {
        for (const listener of this.listeners) {
            listener.onDigComplete(pixel);
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
            if (this.upgrades.afterlife) {
                let alpha = this.getAscensionAlpha();
                let color = LittleGuy.DEFAULT_HEAD_COLOR.copy();
                color.a = alpha;
                return color;
            } else if (this.deathByEgg) {
                if (this.framesSinceDeath < LittleGuy.DEATH_BY_EGG_FRAMES_BEFORE_INACTIVE / 2) {
                    return LittleGuy.DEATH_BY_EGG_COLOR;
                } else {
                    return LittleGuy.TRANSPARENT_COLOR;
                }
            }
        }
        if (this.digging) {
            return LittleGuy.DIGGING_HEAD_COLOR;
        }
        return LittleGuy.DEFAULT_HEAD_COLOR;
    }

    getBodyColor() {
        if (!this.alive) {
            if (this.upgrades.afterlife) {
                let alpha = this.getAscensionAlpha();
                let color = this.saintly
                    ? LittleGuy.ASCENDING_BODY_COLOR.copy()
                    : LittleGuy.DESCENDING_BODY_COLOR.copy();
                color.a = alpha;
                return color;
            } else if (this.deathByEgg) {
                return LittleGuy.DEATH_BY_EGG_COLOR;
            }
        }
        if (this.digging) {
            return LittleGuy.DIGGING_BODY_COLOR;
        }
        return LittleGuy.DEFAULT_BODY_COLOR;
    }

    getAscensionAlpha() {
        return ((100 - this.ascentionProgressPct) * 255) / 100;
    }

    updateRenderData() {
        let imageData = this.layer
            .getContext()
            .createImageData(this.layer.width, this.layer.height);

        if (window.DEBUG) {
            for (let x = 0; x < this.layer.width; x++) {
                for (let y = 0; y < this.layer.height; y++) {
                    let i = (x + y * imageData.width) * 4;
                    imageData.data[i] = 0; // Red
                    imageData.data[i + 1] = 0; // Green
                    imageData.data[i + 2] = 0; // Blue
                    imageData.data[i + 3] = 40; // Alpha
                }
            }
        }

        let bodyPosition = new Vector(1, 1);
        let bodyIndex = (bodyPosition.x + bodyPosition.y * imageData.width) * 4;
        let bodyColor = this.getBodyColor();
        imageData.data[bodyIndex] = bodyColor.r; // Red
        imageData.data[bodyIndex + 1] = bodyColor.g; // Green
        imageData.data[bodyIndex + 2] = bodyColor.b; // Blue
        imageData.data[bodyIndex + 3] = bodyColor.a; // Alpha

        const headPosition = bodyPosition.copy();
        headPosition.add(this.orientation);
        let headIndex = (headPosition.x + headPosition.y * imageData.width) * 4;
        let headColor = this.getHeadColor();
        console.log("Updating render data to have a head with alpha " + headColor.a);
        imageData.data[headIndex] = headColor.r; // Red
        imageData.data[headIndex + 1] = headColor.g; // Green
        imageData.data[headIndex + 2] = headColor.b; // Blue
        imageData.data[headIndex + 3] = headColor.a; // Alpha
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

    update() {
        if (!this.active) {
            return;
        }
        if (!this.alive) {
            this.framesSinceDeath++;
            if (this.upgrades.afterlife) {
                this.ascend();
            } else if (!this.deathByEgg) {
                this.bury();
            } else if (this.framesSinceDeath >= LittleGuy.DEATH_BY_EGG_FRAMES_BEFORE_INACTIVE) {
                this.active = false;
                this.notifyInactive();
            }
            this.updateRenderData();
            return;
        }
        this.closestSurfacePixel = this.pixelBody.getClosestSurfacePixel(
            this.positionInPixelBodySpace.copy()
        );
        if (!this.closestSurfacePixel) {
            this.die();
            return;
        } else if (this.closestSurfacePixel.type == PixelType.EGG && !this.upgrades.eggHandling) {
            this.deathByEgg = true;
            this.die();
            return;
        }

        let forcedToDig = false;
        if (this.upgrades.goldSeeker) {
            forcedToDig =
                (this.upgrades.unlockGold && this.closestSurfacePixel.type == PixelType.GOLD) ||
                (this.upgrades.unlockDiamonds &&
                    this.closestSurfacePixel.type == PixelType.DIAMOND);
        }
        if (forcedToDig || Math.random() < LittleGuy.DIG_PROBABILITY_PCT) {
            this.startDigging();
        }
        this.dig();
        this.wander();
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
        if (!added) {
            console.error("Failed to add pixel on decompose @ " + tombstonePosition.toString());
        } else {
            this.pixelBody.updateSurface();
        }

        this.active = false;
        this.notifyInactive();
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
            this.active = false;
            this.notifyInactive();
        }
    }

    startDigging() {
        if (this.digging) {
            return;
        }
        this.digging = true;
        // Look directly at our feet first
        let underFoot = this.pixelBody.getPixel(this.positionInPixelBodySpace);
        if (underFoot && underFoot.isSurface) {
            this.pixelBeingDug = underFoot;
        } else {
            // Look just below our feet next. Note: I don't know why this isn't always the best
            // option, but sometimes there's a pixel right @ positionInPlaceSpace that we need to
            // set as the highest priority. Life is full of mysteries.
            let underFootCoords = Vector.sub(this.positionInPixelBodySpace, this.orientation);
            underFoot = this.pixelBody.getPixel(underFootCoords);
            if (underFoot && underFoot.isSurface) {
                this.pixelBeingDug = underFoot;
            } else {
                // This should only happen if we're, like, floating? Flying around? If this little guy
                // is being a total /bird/, then we need to fall back to this.
                this.pixelBeingDug = this.pixelBody.getClosestSurfacePixel(
                    this.positionInPixelBodySpace
                );
            }
        }
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
            this.pixelBody.removePixelAt(this.pixelBeingDug.position);
            this.notifyDigComplete(this.pixelBeingDug);
        }
        this.goToNearestSurfacePixel();

        this.updateRenderData();

        this.digsRemaining--;
        if (this.digsRemaining <= 0) {
            this.die();
        }
    }

    die() {
        this.alive = false;
        this.notifyDeath();
    }

    goToNearestSurfacePixel() {
        let newSurfacePixel = this.pixelBody.getClosestSurfacePixel(this.positionInPixelBodySpace);
        if (!newSurfacePixel) {
            this.die();
            return;
        }
        this.positionInPixelBodySpace = newSurfacePixel.position;
        // This is relative to the center of the pixelBody
        this.position = this.toLocalSpace(this.positionInPixelBodySpace);
        let angle = Math.atan2(this.position.y, this.position.x);
        this.orientation = this.angleToOrientation(angle);
        this.position.add(this.orientation);
        this.previousPositions = [];
        this.closestSurfacePixel = newSurfacePixel;
    }

    dig() {
        if (!this.digging) {
            return;
        }
        // Make sure the pixel we're digging at is still present
        if (!this.pixelBeingDug || !this.pixelBody.getPixel(this.pixelBeingDug.position)) {
            // Update our position and get a new pixel to work on
            this.goToNearestSurfacePixel();
            this.pixelBeingDug = this.closestSurfacePixel;
            if (this.pixelBeingDug == null) {
                // Just give up. Who cares? Whatever. Not me.
                this.digging = false;
                return;
            }
        }

        this.pixelBeingDug.damage(this.upgrades.digSpeed);
        if (this.pixelBeingDug.getHealth() <= 0) {
            this.finishDigging();
        }
    }

    wander() {
        if (this.digging) {
            this.closestSurfacePixel = null;
            return;
        }
        let willMove = Math.random() * 100 <= LittleGuy.MOVE_PROBABILITY_PCT;
        if (!willMove) {
            this.closestSurfacePixel = null;
            return;
        }
        // Prefer continuing in the current direction to avoid quickly going back and forth too much
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
            //console.log(v);
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
            return;
        }
        function rotateVector180(vector, width, height) {
            return new Vector(width - 1 - vector.x, height - 1 - vector.y);
        }
        function rotateVector90CW(vector, width, height) {
            return new Vector(height - 1 - vector.y, vector.x);
        }
        function rotateVector90CCW(vector, width, height) {
            return new Vector(vector.y, width - 1 - vector.x);
        }

        let rotatedPositionInPixelBodySpace = positionInPixelBodySpace.copy();
        if (this.orientation.x == 0 && this.orientation.y == -1) {
            // ↑, no rotation needed
        } else if (this.orientation.x == 0 && this.orientation.y == 1) {
            // ↓, need to rotate 180 deg
            rotatedPositionInPixelBodySpace = rotateVector180(
                positionInPixelBodySpace,
                this.pixelBody.layer.width,
                this.pixelBody.layer.height
            );
        } else if (this.orientation.x == -1 && this.orientation.y == 0) {
            // ←, need to rotate 90 deg CW
            rotatedPositionInPixelBodySpace = rotateVector90CW(
                positionInPixelBodySpace,
                this.pixelBody.layer.width,
                this.pixelBody.layer.height
            );
        } else if (this.orientation.x == 1 && this.orientation.y == 0) {
            // →, need to rotate 90 deg CCW
            rotatedPositionInPixelBodySpace = rotateVector90CCW(
                positionInPixelBodySpace,
                this.pixelBody.layer.width,
                this.pixelBody.layer.height
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
                    rotatedPosition: rotateVector180(
                        candidate.position,
                        this.pixelBody.layer.width,
                        this.pixelBody.layer.height
                    ),
                    original: candidate,
                });
            } else if (this.orientation.x == -1 && this.orientation.y == 0) {
                // ←, need to rotate 90 deg CW
                rotatedCandidates.push({
                    rotatedPosition: rotateVector90CW(
                        candidate.position,
                        this.pixelBody.layer.width,
                        this.pixelBody.layer.height
                    ),
                    original: candidate,
                });
            } else if (this.orientation.x == 1 && this.orientation.y == 0) {
                // →, need to rotate 90 deg CCW
                rotatedCandidates.push({
                    rotatedPosition: rotateVector90CCW(
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
        this.updateRenderData();
        this.closestSurfacePixel = this.pixelBody.getClosestSurfacePixel(
            this.positionInPixelBodySpace
        );
    }
}
