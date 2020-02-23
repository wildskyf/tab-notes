/* global browser */
const defaultPreference = {
  version: 4,
  mode: 'day',
  list: [{
    content: '',
    time: (new Date()).getTime()
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

    if (results.version === 3) {
      results.list = results.list.map(note => {
        return {
          ...note,
          time: (new Date()).getTime()
        }
      })
      results.version = defaultPreference.version
      await browser.storage.sync.set(results)
    }
  }
})()
