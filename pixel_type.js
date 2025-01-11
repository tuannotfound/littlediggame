import Color from "./color.js";
const PixelType = {
    DIRT: Object.freeze({
        name: "DIRT",
        color: new Color(133, 84, 5, 255).immutableCopy(),
        surfaceColor: new Color(60, 180, 90, 255).immutableCopy(),
        variableColor: true,
    }),
    GOLD: Object.freeze({
        name: "GOLD",
        color: new Color(240, 190, 26, 255).immutableCopy(),
        surfaceColor: new Color(240, 190, 26, 255).immutableCopy(),
        variableColor: false,
    }),
    TOMBSTONE: Object.freeze({
        name: "TOMBSTONE",
        color: new Color(170, 170, 170, 255).immutableCopy(),
        surfaceColor: new Color(170, 170, 170, 255).immutableCopy(),
        variableColor: true,
    }),
    DIAMOND: Object.freeze({
        name: "DIAMOND",
        color: new Color(185, 242, 255, 200).immutableCopy(),
        surfaceColor: new Color(185, 242, 255, 200).immutableCopy(),
        variableColor: true,
    }),
};
Object.freeze(PixelType);

export default PixelType;
