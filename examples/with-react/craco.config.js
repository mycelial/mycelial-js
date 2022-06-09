module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      webpackConfig.resolve.extensions.push('.wasm');
      webpackConfig.module.rules.push({
        test: /\.wasm$/,
        type: 'webassembly/async',
      });
      webpackConfig.experiments = {
        asyncWebAssembly: true,
      };
      return webpackConfig;
    },
  },
};