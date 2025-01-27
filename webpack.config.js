const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
//const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;

module.exports = {
    entry: "./main.js", // The entry point of your application
    output: {
        path: path.resolve(__dirname, "dist"), // Output directory for bundled files
        filename: "bundle.js", // Name of the bundled JavaScript file
    },
    mode: "development", // Set mode to 'development' or 'production'
    devServer: {
        static: "./static",
    },
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"],
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "./index.html",
        }),
        //new BundleAnalyzerPlugin(),
    ],
};
