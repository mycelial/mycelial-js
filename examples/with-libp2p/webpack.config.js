// const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require('path');

module.exports = {
  entry: "./index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js",
  },
  devtool: 'inline-source-map',
  mode: "development",
  module: {
		rules: [
			{
				test: /\.wasm$/,
				type: "webassembly/async"
			},
		]
	},
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.wasm'],
  },
  devServer: {
    static: path.resolve(__dirname, "dist"),
  },
	optimization: {
		chunkIds: "deterministic",
    usedExports: true,
	},
	experiments: {
		asyncWebAssembly: true
	}
  /*plugins: [
    new CopyWebpackPlugin(['index.html'])
  ],*/
};
