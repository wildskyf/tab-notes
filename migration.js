/* global browser */
const defaultPreference = {
  version: 5,
  mode: 'day',
  list: [{
    content: '',
    time: (new Date()).getTime()
  }],
  showcredits: true,
  darktoggleonnotes: true
}

  ; (() => {
    window.migration = async (results, syncResult) => {
      if (results.version === 2) {
        results.list = [{
          content: results.content || ''
        }]
        results.version = defaultPreference.version
        delete results.content
        await browser.storage.local.set(results)
        browser.storage.local.remove('content')
      }

      if (results.version === 3) {
        results.list = results.list.map(note => {
          return {
            ...note,
            time: (new Date()).getTime()
          }
        })
        results.version = defaultPreference.version
        await browser.storage.local.set(results)
      }

      if (syncResult.version === 4 && results.version !== 5) {
        // migrate from storage.sync to storage.local
        results.list = syncResult.list,
          results.mode = syncResult.mode,
          results.version = defaultPreference.version
        await browser.storage.local.set(results)
      }
    }
  })()
