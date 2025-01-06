import Color from "./color.js";
const PixelType = {
    DIRT: {
        name: "DIRT",
        color: new Color(133, 84, 5, 255),
        surfaceColor: new Color(60, 180, 90, 255),
        variableColor: true,
        valueMultiplier: 1,
    },
    GOLD: {
        name: "GOLD",
        color: new Color(240, 190, 26, 255),
        surfaceColor: new Color(240, 190, 26, 255),
        variableColor: false,
        valueMultiplier: 10,
    },
    TOMBSTONE: {
        name: "TOMBSTONE",
        color: new Color(170, 170, 170, 255),
        surfaceColor: new Color(170, 170, 170, 255),
        variableColor: false,
        valueMultiplier: 0,
    },
};

export default PixelType;
