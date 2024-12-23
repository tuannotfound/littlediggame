const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
    entry: "./main.js", // The entry point of your application
    output: {
        path: path.resolve(__dirname, "dist"), // Output directory for bundled files
        filename: "bundle.js", // Name of the bundled JavaScript file
    },
    mode: "development", // Set mode to 'development' or 'production'
    devServer: {
        static: "./", // Serve static files from the current directory
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "./index.html",
        }),
    ],
};
