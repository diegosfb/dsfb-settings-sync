const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'none',
  target: 'node', // VS Code extensions run in a Node.js-context
  entry: {
    extension: './src/extension.ts' // The entry point of your extension
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    libraryTarget: 'commonjs'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              compilerOptions: {
                module: 'es6' // Override to be able to bundle
              }
            }
          }
        ]
      }
    ]
  },
  externals: {
    vscode: 'commonjs vscode' // the vscode-module is created on-the-fly and must be excluded.
  },
  devtool: 'nosources-source-map'
};
