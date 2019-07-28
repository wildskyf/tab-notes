;(() => {
  const defaultPreference = {
    version: 2,
    content: '',
    mode: 'day'
  }
  const theme = {
    night: "night",
    day: "day"
  }

  window.addEventListener('load', () => {
    let write_timeout, saved_timeout
    let $textarea = document.querySelector('#note-content')
    let $mode_switcher = document.querySelector('#mode-switcher')
    let $status = document.querySelector('#status')

    let initNote = async () => {
      let data = await window.utils.loadPreference(defaultPreference)

      // theme
      if (data.mode == theme.night) {
        $textarea.classList.add('dark')
      }
      else {
        $textarea.classList.remove('dark')
      }

      // Update page
      $textarea.value = data.content || ""
      $mode_switcher.dataset.current = data.mode || theme.day
    }

    let updateStorage = newData => {
      browser.storage.sync.set({ content: newData })
      $status.classList.remove('hide')
      $status.textContent = 'Saved.'
      clearTimeout(saved_timeout)
      saved_timeout = setTimeout(() => $status.classList.add('hide'), 3000)
    }

    // when user writing
    $textarea.addEventListener('keyup', event => {
      $status.classList.remove('hide')
      $status.textContent = 'Saving...'
      clearTimeout(write_timeout)
      write_timeout = setTimeout(() => updateStorage(event.target.value), 250)
    })

    // day and night mode switcher
    $mode_switcher.addEventListener('click', event => {
      let reverseMode = $mode_switcher.dataset.current == theme.day ? theme.night : theme.day
      $textarea.classList.toggle('dark')
      $mode_switcher.dataset.current = reverseMode
      browser.storage.sync.set({ mode: reverseMode })
    })

    window.addEventListener('keypress', e => {
      if (!(e.which == 115 && (e.ctrlKey || e.metaKey)) && !(e.which == 19)) return
      e.preventDefault()
      clearTimeout(write_timeout)
      updateStorage(event.target.value)
    })

    // re-init when actived window or tab changed
    browser.tabs.onActivated.addListener(initNote)
    browser.windows.onFocusChanged.addListener(initNote)

    initNote()
  })
})()
