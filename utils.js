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

      if (results.version !== defaultPreference.version && window.migration) {
        await window.migration(results, syncResults)
      }

      // 3.x saved notes as plain text from a textarea, but 4.x renders them as HTML,
      // which collapses line breaks. Notes that have line breaks and no tags are still plain text.
      const isPlainText = content => typeof content === 'string' && content.includes('\n') && !/<[a-z\/!]/i.test(content)
      const toHTML = content => content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
      if (Array.isArray(results.list) && results.list.some(note => isPlainText(note.content))) {
        results.list = results.list.map(note => isPlainText(note.content) ? { ...note, content: toHTML(note.content) } : note)
        await browser.storage.local.set({ list: results.list })
      }

      let updateKeys = Object.keys(defaultPreference).filter( key => results[key] === undefined)
      if (updateKeys.length === 0) { return results; }

      let update = updateKeys.reduce( (obj, key) => ({
        ...obj,
        [key]: defaultPreference[key]
      }), results)


      await browser.storage.local.set(update)
      return update
    },

    systemDarkMode: window.matchMedia('(prefers-color-scheme: dark)'),

    //dark when following a dark system theme, or when dark mode was chosen by hand
    isDark: data => data.followsystem ? window.utils.systemDarkMode.matches : data.mode === 'night'
  }
})()
