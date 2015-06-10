var webpack = require('webpack');

module.exports = {
  entry: {
    node : "./src/node.js",
    nodes : "./src/nodes.js",
  },
  output: {
    path: __dirname + '/dist/',
    filename: '[name].js',
  },
  externals : [{
  }],
  plugins: [
    new webpack.NoErrorsPlugin(),
    new webpack.SourceMapDevToolPlugin({})
  ],
  module: {
    loaders: [
      { test: /\.jsx?$/, loader: 'babel-loader', exclude: /node_modules/ },
      { test: /\.json/,  loader: "json-loader" }
    ]
  }
};
