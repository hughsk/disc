module.exports = compile

function compile(html) {
  return function(data) {
    var out = html
    data = data || {}
    Object.keys(data).forEach(function(key) {
      out = out.replace('<!-- @@' + key + ' -->', data[key])
    })
    return out
  }
}
