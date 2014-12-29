var json = require('../').json
var test = require('tape')
var fs = require('fs')

test('json', function(t) {
    json([fs.readFileSync(__dirname + '/fixture/bundle.js', 'utf8')], function(err, res) {
        t.notOk(err)
        t.ok(res)
        t.equal(res.name, 'index.js', 'main file name')
        t.equal(res.children.length, 1, '.children.length')
        t.end()
    })
})

test('json missing --full-paths', function(t) {
    json([fs.readFileSync(__dirname + '/fixture/bundle-no-full.js', 'utf8')], function(err, res) {
        t.ok(err, 'returns error')
        t.notOk(res, 'does not return result')
        t.end()
    })
})
