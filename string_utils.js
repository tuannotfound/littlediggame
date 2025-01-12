export default class StringUtils {
    static dedent(str, preserveNewlines = false) {
        if (preserveNewlines) {
            return ("" + str).replace(/(\n)\s+/g, "$1");
        }
        return ("" + str).replace(/\n\s+/g, " ");
    }
}
