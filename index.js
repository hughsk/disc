var globals = require('insert-module-globals')
var builtins = require('browser-builtins')
var mdeps = require('module-deps')
var sdeps = require('deps-sort')
var resolve = require('resolve')

var fileTree = require('file-size-tree')
var quotemeta = require('quotemeta')
var commondir = require('commondir')
var once = require('once')
var path = require('path')
var fs = require('fs')

var preludeSize = fs.statSync(require.resolve('browser-pack/_prelude')).size
var bufferPath = require.resolve('insert-module-globals/buffer')
var processPath = submodule(
    'insert-module-globals'
  , 'process/browser'
)

module.exports = {
    json: json
  , bundle: bundle
}

var ignore = Object.keys(builtins).concat(['os', 'module', 'cluster'])
ignore = '^(?:' + ignore.join('|') + ')$'
ignore = new RegExp(ignore, 'i')

function json(files, transforms, extensions, noparse, callback) {
  var found = []
    , foundbuiltins = []
    , virtual = []

  files = toarray(files)
  transforms = toarray(transforms)
  extensions = toarray(extensions)
  noparse = toarray(noparse)
  callback = once(callback)

  noparse = noparse.map(function(xs) {
    return path.resolve(xs)
  })

  mdeps(files, {
      transform: transforms
    , extensions: [".js", ".json"].concat(extensions)
    , noParse: noparse
    , filter: function(module) {
      if (builtins[module]) {
        insert(foundbuiltins, builtins[module])
      }
      return !ignore.test(module)
    }
  }).pipe(globals(files))
    .pipe(sdeps())
    .once('error', callback)
    .once('close', function() {
      var root = path.basename(commondir(found))
      var tree = {
          name: root
        , children: fileTree(found)
      }

      virtual.push({
          name: 'prelude.js'
        , size: preludeSize
      })

      foundbuiltins = foundbuiltins.map(function(builtin) {
        return {
            name: path.basename(builtin)
          , size: fs.statSync(builtin).size
        }
      })

      ;[].push.apply(virtual, foundbuiltins)
      if (virtual.length) {
        tree.children.push({
            name: 'builtins'
          , children: virtual
        })
      }

      dirsizes(tree)
      callback(null, tree)
    })
    .on('data', function(dep) {
      if (dep.id === processPath) {
        return virtual.push({
            name: 'process.js'
          , size: dep.source.length
        })
      } else
      if (dep.id === bufferPath) {
        return virtual.push({
            name: 'buffer.js'
          , size: dep.source.length
        })
      }

      found.push(dep.id)
    })
}

function bundle(opts, callback) {
  opts = opts || {}

  var files = toarray(opts.files || null)
  var noparse = toarray(opts.noparse || null)
  var extensions = toarray(opts.extensions || null)
  var transforms = toarray(opts.transforms || null)
    .concat(opts.transform || null)

  var footer = opts.footer || ''
  var button = opts.button || ''

  json(files, transforms, extensions, noparse, function(err, data) {
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
  if (typeof arg === 'undefined' || arg === null) return []
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

function submodule(parent, child) {
  parent = require.resolve(parent)
  return resolve.sync(child, {
    basedir: path.dirname(parent)
  })
}
