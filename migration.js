const defaultPreference = {
  version: 3,
  mode: 'day',
  list: [{
    content: ''
  }]
}

;(() => {
  window.migration = async results => {
    if (results.version === 2) {
      results.list = [{
        content: results.content || ''
      }]
      results.version = defaultPreference.version
      delete results.content
      await browser.storage.sync.set(results)
      browser.storage.sync.remove('content')
    }
  }
})()
