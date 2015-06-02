var webpack = require('webpack');

module.exports = {
  devtool: 'eval',
  entry: {
    //simpleText:[
    //  'webpack-dev-server/client?http://localhost:9000',
    //  'webpack/hot/dev-server',
    //  './demo/simpleText/index.js'
    //],
    todo:[
      'webpack-dev-server/client?http://localhost:9000',
      'webpack/hot/dev-server',
      './demo/todo/index.js'
    ]
  },
  output: {
    path: __dirname + '/public/',
    filename: '[name].js',
    publicPath: '/demo/public/'
  },
  externals : [{
  }],
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin(),
    new webpack.SourceMapDevToolPlugin({})
  ],
  resolve: {
    extensions: ['', '.js'],
    alias : {
      //"jQuery" : __dirname+"/src/vendor/jquery.min"
    }
  },
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
