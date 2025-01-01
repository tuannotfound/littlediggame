import Layer from "./layer.js";
import Pixel from "./pixel.js";
import Vector from "./vector.js";

export default class LittleGuy {
    HEAD_COLOR = { r: 242, g: 222, b: 187, a: 255 };
    BODY_COLOR = { r: 87, g: 125, b: 180, a: 255 };

    constructor(planet) {
        this.planet = planet;

        // This is relative to the center of the planet
        this.position = new Vector(0, 0);
        this.orientation = new Vector(0, -1);
        this.layer = new Layer("little_guy", 3, 3);
    }

    init() {
        this.layer.initOffscreen();
        let planetPosition = this.planet.getClosestSurfacePixel(
            new Vector(this.planet.center.x, this.planet.center.y - this.planet.radius)
        ).position;
        this.position.set(planetPosition.sub(this.planet.center));
        // this.position.x -= 1;
        // this.position.y -= 2;
        this.updateBodyPosition();
    }

    updateBodyPosition() {
        //bodyVec) {
        let imageData = this.layer
            .getContext()
            .createImageData(this.layer.width, this.layer.height);
        let headIndex = 0; //(1 + 1 * imageData.width) * 4;
        imageData.data[headIndex] = this.HEAD_COLOR.r; // Red
        imageData.data[headIndex + 1] = this.HEAD_COLOR.g; // Green
        imageData.data[headIndex + 2] = this.HEAD_COLOR.b; // Blue
        imageData.data[headIndex + 3] = this.HEAD_COLOR.a; // Alpha

        // let bodyIndex = (bodyVec.x + bodyVec.y * imageData.width) * 4;
        // imageData.data[bodyIndex] = this.BODY_COLOR.r; // Red
        // imageData.data[bodyIndex + 1] = this.BODY_COLOR.g; // Green
        // imageData.data[bodyIndex + 2] = this.BODY_COLOR.b; // Blue
        // imageData.data[bodyIndex + 3] = this.BODY_COLOR.a; // Alpha
        this.layer.getContext().putImageData(imageData, 0, 0);
    }

    angleToBodyVec(angle) {
        const sliceCount = 8;
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
                // E
                return new Vector(0, 1);
            case 1:
                // SE
                return new Vector(0, 0);
            case 2:
                // S
                return new Vector(1, 0);
            case 3:
                // SW
                return new Vector(2, 0);
            case 4:
                // W
                return new Vector(2, 1);
            case 5:
                // NW
                return new Vector(2, 2);
            case 6:
                // N
                return new Vector(1, 2);
            case 7:
                // NE
                return new Vector(0, 2);
            // Should never happen, but handle it just in case.
            default:
                return new Vector(1, 1);
        }
    }

    move(direction) {
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
        console.log(
            "Current position: " +
                positionInPlanetSpace +
                " (" +
                orientationVecToArrow(this.orientation) +
                ")"
        );

        let surroundingPixels = this.planet.getSurroundingPixels(positionInPlanetSpace).values();
        // 2. Figure out which of the surrounding pixels are surface pixels.
        //    Assumption: there must be at least one surrounding pixel that is a surface.
        let surfacePixels = [];
        for (let pixel of surroundingPixels) {
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
        //    TBD: How to iterate such that we ensure we're moving in the correct direction.
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
                console.log(
                    "Candidate @ " +
                        candidate.toString() +
                        " (" +
                        orientationVecToArrow(edge) +
                        "), dist = " +
                        candidate.dist(positionInPlanetSpace)
                );
                candidates.push({ position: candidate, orientation: edge });
            }
        }
        if (candidates.length == 0) {
            console.log("No candidates");
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
                console.log(
                    "Looking at candidate @ " +
                        rotatedCandidates[i].rotatedPosition.toString() +
                        " relative to " +
                        rotatedPositionInPlanetSpace.toString()
                );
                if (rotatedCandidates[i].rotatedPosition.x <= rotatedPositionInPlanetSpace.x) {
                    let newDist =
                        rotatedCandidates[i].original.position.dist(positionInPlanetSpace);
                    if (newDist < currentDist) {
                        selected = rotatedCandidates[i];
                        console.log(
                            "New best candidate @ " +
                                selected.original.position.toString() +
                                " (" +
                                orientationVecToArrow(selected.original.orientation) +
                                "), dist = " +
                                newDist
                        );
                        currentDist = newDist;
                    }
                }
            }
        } else {
            for (let i = 0; i < rotatedCandidates.length; i++) {
                console.log(
                    "Looking at candidate @ " +
                        rotatedCandidates[i].rotatedPosition.toString() +
                        " relative to " +
                        rotatedPositionInPlanetSpace.toString()
                );
                if (rotatedCandidates[i].rotatedPosition.x >= rotatedPositionInPlanetSpace.x) {
                    let newDist =
                        rotatedCandidates[i].original.position.dist(positionInPlanetSpace);
                    if (newDist < currentDist) {
                        selected = rotatedCandidates[i];
                        console.log(
                            "New best candidate @ " +
                                selected.original.position.toString() +
                                " (" +
                                orientationVecToArrow(selected.original.orientation) +
                                "), dist = " +
                                newDist
                        );
                        currentDist = newDist;
                    }
                }
            }
        }
        let selectedCandidate = selected.original;

        // 5. Move to that position.
        //let selectedCandidate = candidates[direction > 0 ? 0 : candidates.length - 1];
        let newPosition = selectedCandidate.position.copy();
        this.orientation = selectedCandidate.orientation;
        console.log(
            "New position: " +
                newPosition.toString() +
                " (" +
                orientationVecToArrow(this.orientation) +
                ")"
        );
        newPosition.sub(this.planet.center);
        this.position.set(newPosition);
        this.updateBodyPosition();
    }

    moveCW() {}

    moveCCW() {}

    update() {}
}
