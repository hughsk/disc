var path = require('path')
var fs = require('fs')

module.exports = versions

function versions(child) {
  if (!child.children) return
  if (child.path) return child.children.forEach(versions)
  if (!child.children.length) return

  var first = null
  for (var i = 0; i < child.children.length; i++) {
    if (first = child.children[i].path) break
  }

  if (!first) return child.children.forEach(versions)

  child.path = path.resolve(first, '..')

  var pkgFile = path.resolve(child.path, 'package.json')

  if (!fs.existsSync(pkgFile)) return

  try {
    var version = JSON.parse(
      fs.readFileSync(pkgFile, 'utf8')
    ).version
  } catch(e) { return }

  child.name += '@'
  child.name += version
  child.children.forEach(versions)
}
