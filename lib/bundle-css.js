var autoprefixer = require('autoprefixer')('last 2 versions')
  , clean = require('clean-css')
  , rework = require('rework')
  , fs = require('fs')

var css = fs.readFileSync(__dirname + '/../src/style.css', 'utf8')

css = rework(css)
  .use(rework.inline(__dirname + '/../img'))
  .toString()

css = autoprefixer.process(
  css
).css

css = new clean()
  .minify(css)

console.log(css)
