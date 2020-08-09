/**
 *  require: migration function
 */

;(() => {
  window.utils = {
    loadPreference: async () => {
      let results = await browser.storage.local.get()
      let syncResults = await browser.storage.sync.get()
      results.list = results.list && results.list.sort((a, b) => b.time - a.time)

      if ((typeof results.length === 'number') && (results.length > 0)) {
        results = results[0]
      }

      if (!results.version && !syncResults.version) {
        await browser.storage.local.set(defaultPreference)
        return defaultPreference
      }

      if (results.version === defaultPreference.version) {
        return results
      }
      else {
        if (window.migration) {
          await window.migration(results, syncResults)
        }
      }

      let updateKeys = Object.keys(defaultPreference).filter( key => results[key] === undefined)
      if (updateKeys.length === 0) { return results; }

      let update = updateKeys.reduce( (obj, key) => ({
        ...obj,
        key: defaultPreference[key]
      }), results)


      await browser.storage.local.set(update)
      return update
    }
  }
})()
