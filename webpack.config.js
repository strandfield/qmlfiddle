const path = require('path');

module.exports = {
  entry: './src/editor.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'editorbundle.js',
    globalObject: 'this',
    library: {
      name: 'CodeEditor',
      type: 'umd',
    },
  },
};