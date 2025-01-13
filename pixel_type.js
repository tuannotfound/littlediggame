import Color from "./color.js";
const PixelType = {
    DIRT: Object.freeze({
        name: "DIRT",
        color: new Color(133, 84, 5, 255).immutableCopy(),
        surfaceColor: new Color(60, 180, 90, 255).immutableCopy(),
        altColor: null,
        variableColor: true,
    }),
    GOLD: Object.freeze({
        name: "GOLD",
        color: new Color(240, 190, 26, 255).immutableCopy(),
        surfaceColor: new Color(240, 190, 26, 255).immutableCopy(),
        altColor: null,
        variableColor: false,
    }),
    TOMBSTONE: Object.freeze({
        name: "TOMBSTONE",
        color: new Color(170, 170, 170, 255).immutableCopy(),
        surfaceColor: new Color(170, 170, 170, 255).immutableCopy(),
        altColor: null,
        variableColor: true,
    }),
    DIAMOND: Object.freeze({
        name: "DIAMOND",
        color: new Color(155, 232, 250, 255).immutableCopy(),
        surfaceColor: new Color(155, 232, 250, 255).immutableCopy(),
        altColor: new Color(200, 250, 254, 255).immutableCopy(),
        variableColor: true,
    }),
};
Object.freeze(PixelType);

export default PixelType;
