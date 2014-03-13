var unpack = require('browser-unpack')
var resolve = require('resolve')
var flatten = require('flatten')
var pluck = require('pluck')
var uniq = require('uniq')

var commondir = require('commondir')
var fileTree = require('file-tree')
var path = require('path')
var fs = require('fs')

var preludeSize = fs.statSync(
  require.resolve('browser-pack/_prelude')
).size

module.exports = {
    json: json
  , bundle: bundle
}

function json(bundles, callback) {
  var modules = flatten(bundles
    .map(String)
    .map(unpack)
  ).map(function(module) {
    if (typeof module.id !== 'number') return module
    throw new Error(
      'please compile this browserify bundle using the --full-paths flag'
    )
  })

  var browserifyModules = modules.filter(fromBrowserify(true))
  var otherModules = modules.filter(fromBrowserify(false))
  var root = commondir(otherModules.map(pluck('id')))

  browserifyModules.forEach(function(module) {
    var regex = /^.+\/node_modules\/browserify\/(.+)$/g

    module.id = module.id.replace(regex, function(_, subpath) {
      return path.resolve(root, 'browserify-core/' + subpath)
    })

    return module
  })

  uniq(modules, function(a, b) {
    return a.id === b.id ? 0 : 1
  }, true)

  var ids  = modules.map(pluck('id'))
  var main = path.basename(root)

  var byid = modules.reduce(function(memo, mod) {
    memo[mod.id] = mod
    return memo
  }, {})

  fileTree(ids, function(id, next) {
    var row = byid[id]

    next(null, {
        size: row.source.length
      , deps: Object.keys(row.deps).length
    })
  }, function(err, tree) {
    if (err) return callback(err)

    tree = { name: main, children: tree }
    dirsizes(tree)
    callback(null, tree)
  })
}

function bundle(bundles, opts, callback) {
  bundles = Array.isArray(bundles)
    ? bundles
    : bundles ? [bundles] : []

  if (typeof opts === 'function') {
    callback = opts
    opts = {}
  }

  opts = opts || {}
  callback = callback || noop

  var footer = opts.footer || ''
  var button = opts.button || ''

  return json(bundles, function(err, data) {
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

function submodule(parent, child) {
  parent = require.resolve(parent)
  return resolve.sync(child, {
    basedir: path.dirname(parent)
  })
}

function sortById(a, b) {
  var aid = a.id
  var bid = b.id

  return aid > bid
    ? -1 : aid < bid
    ? +1 : 0
}

function noop(){}

function fromBrowserify(yes) {
  return function(module) {
    var idx = module.id.indexOf('/node_modules/browserify')

    return idx !== -1
      ?  yes
      : !yes
  }
}
