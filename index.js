var unpack = require('browser-unpack')
var builtins = require('builtins')
var through = require('through')
var flatten = require('flatten')
var duplex = require('duplexer')
var pluck = require('plucker')
var uniq = require('uniq')

var commondir = require('commondir')
var fileTree = require('file-tree')
var path = require('path')
var fs = require('fs')
var bl = require('bl')

var versions = require('./lib/versions')

module.exports = createStream
createStream.json = json
createStream.bundle = bundle

function createStream(opts) {
  opts = opts || {}

  var buffer = bl(function(err, content) {
    if (err) return stream.emit('error', err)

    bundle(content, opts, function(err, html) {
      if (err) return stream.emit('error', err)

      output.queue(html)
      output.queue(null)
    })
  })

  var output = through()
  var stream = duplex(buffer, output)

  return stream
}

function json(bundles, callback) {
  var modules = flatten(bundles
    .map(String)
    .map(unpack)
  ).map(function(module) {
    if (typeof module === 'undefined') return callback(new Error(
      'Unable to compile one of the supplied bundles!'
    ))

    if (typeof module.id !== 'number') return module

    return callback(new Error(
      'Please recompile this browserify bundle using the --full-paths flag ' +
      '(when using the command-line interface) or with the fullPaths option ' +
      'set to true (when using the JavaScript API).'
    ))
  })

  modules = modules.filter(function(module) {
    return module && !isEmpty(module)
  })

  if (!modules.length) return

  var browserifyModules = modules.filter(fromBrowserify(true))
  var otherModules = modules.filter(function(module) {
    if (path.basename(module.id) === '_empty.js') return false
    if (browserifyModules.indexOf(module) === -1) return true
  })

  var root = commondir(otherModules.map(pluck('id')))

  browserifyModules.forEach(function(module) {
    var regex = /^.+\/node_modules\/browserify\/(?:node_modules\/)(.+)$/g

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
      , path: id
    })
  }, function(err, tree) {
    if (err) return callback(err)

    tree = { name: main, children: tree }
    dirsizes(tree)
    versions(tree)
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

  var header = opts.header || opts.button || ''
  var footer = opts.footer || ''

  return json(bundles, function(err, data) {
    if (err) return callback(err)

    data.mode = opts.mode || 'size'
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
      , header: header
      , data: data
    }))
  })
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

function noop(){}

function fromBrowserify(yes) {
  var existsCache = {}
  var no = !yes

  return function(module) {
    var search = '/node_modules/browserify'
    var idx  = module.id.indexOf(search)
    var from = idx !== -1

    if (!from) return no

    // special case for process.js
    // from insert-module-globals
    if (
      module.id.indexOf('insert-module-globals') !== -1 &&
      module.id.split(path.sep).slice(-2).join('/') === 'process/browser.js'
    ) return yes

    // Look up browserify's builtins file to
    // determine if this file is part of browserify
    // core.
    var builtinFile = (
      module.id.slice(0, idx + search.length) +
      '/lib/builtins.js'
    )

    if (!(builtinFile in existsCache)) {
      existsCache[builtinFile] = values(
        fs.existsSync(builtinFile) &&
        require(builtinFile) || {}
      )
    }

    var localBuiltins = existsCache[builtinFile]
    var bidx = localBuiltins.indexOf(module.id)

    if (bidx !== -1) return yes

    // Guess remaining helper files based on module
    // name: this should probably be improved in the
    // future.
    var split = module.id.split(path.sep)
    var j = split.length - 1

    while (split[--j] !== 'node_modules');;

    var dir = split.slice(j + 1)[0].replace(/\-(?:browser(?:ify)?|es3)$/g, '')
    if (dir === 'Base64') return yes
    if (dir === 'base64-js') return yes
    if (dir === 'inherits') return yes
    if (dir === 'process') return yes
    if (dir === 'ieee754') return yes
    if (builtins.indexOf(dir) !== -1) return yes

    return no
  }
}

function values(object) {
  return Object.keys(object).map(function(key) {
    return object[key]
  })
}

function isEmpty(module) {
  return (
    path.basename(module.id) === '_empty.js' &&
  (!fs.existsSync(module.id) || !fs.statSync(module.id).size)
  )
}
