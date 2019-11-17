/* eslint-env node */

const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const packageJson = require('./package.json');

const serverPublic = path.join(__dirname, 'server', 'public');

module.exports = {
  mode: 'production',
  entry: './client/index.js',
  output: {
    path: serverPublic,
    filename: 'bundle.js',
  },
  plugins: [
    new CopyWebpackPlugin([
      { context: './client', from: '*.html' },
      { context: './client', from: '*.css' }
    ]),
    new HtmlWebpackPlugin({
      template: './client/index.html',
      inject: false,
      version: packageJson.version,
      googleApiKey: process.env.GOOGLE_API_KEY
    })
  ],
  devtool: 'source-map',
  devServer: {
    contentBase: serverPublic
  }
};
