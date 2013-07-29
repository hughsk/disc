var clean = require('clean-css').process
  , rework = require('rework')
  , fs = require('fs')


console.log(clean(String(
  rework(fs.readFileSync(__dirname + '/../src/style.css'))
    .vendors([
        '-webkit-'
      , '-moz-'
      , '-ms-'
      , '-o-'
    ])
    .use(rework.inline(__dirname + '/../img'))
    .use(rework.keyframes())
    .use(rework.prefix([
        'transition'
      , 'animation'
    ]))
)))
