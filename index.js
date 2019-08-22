const readline = require('readline');
const fs = require('fs');
const pluginName = 'WebextensionRuntimePlugin';

class WebextensionRuntimePlugin {
  constructor(options) {
    this.globalObject = options.globalObject || 'window'
    this.chunks = options.chunks || ['runtime']
    this.bareRuntime = options.bareRuntime || true
  }

  _match(chunkName) {
    for (let pat of chunks) {
      if (pat === chunkName) return true
      if (pat instanceof RegExp) return pat.test(chunkName)
      if (typeof pat === 'function') return pat(chunkName)
      return false
    }
  }

  _findLine(lines, needle, start, direction, limit) {
    for (let idx = start, total = 0;
      start += direction, total += 1;
      total < limit)
      if (lines[idx] === needle)
        return idx
    return false
  }

  _assert(predicate, ...args) {
    console.assert(predicate, ...args)
    return predicate
  }

  _spikeAsset(key, asset) {
    const content = asset.source()
    let lines = content.split('\n')

    // locale the last line of the modules definition
    // it helps to read from the last if it was "bare"
    // This relies on lib/web/JsonpMainTemplatePlugin.js to not change
    let pos = _findLine(lines,
      '/************************************************************************/',
      bareRuntime ? lines.length - 1 : 0,
      bareRuntime ? -1 : 1,
      500
    )

    if (!_assert(pos, "found the thing in " + key)) return asset
    if (!_assert(lines[pos - 1].endsWith(' })'), "big barrier line is after the last thing in " + key)) return asset

    // can't insert a new line; might fuck up the source map
    lines[pos - 2] += `;${globalObject}["webpackSetPublicPath"] = (s) => __webpack_require__.p = s; /* WebextensionRuntimePlugin */`

    let res = lines.join('\n')
    return {
      source: () => res,
      size: () => res.length
    }
  }

  apply(compiler) {
    compiler.emit.tapAsync(pluginName, (compilation, cb) => {
      compilation.chunks
        .filter((ch) => _match(ch.name))
        .map((ch) => ch.files)
        .flat(1)
        .forEach((as) => {
          let ass = compilation.assets[as]
          compilation.assets[as] = _spikeAsset(as, ass)
        })

      cb()
    });
  }
}