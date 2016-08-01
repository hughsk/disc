var postcss = require('postcss')
  , autoprefixer = require('autoprefixer')('last 2 versions')
  , inline = require('rework-plugin-inline')
  , clean = require('clean-css')
  , rework = require('rework')
  , fs = require('fs')

var css = fs.readFileSync(__dirname + '/../src/style.css', 'utf8')

css = rework(css)
  .use(inline(__dirname + '/../img'))
  .toString()


postcss([ autoprefixer ]).process(css).then(function (result) {
  result.warnings().forEach(function (warn) {
      console.warn(warn.toString());
  });

  css = new clean()
    .minify(css)

  console.log(css)
});
