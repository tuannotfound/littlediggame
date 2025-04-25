// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

export default class StringUtils {
    static dedent(str, preserveNewlines = false) {
        if (preserveNewlines) {
            return ("" + str).replace(/(\n)\s+/g, "$1");
        }
        return ("" + str).replace(/\n\s+/g, " ");
    }
}
