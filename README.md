# disc [![Flattr this](http://api.flattr.com/button/flattr-badge-large.png)](http://flattr.com/thing/1726646/hughskdisc-on-GitHub)[![stable](http://hughsk.github.io/stability-badges/dist/stable.svg)](http://github.com/hughsk/stability-badges) #

[![disc screenshot](http://hughsk.github.io/disc/img/screenshot.png)](http://hughsk.github.io/disc)

Disc is a tool for analyzing the module tree of
[browserify](http://browserify.org) project bundles. It's especially handy
for catching large and/or duplicate modules which might be either bloating up
your bundle or slowing down the build process. It works with node projects too!

The demo included on disc's [github page](http://hughsk.github.io/disc)
is the end result of running the tool on itself - displaying both the node
and browser code.

## Installation ##

Disc lives on [npm](http://npmjs.org/package/npm), so if you haven't already
make sure you have [node](http://nodejs.org/) installed on your machine first.

Installing should then be as easy as:

``` bash
sudo npm install -g disc
```

## Command-Line Interface ##

``` bash
discify [file(s)...] {options}

Options:
  -h, --help       Displays these instructions.
  -o, --output     Output path of the bundle. Defaults to stdout.
  -t, --transform  Browserify transform stream(s) to use.
  -O, --open       Open the file immediately.
```

Simply specify your script entry points as you would when building a project
with the `browserify` command-line tool - if your project uses source
transforms, you should include those too, e.g:

``` bash
discify -t coffeeify index.coffee
```

By default, disc will spit out a standalone HTML file that you can open
in your browser:

``` bash
discify index.js > stats.html
open stats.html
```

If you're looking to get a quick look at your project, you can use the `--open`
or `-O` flags to start a local server and open it up in your browser
automatically:

``` bash
discify index.js --open
```

## Module API ##

### `require('disc').json(files, transforms, callback)` ###

Takes an array of files, and an array of browserify transform streams,
and gathers the required data - calling `callback(err, json)` with either an
error or the results.

### `require('disc').bundle(options, callback)` ###

Calls `callback(err, html)` with a standalone HTML file. You can pass the
following options to the function to modify the output:

* `files`: the files to parse/traverse
* `footer`: HTML to include below the chart.
* `transforms`: transform streams to pass to
  [module-deps](http://ghub.io/module-deps).
