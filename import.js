;(() => {
  const SEPARATOR_3_2 = '\n\n--------------------\n\n'

  //Read notes from any export format: 4.x ("<<time>>" after each note), or 3.2.0's JSON and plain-text exports
  const parseNotes = text => {
    text = text.replace(/\r\n/g, '\n')
    const now = (new Date()).getTime()

    if (text.trim().startsWith('{')) {
      try {
        const { list } = JSON.parse(text)
        if (Array.isArray(list)) {
          return list
            .filter(note => note && typeof note.content === 'string')
            .map((note, i) => ({ content: note.content, time: Number(note.time) || now - i }))
        }
      } catch (_) { }
    }

    //copying from the export page often drops the newlines after the last "<<time>>"
    const parts = text.split(/\n\n<<(\d+)>>(?:\n\n|\s*$)/)
    if (parts.length > 1) {
      const notes = []
      for (let i = 0; i + 1 < parts.length; i += 2) {
        notes.push({ content: parts[i], time: parseInt(parts[i + 1]) })
      }
      const rest = parts[parts.length - 1]
      if (rest.trim()) { notes.push({ content: rest, time: now }) }
      return notes
    }

    if (text.includes(SEPARATOR_3_2)) {
      return text.split(SEPARATOR_3_2).map((content, i) => ({ content, time: now - i }))
    }

    return null
  }

  const importJs = () => {
    const init = async () => {
      const $textarea = document.querySelector('#import-content')
      const $importBtn = document.querySelector('#import-button')
      const $result = document.querySelector('#import-result')

      $importBtn.addEventListener('click', async () => {
        const text = $textarea.value
        if (!text.trim()) { return }

        let notes = parseNotes(text)
        if (!notes) {
          if (!confirm("This doesn't look like a Tab Notes export. Import the whole text as one note?")) { return }
          notes = [{ content: text, time: (new Date()).getTime() }]
        }

        //add to the current notes instead of replacing them, and skip notes that already exist
        const data = await window.utils.loadPreference()
        const existing = data.list.filter(note => note.content !== '')
        const known = new Set(existing.map(note => note.content))
        const added = notes.filter(note => note.content.trim() && !known.has(note.content))

        data.list = [...existing, ...added].sort((a, b) => b.time - a.time)
        if (data.list.length === 0) { data.list = [{ content: '', time: (new Date()).getTime() }] }
        await browser.storage.local.set({ list: data.list })

        const skipped = notes.length - added.length
        $result.textContent = `Imported ${added.length} note${added.length === 1 ? '' : 's'}` +
          (skipped ? `, skipped ${skipped} already there or empty.` : '.')
        $textarea.value = ''
      })
    }

    return {
      init
    }
  }

  window.addEventListener('load', () => {
    importJs().init()
  })
})()
