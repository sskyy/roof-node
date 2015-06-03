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
      { test: /\.css/,loader: "style-loader!css-loader"},
      { test: /\.less$/,loader: "style-loader!css-loader!less-loader"},
      { test: /\.jsx?$/, loader: 'babel-loader', exclude: /node_modules/ },
      { test: /\.svg$/,  loader: "url-loader?limit=10000&mimetype=image/svg+xml" },
      { test: /\.json/,  loader: "json-loader" }
    ]
  }
};
