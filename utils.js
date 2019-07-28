;(() => {
  window.utils = {
    loadPreference: async defaultPreference => {
      let results = await browser.storage.sync.get()

      if ((typeof results.length === 'number') && (results.length > 0)) {
        results = results[0]
      }

      if (!results.version) {
        await browser.storage.sync.set(defaultPreference)
        return defaultPreference
      }

      if (results.version === defaultPreference.version) return results

      let updateKeys = Object.keys(defaultPreference).filter( key => results[key] === undefined)
      if (updateKeys.length === 0) return defaultPreference;

      let update = updateKeys.reduce( (obj, key) => ({
        ...obj,
        key: defaultPreference[key]
      }), {})
      await browser.storage.sync.set(update)
      return {
        ...results,
        ...update
      }
    }
  }
})()
