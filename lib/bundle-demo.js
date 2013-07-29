var marked = require('marked')
  , bundle = require('../').bundle
  , btoa = require('btoa')
  , fs = require('fs')

var readme = fs.readFileSync(__dirname + '/../README.md', 'utf8')
var button = fs.readFileSync(__dirname + '/../img/fork.png')

button = btoa(button)
button = 'data:image/png;base64,' + button

bundle({
    transforms: []
  , footer: marked(readme)
  , files: [
      __filename
    , __dirname + '/bundle-css.js'
    , __dirname + '/../index.js'
    , __dirname + '/../src/index.js'
  ]
  , button: [
      '<a href="https://github.com/hughsk/disc">'
    , '<img style="position:absolute;top:-8px;left:-8px;border:0;"'
    , 'src="' + button + '"'
    , 'alt="Fork me on GitHub"'
    , '></a>'
  ].join(' ')
}, function(err, html) {
  if (err) throw err
  console.log(html)
})
