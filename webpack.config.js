// Copyright (c) 2025 Alexander Douglas
// Licensed under the MIT License.
// See LICENSE file in the project root for full license information.

const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
//const BundleAnalyzerPlugin = require("webpack-bundle-analyzer").BundleAnalyzerPlugin;

module.exports = {
    entry: "./src/main.js", // The entry point of your application
    output: {
        path: path.resolve(__dirname, "dist"), // Output directory for bundled files
        filename: "bundle.js", // Name of the bundled JavaScript file
        assetModuleFilename: "assets/[name][ext]",
    },
    mode: "development", // Set mode to 'development' or 'production'
    // devServer: {
    //     static: "./assets/static",
    // },
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"],
            },
            {
                // For static files
                test: /\.(png|svg|jpe?g|gif|ogg|wav|json)$/i,
                type: "asset/resource",
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "./src/index.html",
        }),
        //new BundleAnalyzerPlugin(),
        new CopyWebpackPlugin({
            patterns: [{ from: "static", to: "assets" }],
        }),
    ],
};
