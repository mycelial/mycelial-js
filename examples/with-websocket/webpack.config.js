const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./index.ts",
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
	},
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: "resources/*",
          to: "[name][ext]"
        }
      ],
    }),
  ],
};
