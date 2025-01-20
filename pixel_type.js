import Color from "./color.js";
const PixelType = {
    DIRT: Object.freeze({
        name: "DIRT",
        color: new Color(133, 84, 5).immutableCopy(),
        surfaceColor: new Color(60, 180, 90).immutableCopy(),
        altColor: null,
        health: 100,
        variableColor: true,
    }),
    TOMBSTONE: Object.freeze({
        name: "TOMBSTONE",
        color: new Color(170, 170, 170).immutableCopy(),
        surfaceColor: new Color(170, 170, 170).immutableCopy(),
        altColor: null,
        health: 125,
        variableColor: true,
    }),
    GOLD: Object.freeze({
        name: "GOLD",
        color: new Color(240, 190, 26).immutableCopy(),
        surfaceColor: new Color(240, 190, 26).immutableCopy(),
        altColor: null,
        health: 150,
        variableColor: false,
    }),
    DIAMOND: Object.freeze({
        name: "DIAMOND",
        color: new Color(155, 232, 250).immutableCopy(),
        surfaceColor: new Color(155, 232, 250).immutableCopy(),
        altColor: new Color(200, 250, 254).immutableCopy(),
        health: 250,
        variableColor: true,
    }),
    EGG: Object.freeze({
        name: "EGG",
        color: new Color(247, 246, 230).immutableCopy(),
        surfaceColor: new Color(130, 126, 109).immutableCopy(),
        altColor: new Color(196, 188, 159).immutableCopy(),
        health: 2000,
        variableColor: true,
    }),
};
Object.freeze(PixelType);

export default PixelType;
