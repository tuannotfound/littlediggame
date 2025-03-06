const GameState = Object.freeze({
    UNINITIALIZED: "uninitialized",
    PAUSED: "paused",
    RUNNING: "running",
    LOST: "lost",
    WON: "won",
    isPaused: function (state) {
        return state === GameState.PAUSED || state === GameState.UNINITIALIZED;
    },
    isOver: function (state) {
        return state === GameState.LOST || state === GameState.WON;
    },
});

export default GameState;
