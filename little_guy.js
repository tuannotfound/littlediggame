import Layer from "./layer.js";
import Vector from "./vector.js";
import PixelType from "./pixel_type.js";

export default class LittleGuy {
    DEFAULT_HEAD_COLOR = { r: 242, g: 222, b: 187, a: 255 };
    DEFAULT_BODY_COLOR = { r: 87, g: 125, b: 180, a: 255 };
    // Yellow helmet. Safety first.
    DIGGING_HEAD_COLOR = { r: 245, g: 221, b: 66, a: 255 };
    // Filthy, dirt-covered overalls.
    DIGGING_BODY_COLOR = { r: 107, g: 56, b: 28, a: 255 };
    ASCENDING_BODY_COLOR = { r: 215, g: 215, b: 215, a: 255 };
    DESCENDING_BODY_COLOR = { r: 217, g: 30, b: 43, a: 255 };
    // The likelihood this little guy will wander in a given frame.
    MOVE_PROBABILITY_PCT = 2;
    DIG_PROBABILITY_PCT = 0.005;
    DIG_VISUAL_PROGRESS_PCT_INTERVAL = 20;
    // The likelihood that we'll continue moving in the direction we were already moving in.
    DIRECTION_PERSISTENCE_FACTOR = 0.9;
    // The likelihood this little guy will get into heaven.
    SAINTLY_PCT = 0.95;

    constructor(game, positionInPlanetSpace, immaculate) {
        this.game = game;
        this.planet = game.planet;
        this.immaculate = immaculate;

        this.positionInPlanetSpace = positionInPlanetSpace;
        // This is relative to the center of the planet
        this.position = this.toLocalSpace(this.positionInPlanetSpace);

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
        this.digProgressPct = 0;
        // Whether we're dead or alive.
        this.alive = true;
        this.ascentionProgressPct = 0;
        // Whether we should do anything at all, which is different than being alive or dead.
        this.active = true;

        this.digsRemaining = game.upgrades.digCount;

        // Less likely to be saintly if they were not immaculate.
        let saintlyThreshold = this.immaculate ? this.SAINTLY_PCT : this.SAINTLY_PCT / 1.5;
        this.saintly = Math.random() < saintlyThreshold;
        if (!this.saintly) {
            console.log("Uh oh, we got a bad one, folks");
        }

        this.listeners = [];
    }

    toJSON() {
        return {
            positionInPlanetSpace: this.positionInPlanetSpace,
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
        };
    }

    static fromJSON(json, game, pixelBeingDug) {
        let littleGuy = new LittleGuy(
            game,
            Vector.fromJSON(json.positionInPlanetSpace),
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
        return littleGuy;
    }

    init() {
        this.layer.initOffscreen();

        this.position.add(this.orientation);
        this.addPreviousPosition(this.positionInPlanetSpace);
        this.updateRenderData();
    }

    notifyDigComplete(pixel) {
        for (const listener of this.listeners) {
            listener.onDigComplete(pixel);
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

    addPreviousPosition(positionInPlanetSpace) {
        this.previousPositions.push(positionInPlanetSpace);
        // Limit it to the 4 most recent positions
        if (this.previousPositions.length > 4) {
            this.previousPositions.shift();
        }
    }

    toLocalSpace(positionInPlaceSpace) {
        let positionInLocalSpace = this.planet.center.copy();
        positionInLocalSpace.sub(positionInPlaceSpace);
        positionInLocalSpace.x = -positionInLocalSpace.x;
        positionInLocalSpace.y = -positionInLocalSpace.y;
        return positionInLocalSpace;
    }

    toPlanetSpace(position) {
        let positionInPlanetSpace = this.planet.center.copy();
        positionInPlanetSpace.add(position);
        return positionInPlanetSpace;
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

        let alpha = ((100 - this.ascentionProgressPct) * 255) / 100;

        let bodyPosition = new Vector(1, 1);
        let bodyIndex = (bodyPosition.x + bodyPosition.y * imageData.width) * 4;
        let bodyColor = this.digging ? this.DIGGING_BODY_COLOR : this.DEFAULT_BODY_COLOR;
        if (!this.alive && this.game.upgrades.afterlife) {
            if (this.saintly) {
                // Don thy heavenly robes
                bodyColor = this.ASCENDING_BODY_COLOR;
            } else {
                // Dress up like a little devil then, I guess
                bodyColor = this.DESCENDING_BODY_COLOR;
            }
        }
        imageData.data[bodyIndex] = bodyColor.r; // Red
        imageData.data[bodyIndex + 1] = bodyColor.g; // Green
        imageData.data[bodyIndex + 2] = bodyColor.b; // Blue
        imageData.data[bodyIndex + 3] = alpha; // Alpha

        const headPosition = bodyPosition.copy();
        headPosition.add(this.orientation);
        let headIndex = (headPosition.x + headPosition.y * imageData.width) * 4;
        let headColor = this.digging ? this.DIGGING_HEAD_COLOR : this.DEFAULT_HEAD_COLOR;
        imageData.data[headIndex] = headColor.r; // Red
        imageData.data[headIndex + 1] = headColor.g; // Green
        imageData.data[headIndex + 2] = headColor.b; // Blue
        imageData.data[headIndex + 3] = alpha; // Alpha
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
            if (this.game.upgrades.afterlife) {
                this.ascend();
                return;
            } else {
                this.bury();
                return;
            }
        }
        let forcedToDig = false;
        if (this.game.upgrades.goldSeeker && !this.closestSurfacePixel) {
            this.closestSurfacePixel = this.planet.getClosestSurfacePixel(
                this.positionInPlanetSpace.copy().sub(this.orientation)
            );
            if (this.closestSurfacePixel && this.closestSurfacePixel.type == PixelType.GOLD) {
                forcedToDig = true;
            }
        }
        if (forcedToDig || Math.random() < this.DIG_PROBABILITY_PCT) {
            this.startDigging();
        }
        this.dig();
        this.wander();
    }

    bury() {
        this.active = false;
        let tombstonePosition = null;
        if (this.pixelBeingDug) {
            tombstonePosition = this.pixelBeingDug.renderPosition;
        } else {
            tombstonePosition = this.positionInPlanetSpace.copy();
            tombstonePosition.add(this.orientation);
        }
        let added = this.planet.addPixel(tombstonePosition, PixelType.TOMBSTONE);
        if (!added) {
            console.error("Failed to add pixel on decompose @ " + tombstonePosition.toString());
        } else {
            this.planet.updateSurface();
        }
    }

    ascend() {
        // (to heaven)
        if (this.alive) {
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
        this.positionInPlanetSpace = this.toPlanetSpace(this.position);
        this.ascentionProgressPct += 1;
        this.updateRenderData();
        if (this.ascentionProgressPct >= 100 || this.distToCenter < 0.2) {
            this.active = false;
        }
    }

    startDigging() {
        if (this.digging) {
            return;
        }
        this.digging = true;
        this.digProgressPct = 0;
        this.pixelBeingDug = this.planet.getClosestSurfacePixel(this.positionInPlanetSpace);
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
            this.planet.removePixelAt(this.pixelBeingDug.renderPosition);
            this.notifyDigComplete(this.pixelBeingDug);
        }
        this.goToNearestSurfacePixel();

        this.updateRenderData();

        this.digsRemaining--;
        if (this.digsRemaining <= 0) {
            this.alive = false;
        }
    }

    goToNearestSurfacePixel() {
        let newSurfacePixel = this.planet.getClosestSurfacePixel(this.positionInPlanetSpace);
        if (!newSurfacePixel) {
            this.alive = false;
            return;
        }
        this.positionInPlanetSpace = newSurfacePixel.renderPosition;
        // This is relative to the center of the planet
        this.position = this.toLocalSpace(this.positionInPlanetSpace);
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
        if (!this.pixelBeingDug || !this.planet.getPixel(this.pixelBeingDug.renderPosition)) {
            // Update our position and get a new pixel to work on
            this.goToNearestSurfacePixel();
            this.pixelBeingDug = this.planet.getClosestSurfacePixel(this.positionInPlanetSpace);
            if (this.pixelBeingDug == null) {
                // Just give up. Who cares? Whatever. Not me.
                this.digging = false;
                return;
            }
        }

        this.digProgressPct += this.game.upgrades.digSpeed;
        // Only make visual progress in jumps, fits better with the look of the game.
        let roundedDigProgressPct = Math.round(this.digProgressPct);
        if (roundedDigProgressPct % this.DIG_VISUAL_PROGRESS_PCT_INTERVAL == 0) {
            this.pixelBeingDug.setOpacity(1 - roundedDigProgressPct / 100);
        }
        if (this.digProgressPct >= 100) {
            this.finishDigging();
        }
    }

    wander() {
        if (this.digging) {
            this.closestSurfacePixel = null;
            return;
        }
        let willMove = Math.random() * 100 <= this.MOVE_PROBABILITY_PCT;
        if (!willMove) {
            this.closestSurfacePixel = null;
            return;
        }
        // Prefer continuing in the current direction to avoid quickly going back and forth too much
        let threshold =
            this.previousDirection < 0
                ? this.DIRECTION_PERSISTENCE_FACTOR
                : 1 - this.DIRECTION_PERSISTENCE_FACTOR;

        this.move(Math.random() > threshold ? 1 : -1);
    }

    // This is insanity and needs to be cleaned up, badly. But we'll get to that later.
    move(direction) {
        if (this.previousDirection != direction) {
            this.previousPositions = [];
            this.previousDirection = direction;
        }
        let selfToPlanetVec = this.planet.center.copy();
        selfToPlanetVec.sub(this.position);

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

        // let angle = Math.atan2(selfToPlanetVec.y, selfToPlanetVec.x);
        // // Increment the angle either CW or CCW until we find another surface pixel
        // // TBD

        // 1. Get the surrounding pixels
        let positionInPlanetSpace = this.planet.center.copy();
        positionInPlanetSpace.add(this.position);
        if (window.DEBUG) {
            console.log(
                "Current position: " +
                    positionInPlanetSpace +
                    " (" +
                    orientationVecToArrow(this.orientation) +
                    ")"
            );
        }

        let surroundingPixels = this.planet.getSurroundingPixels(positionInPlanetSpace, false);
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
        // 3. Get the possible EDGEs that we can stand on. A given surface may have up to 4 surfaces
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
                let edgePos = pixel.renderPosition.copy();
                edgePos.add(d);
                if (this.planet.getPixel(edgePos)) {
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
                let candidate = pixel.renderPosition.copy();
                candidate.add(edge);
                if (
                    candidate.x == positionInPlanetSpace.x &&
                    candidate.y == positionInPlanetSpace.y
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
                            candidate.dist(positionInPlanetSpace)
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

        let rotatedPositionInPlanetSpace = positionInPlanetSpace.copy();
        if (this.orientation.x == 0 && this.orientation.y == -1) {
            // ↑, no rotation needed
        } else if (this.orientation.x == 0 && this.orientation.y == 1) {
            // ↓, need to rotate 180 deg
            rotatedPositionInPlanetSpace = rotateVector180(
                positionInPlanetSpace,
                this.planet.layer.width,
                this.planet.layer.height
            );
        } else if (this.orientation.x == -1 && this.orientation.y == 0) {
            // ←, need to rotate 90 deg CW
            rotatedPositionInPlanetSpace = rotateVector90CW(
                positionInPlanetSpace,
                this.planet.layer.width,
                this.planet.layer.height
            );
        } else if (this.orientation.x == 1 && this.orientation.y == 0) {
            // →, need to rotate 90 deg CCW
            rotatedPositionInPlanetSpace = rotateVector90CCW(
                positionInPlanetSpace,
                this.planet.layer.width,
                this.planet.layer.height
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
                        this.planet.layer.width,
                        this.planet.layer.height
                    ),
                    original: candidate,
                });
            } else if (this.orientation.x == -1 && this.orientation.y == 0) {
                // ←, need to rotate 90 deg CW
                rotatedCandidates.push({
                    rotatedPosition: rotateVector90CW(
                        candidate.position,
                        this.planet.layer.width,
                        this.planet.layer.height
                    ),
                    original: candidate,
                });
            } else if (this.orientation.x == 1 && this.orientation.y == 0) {
                // →, need to rotate 90 deg CCW
                rotatedCandidates.push({
                    rotatedPosition: rotateVector90CCW(
                        candidate.position,
                        this.planet.layer.width,
                        this.planet.layer.height
                    ),
                    original: candidate,
                });
            }
        }
        let selected = rotatedCandidates[0];
        let currentDist = Math.max(this.planet.layer.width, this.planet.layer.height);
        if (direction < 0) {
            for (let i = 0; i < rotatedCandidates.length; i++) {
                // Only consider candidates to the left of us, post rotation.

                if (window.DEBUG) {
                    console.log(
                        "Looking at candidate @ " +
                            rotatedCandidates[i].rotatedPosition.toString() +
                            " relative to " +
                            rotatedPositionInPlanetSpace.toString() +
                            " at distance " +
                            rotatedCandidates[i].original.position.dist(positionInPlanetSpace)
                    );
                }
                let newDist = rotatedCandidates[i].original.position.dist(positionInPlanetSpace);
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
                            rotatedPositionInPlanetSpace.toString() +
                            " at distance " +
                            rotatedCandidates[i].original.position.dist(positionInPlanetSpace)
                    );
                }
                let newDist = rotatedCandidates[i].original.position.dist(positionInPlanetSpace);
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
        newPosition.sub(this.planet.center);
        this.position.set(newPosition);
        this.positionInPlanetSpace = this.toPlanetSpace(this.position);
        this.addPreviousPosition(this.positionInPlanetSpace);
        this.updateRenderData();
        this.closestSurfacePixel = null;
    }
}
