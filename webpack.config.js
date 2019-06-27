require('babel-register');
require('babel-loader');

const webpack = require('webpack');
const path = require('path');

module.exports = {
  mode: 'production',
  target: 'web',
  output: {
    path: path.resolve(__dirname, './'),
    filename: 'index.min.tmp.js'
  },
  externals: {
    '@eva-ics/framework': {
      root: '$eva'
    },
    '@eva-ics/toolbox': {
      root: '$eva.toolbox'
    }
  },
  //optimization: {
  //minimize: false
  //},
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [{loader: 'style-loader'}, {loader: 'css-loader'}]
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: ['transform-class-properties']
          }
        }
      }
    ]
  }
};
