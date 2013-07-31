var domready = require('domready')
  , pretty = require('prettysize')
  , d3 = require('d3')

var specials = {
  'node_modules': '#FF8553'
}

var pallette = [
    '#00A0B0'
  , '#CC333F'
  , '#EB6841'
  , '#EDC951'
]

var colors = []
  .concat(pallette.map(lighten(0.7)))
  .concat(pallette.map(lighten(1.4)))
  .concat(pallette.map(lighten(2)))

Object.keys(specials).forEach(function(key) {
  var idx = colors.indexOf(specials[key].toLowerCase())
  if (idx === -1) return
  colors.splice(idx, 1)
})

var color = d3.scale
  .ordinal()
  .range(colors)

function lighten(n) {
  return function(c) {
    return String(d3.rgb(c).brighter(n))
  }
}

function angle(x) {
  return x
}

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

  var partition = d3.layout.partition()
      .sort(null)
      .size([2 * Math.PI, radius * radius])
      .value(function(d) { return 1 })

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
    .style('fill', function(d) {
      var name = d.children ? d.name : d.parent.name
      return d.c = specials[name] || color(name)
    })
    .each(function(d) {
      d.x0 = d.x
      d.dx0 = d.dx
      d.el = this
    })

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
    if (d.children) {
      var i = d.children.length
      while (i--) unhighlight(d.children[i])
    }
  }

  var modes = d3.selectAll('[data-mode]')
  modes.on('click', function change() {
    var value
    switch (this.getAttribute('data-mode')) {
      case 'count':
      default:
        value = function() { return 1 }
        break
      case 'size':
        value = function(d) { return d.size }
        break
    }

    modes.style('opacity', null)
    d3.select(this).style('opacity', 1)

    groups
        .data(partition.value(value).nodes)
        .select('path')
      .transition()
        .duration(1500)
        .attrTween('d', arcTween)
  })

  // Interpolate the arcs in data space.
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
})
