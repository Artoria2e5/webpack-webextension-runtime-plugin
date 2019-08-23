# webpack-webextension-runtime-plugin
Quick &amp; Dirty runtime mods for webextension dependency loading with
`runtime.getURL`

## Why?

Webpack imports from `__webpack_import_path__`, which is usually set to the
`homepage` of whatever you are building. This will not work with content
scripts of webextensions, as everything must be resolved relative to
`manifest.json` for the paths to work. We can't dynamically resolve this
in the injected scripts either as they do not get access to the extension
API. The injector must somehow pass it in!

## Usage

Simply do:

```JS
config.optimization.runtimeChunk = 'single'
config.plugins.push(new (require('webpack-webextension-runtime-plugin'))({
    globalObject: config.output.globalObject, // I cannot read the config!
    chunks: ['runtime'], // this is the default; adjust if not using "single"
    bareRuntime: true    // false if you are throwing entry points at us
}))
```

When it's time to inject the scripts:

```JS
const quoteRuntimeURL = (s) => JSON.stringify(browser.runtime.getURL(s))
const runtimeScript = `
    const rt = document.createElement('script')
    rt.src = ${quoteRuntimeURL('js/runtime.js')}
    document.documentElement.appendChild(rt)
    window.webpackSetPublicPath(${quoteRuntimeURL('/')})`
browser.webNavigation.onCommitted.addListener(async arg => {
        browser.tabs
            .executeScript(arg.tabId, {
                runAt: 'document_start',
                frameId: arg.frameId,
                code: runtimeScript
            })
            .catch(IgnoreError(arg))
})
```

## How?

Oh I just try to throw a line `global["webpackSetPublicPath"] = (s) => __webpack_require__.p = s;`
into the runtime definitions. It should work on plain runtime libraries, but I
think the matching is also lax enough to accomendate runtimes thrown into
entry points. Hell I know how to do this with `ed` commands better than I do
with this wacky code.
