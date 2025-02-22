export default class ThemeUpdater {
    static COLOR_SCHEME_MATCHER = "(prefers-color-scheme: dark)";
    constructor() {
        this.userSetLight = null;
        if (window.matchMedia) {
            let colorSchemeQuery = window.matchMedia(ThemeUpdater.COLOR_SCHEME_MATCHER);
            colorSchemeQuery.addEventListener("change", this.updateColorScheme.bind(this));
        }
        this.updateColorScheme();
    }

    setTheme(useLight) {
        this.userSetLight = useLight;
        this.updateColorScheme();
    }

    shouldUseLightTheme() {
        if (window.matchMedia) {
            if (window.matchMedia(ThemeUpdater.COLOR_SCHEME_MATCHER).matches) {
                return false;
            }
        }
        return true;
    }

    updateColorScheme() {
        let useLight = this.userSetLight == null ? this.shouldUseLightTheme() : this.userSetLight;
        // TBD: notify listeners
    }
}
