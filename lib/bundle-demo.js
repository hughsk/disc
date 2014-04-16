var browserify = require('browserify')
  , marked = require('marked')
  , btoa = require('btoa')
  , disc = require('../')
  , fs = require('fs')

var readme = fs.readFileSync(__dirname + '/../README.md', 'utf8')
var button = fs.readFileSync(__dirname + '/../img/fork.png')

button = btoa(button)
button = 'data:image/png;base64,' + button

browserify(require.resolve('browserify'), {
  fullPaths: true
}).bundle()
  .pipe(disc({
      mode: 'count'
    , footer: marked(readme)
    , header: [
        '<a href="https://github.com/hughsk/disc">'
      , '<img style="position:absolute;top:-8px;left:-8px;border:0;"'
      , 'src="' + button + '"'
      , 'alt="Fork me on GitHub"'
      , '></a>'
    ].join(' ')
  }))
  .pipe(process.stdout)
