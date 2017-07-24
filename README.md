# disc ![gittip: hughsk](http://img.shields.io/gittip/hughsk.svg) ![npm](http://img.shields.io/npm/dm/disc.svg)  ![stable](http://img.shields.io/badge/stability-stable-green.svg) #

Disc is a tool for analyzing the module tree of
[browserify](http://browserify.org) project bundles. It's especially handy
for catching large and/or duplicate modules which might be either bloating up
your bundle or slowing down the build process.

The demo included on disc's [github page](http://hughsk.github.io/disc)
is the end result of running the tool on browserify's own code base.

## Installation ##

Disc lives on [npm](http://npmjs.org/package/npm), so if you haven't already
make sure you have [node](http://nodejs.org/) installed on your machine first.

Installing should then be as easy as:

``` bash
sudo npm install -g disc
```

## Command-Line Interface ##

***Note:*** *you'll need to build your bundle with the `--full-paths` flag, 
and pass a fully qualified (not relative) input path to browserify
for disc to do its thing.*

``` bash
discify [bundle(s)...] {options}

Options:
  -h, --help    Displays these instructions.
  -o, --output  Output path of the bundle. Defaults to stdout.
  -O, --open    Opens disc in a new browser window automatically
  -m, --mode    the default file scale mode to display: should be
                either "count" or "size". Default: size
```

When you install disc globally, the `discify` command-line tool is made
available as the quickest means of checking out your bundle. As of disc v1.0.0,
this tool takes any bundled browserify script as input and spits out a
standalone HTML page as output.

For example:

``` bash
browserify --full-paths index.js > bundle.js
discify bundle.js > disc.html
open disc.html
```

You can easily chain this file into another command, or use the `--open`
flag to open disc in your browser automatically:

``` bash
browserify --full-paths index.js | discify --open
```

## Module API ##

***Note:*** *you'll need to build your bundle with the `fullPaths` option
for disc to do its thing.*

### `require('disc')(opts)` ###

Creates a through stream that you can pipe a bundle into, and get an HTML file
in return – much like you would expect when working with the command-line tool.

So to perform the above example with Node instead of Bash:

``` javascript
var browserify = require('browserify')
var open = require('opener')
var disc = require('disc')
var fs = require('fs')

var input = __dirname + '/index.js'
var output = __dirname + '/disc.html'

var bundler = browserify(input, {
  fullPaths: true
})

bundler.bundle()
  .pipe(disc())
  .pipe(fs.createWriteStream(output))
  .once('close', function() {
    open(output)
  })
```

This method takes the following options:

* `header`: HTML to include above the visualisation. Used internally to render
  the "Fork me on GitHub" ribbon.
* `footer`: HTML to include beneath the visualisation. Used internally for the
  description on the demo page.
* `mode`: the default file scale mode to display: one of either `"count"` or
  `"size"`, defaulting to `"size"`.

### `disc.bundle(bundles, [opts], callback)` ###

A callback-style interface for disc: takes an array of `bundles` (note: the
file contents and not the file names), calling `callback(err, html)` with
either an error or the resulting standalone HTML file as arguments.

This currently mirrors how disc is currently implemented, but the stream API is
a little more convenient to work with.

### `disc.json(bundles, callback)` ###

Takes an array of bundle contents (as strings, or Buffers), and gathers the
required data - calling `callback(err, json)` with either an error or the
results.

## Palettes ##

You can switch between multiple color palettes, most of which serve to highlight
specific features of your bundle:

### Structure Highlights ###

![Structure Highlights](http://i.imgur.com/LO6Gio3.png)

Highlights `node_modules` directories as green and `lib` directories as orange.
This makes it easier to scan for "kitchen sink" modules or modules with lots of
dependencies.

### File Types ###

![File Types](http://i.imgur.com/A8zDrbN.png)

Highlights each file type (e.g. `.js`, `.css`, etc.) a different color. Helpful
for tracking down code generated from a transform that's bloating up your bundle
more than expected.

### Browserify Core ###

![Browserify Core](http://i.imgur.com/AtiKgwR.png)

Highlights the automatically included and/or inserted modules that come courtesy
of browserify in red. Makes it easy to quantify just how much space in your
bundle is the result of shimming node's core functionality.

### Original/Pastel ###

Nothing particularly special about these palettes – colored for legibility and
aesthetics respectively.
