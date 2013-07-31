var builtins = require('browser-builtins')
var fileTree = require('file-size-tree')
var quotemeta = require('quotemeta')
var commondir = require('commondir')
var mdeps = require('module-deps')
var sdeps = require('deps-sort')
var once = require('once')
var path = require('path')
var fs = require('fs')

module.exports = {
    json: json
  , bundle: bundle
}

var ignore = Object.keys(builtins).concat(['os', 'module', 'cluster'])
ignore = '^(?:' + ignore.join('|') + ')$'
ignore = new RegExp(ignore, 'i')

function json(files, transforms, callback) {
  var found = []
    , foundbuiltins = []

  files = toarray(files)
  transforms = toarray(transforms)
  callback = once(callback)

  mdeps(files, {
      transform: transforms
    , filter: function(module) {
      if (builtins[module]) {
        insert(foundbuiltins, builtins[module])
      }
      return !ignore.test(module)
    }
  }).pipe(sdeps())
    .once('error', callback)
    .once('close', function() {
      var root = path.basename(commondir(found))
      var tree = {
          name: root
        , children: fileTree(found)
      }

      foundbuiltins.forEach(function(builtin) {
        tree.children.push({
            name: path.basename(builtin)
          , size: fs.statSync(builtin).size
        })
      })

      dirsizes(tree)
      callback(null, tree)
    })
    .on('data', function(dep) {
      found.push(dep.id)
    })
}

function bundle(opts, callback) {
  opts = opts || {}

  var files = toarray(opts.files || null)
  var transforms = toarray(opts.transforms || null)
  var footer = opts.footer || ''
  var button = opts.button || ''

  json(files, transforms, function(err, data) {
    if (err) return callback(err)

    data = '<script type="text/javascript">'
      + ';window.disc = ('
      + JSON.stringify(data)
      + ');</script>'

    var script = '<script type="text/javascript">'
      + bundled().replace(/\/script/gi, '\\/script')
      + '</script>'

    callback(null, template()({
        scripts: script
      , styles: styles()
      , markdown: footer
      , button: button
      , data: data
    }))
  })
}

function toarray(arg) {
  if (typeof arg === 'undefined') return []
  return Array.isArray(arg) ? arg : [arg]
}

function template() {
  if (template.text) return template.text
  return template.text = require('./lib/lazy-template')(
    fs.readFileSync(__dirname + '/src/base.html', 'utf8')
  )
}

function styles() {
  if (styles.text) return styles.text
  return styles.text = fs.readFileSync(__dirname + '/build/style.css', 'utf8')
}

function bundled() {
  if (bundled.text) return bundled.text
  return bundled.text = fs.readFileSync(__dirname + '/build/bundle.js', 'utf8')
}

function dirsizes(child) {
  return child.size = "size" in child ? child.size : child.children.reduce(function(size, child) {
    return size + ("size" in child ? child.size : dirsizes(child))
  }, 0)
}

function insert(array, value) {
  if (array.indexOf(value) === -1) array.push(value)
  return array
}
