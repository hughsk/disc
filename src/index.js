var domready = require('domready')
  , pretty = require('prettysize')
  , schemes = require('./schemes')
  , d3 = require('d3')

var arc = d3.svg.arc()
  .startAngle(function(d) { return angle(d.x) })
  .endAngle(function(d) { return angle(d.x + Math.max(d.dx - 0.025, 0.0125)) })
  .innerRadius(function(d) { return Math.sqrt(d.y) })
  .outerRadius(function(d) { return Math.sqrt(d.y + d.dy * 0.65) })

var initArc = d3.svg.arc()
  .startAngle(function(d) { return angle(d.x) })
  .endAngle(function(d) { return angle(d.x + d.dx) })
  .innerRadius(function(d) { return Math.sqrt(d.y) })
  .outerRadius(function(d) { return Math.sqrt(d.y) })

var modeInitial = window.disc.mode || 'size'
var modeFns = {
    count: function() { return 1 }
  , size: function(d) { return d.size }
}

domready(function() {
  var root = window.disc
    , width = window.innerWidth
    , height = Math.max(window.innerHeight - 100, 100)
    , radius = Math.min(width, height) * 0.45
    , deg = 120

  var svg = d3.select('.chart').append('svg')
      .attr('width', width)
      .attr('height', height)
    .append('g')
      .attr('transform', 'translate(' + width / 2 + ',' + height * .52 + ')')

  var paletteDiv = d3.select('.palette-wrap')
    .style('top', String(window.innerHeight - (schemes.length - 1) * 56 - 16) + 'px')
    .selectAll('.palette')
    .data(schemes)
    .enter()
    .append('div')
    .classed('scheme-icon', true)

  paletteDiv.append('span')
    .classed('scheme-text', true)
    .text(function(d) { return d.name })

  var palettes = paletteDiv
    .append('svg')
    .style('display', 'inline-block')
    .classed('palette', true)
    .on('click', function(d, i) {
      useScheme(i, path.transition()
        .duration(600)
        .ease(bounce_high, 1000)
        .delay(function(d, i) {
          return d.x * 100 + d.y / maxdepth * 0.06125
        })
      )
    })

  palettes.append('rect')
    .attr('width', 23)
    .attr('height', 48)
    .style('fill', function(d) {
      return d.background
    })

  palettes.selectAll('.color')
    .data(function(d) { return d.all })
    .enter()
    .append('rect')
    .style('fill', function(d) { return d })
    .attr('x', 25)
    .attr('y', function(d, i, j) {
      return 48 * i / schemes[j].all.length - 1
    })
    .attr('width', 22)
    .attr('height', function(d, i, j) {
      return 48 / schemes[j].all.length - 1
    })

  var partition = d3.layout.partition()
      .sort(null)
      .size([2 * Math.PI, radius * radius])
      .value(modeFns[modeInitial])

  //
  // Creates the title text in
  // the center of the rings.
  //
  var title = svg.append('text')
    .text(root.name)
    .attr('x', 0)
    .attr('y', -5)
    .style('font-size', '12px')
    .style('fill', 'white')
    .style('font-weight', 500)
    .style('alignment-baseline', 'middle')
    .style('text-anchor', 'middle')

  //
  // Likewise, this is the file
  // size stat below the title
  //
  var size = svg.append('text')
    .text(pretty(root.size))
    .attr('x', 0)
    .attr('y', 15)
    .style('fill', 'white')
    .style('font-size', '10px')
    .style('alignment-baseline', 'middle')
    .style('text-anchor', 'middle')

  //
  // Each arc is wrapped in a group element,
  // to apply rotation transforms while
  // changing size and shape.
  //
  var groups = svg.datum(root).selectAll('g')
      .data(partition.nodes)
    .enter()
      .append('g')
      .attr('transform', 'rotate(' + deg + ')')

  var maxdepth = groups[0].reduce(function(max, el) {
    return Math.max(max, el.__data__.depth)
  }, 0)

  //
  // Actually create the arcs for each
  // file.
  //
  var path = groups.append('path')
    .attr('d', initArc)
    .attr('display', function(d) {
      return d.depth ? null : 'none'
    })
    .style('stroke', '#2B2B2B')
    .style('stroke-width', '0')
    .style('fill-rule', 'evenodd')
    .each(function(d) {
      d.x0 = d.x
      d.dx0 = d.dx
      d.el = this
    })

  //
  // Colour scheme functionality.
  //
  // Triggered immediately with the default
  // scheme, must be passed a d3 selection.
  //
  var background
    , scheme = 0
    , specials
    , color

  useScheme(scheme, path)
  function useScheme(n, path) {
    background = schemes[n].background
    specials = schemes[n].specials

    palettes.each(function(d, i) {
      d3.select(this.parentNode)
        .classed('selected', function() {
          return i === n
        })
    })

    palettes
      .transition()
      .ease('bounce')
      .duration(500)
      .attr('height', function(d, i) {
        return i === n ? 0 : 48
      })

    ;[d3.select('body')
    , d3.select('html')].forEach(function(el) {
      el.transition()
        .ease('sin-in-out')
        .duration(600)
        .style('background', background)
    })

    var colors = schemes[n].main
    Object.keys(specials).forEach(function(key) {
      var idx = colors.indexOf(specials[key].toLowerCase())
      if (idx === -1) return
      colors.splice(idx, 1)
    })

    color = d3.scale
      .ordinal()
      .range(colors)

    path.style('fill', function(d) {
      var name = d.children ? d.name : d.parent.name
      d.c = schemes[n].modifier.call(d
        , specials[name] || color(name)
        , root
      )
      return d.c
    })
  }

  path.transition()
    .duration(1000)
    .ease('elastic', 2, 1)
    .delay(function(d, i) {
      return d.x * 100 + (i % 4) * 250 + d.y / maxdepth * 0.25
    })
    .attr('d', arc)

  //
  // Rotates the newly created
  // arcs back towards their original
  // position.
  //
  groups.transition()
    .duration(3250)
    .delay(function(d, i) {
      return d.x * 100 + (i % 4) * 250 + d.y / maxdepth * 0.25 + 250
    })
    .attrTween('transform', rotateTween(deg))

  groups.on('mouseover', function(d) {
    highlight(d)
    title.text(d.name)
    size.text(pretty(d.size))
  }).on('mouseout', function(d) {
    unhighlight(d)
    title.text(root.name)
    size.text(pretty(root.size))
  })

  highlight.tween = hoverTween(1)
  function highlight(d) {
    if (d.el) d3.select(d.el)
      .transition()
      .delay(function(d) { return (d.depth - 1) * 300 / maxdepth })
      .ease('back-out', 10)
      .duration(500)
      .attrTween('d', highlight.tween)
      .style('fill', function(d) { return d.c })

    if (d.children) {
      var i = d.children.length
      while (i--) highlight(d.children[i])
    }
  }

  unhighlight.tween = hoverTween(0)
  function unhighlight(d) {
    if (d.el) d3.select(d.el)
      .transition()
      .delay(function(d) { return (d.depth - 1) * 300 / maxdepth })
      .ease('back-out', 4)
      .duration(500)
      .attrTween('d', unhighlight.tween)
      .style('fill', function(d) { return d.c })

    if (d.children) {
      var i = d.children.length
      while (i--) unhighlight(d.children[i])
    }
  }

  var modes = d3.select('.scale-list')
    .selectAll('li')
    .data(['count', 'size'])
    .enter()
    .append('li')
    .attr('class', 'scale-icon scale-size')
    .on('click', function(d) {
      updateMode(d, true)
    });

  modes.append('span')
    .text(function(d) {
      return {
        count: 'File Count',
        size: 'File Size'
      }[d]
    })

  modes.append('svg')
    .attr({ width: 48, height: 48 })
    .append('g')
    .each(function(type) {
      d3.select(this)
        .attr('transform', 'translate(8, 8)')
        .selectAll('circle')
        .data(d3.range(0, 16))
        .enter()
        .append('circle').attr('fill', '#fff')
        .attr('r', function(d, i) {
          return type !== 'size' ? 3 : (i === 0 || i === 6) ? 6 : 3
        })
        .attr('transform', function(d) {
          return 'translate(' + [(d % 4) * 10, Math.floor(d / 4) * 10] + ')'
        })
    })

  updateMode(modeInitial)

  function updateMode(mode, update) {
    value = modeFns[mode] || value

    modes.style('opacity', function(d) {
      return mode === (
        this.mode = this.mode || this.getAttribute('data-mode')
      ) ? 1 : null
    })

    if (!update) return

    groups
        .data(partition.value(value).nodes)
        .select('path')
      .transition()
        .duration(1500)
        .attrTween('d', arcTween)
  }
})

function angle(x) {
  return x
}

// Modified version of d3's built-in bounce easing method:
// https://github.com/mbostock/d3/blob/51228ccc4b54789f2d92d268e94716d1c016c774/src/interpolate/ease.js#L105-110
function bounce_high(t) {
  return t < 1 / 2.75 ? 7.5625 * t * t
    : t < 2 / 2.75 ? 7.5625 * (t -= 1.5 / 2.75) * t + .65
    : t < 2.5 / 2.75 ? 7.5625 * (t -= 2.25 / 2.75) * t + .85
    : 7.5625 * (t -= 2.625 / 2.75) * t + .975
}

function arcTween(a) {
  var i = d3.interpolate({x: a.x0, dx: a.dx0}, a)
  return function(t) {
    var b = i(t)
    a.x0 = b.x
    a.dx0 = b.dx
    return arc(b)
  }
}

//
// A more complex arc tween for handling
// hover states. Returns a tween function
// which returns an interpolator for each
// datum.
//
function hoverTween(z) {
  var ht = 0
  var harc = d3.svg.arc()
    .startAngle(function(d) {
      return angle(d.x)
    })
    .endAngle(function(d) {
      return angle(d.x
        + (1 - ht) * Math.max(d.dx - 0.025, 0.0125)
        + ht * (d.dx + 0.00005)
      )
    })
    .innerRadius(function(d) {
      return Math.sqrt(d.y)
    })
    .outerRadius(function(d) {
      return Math.sqrt(d.y + d.dy * (ht * 0.35 + 0.65)) + ht
    })

  return function(a) {
    a.t0 = a.t3 = a.t0 || 0
    a.t1 = z
    a.t2 = a.t1 - a.t0
    return function(_t) {
      ht = a.t2 * _t + a.t3
      a.t0 = ht
      return harc(a)
    }
  }
}

//
// Makes it possible to rotate
// angles greater than 180 degrees :)
//
function rotateTween(deg) {
  return function(d) {
    return function(t) {
      return 'rotate(' + (1-t) * deg + ')'
    }
  }
}
