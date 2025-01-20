import Color from "./color.js";
const PixelType = {
    DIRT: Object.freeze({
        name: "DIRT",
        color: new Color(133, 84, 5, 255).immutableCopy(),
        surfaceColor: new Color(60, 180, 90, 255).immutableCopy(),
        altColor: null,
        health: 100,
        variableColor: true,
    }),
    TOMBSTONE: Object.freeze({
        name: "TOMBSTONE",
        color: new Color(170, 170, 170, 255).immutableCopy(),
        surfaceColor: new Color(170, 170, 170, 255).immutableCopy(),
        altColor: null,
        health: 125,
        variableColor: true,
    }),
    GOLD: Object.freeze({
        name: "GOLD",
        color: new Color(240, 190, 26, 255).immutableCopy(),
        surfaceColor: new Color(240, 190, 26, 255).immutableCopy(),
        altColor: null,
        health: 150,
        variableColor: false,
    }),
    DIAMOND: Object.freeze({
        name: "DIAMOND",
        color: new Color(155, 232, 250, 255).immutableCopy(),
        surfaceColor: new Color(155, 232, 250, 255).immutableCopy(),
        altColor: new Color(200, 250, 254, 255).immutableCopy(),
        health: 250,
        variableColor: true,
    }),
};
Object.freeze(PixelType);

export default PixelType;
