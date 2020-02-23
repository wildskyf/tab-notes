;(() => {
  // FIXME: Should use uuid instead of index as key for storage
  /** DB
    * {
    *   version: <number>,
    *   mode: <string>
    *   list: [{
    *       content: <string>
    *   }]
    * }
    **/

  const newtab_script = () => {
    const THEMES = {
      night: "night",
      day: "day"
    }
    const $textarea = document.querySelector('textarea')
    const $list = document.querySelector('#list')
    const $mode_switcher = document.querySelector('#mode-switcher')
    const $status = document.querySelector('#status')
    const $create_entry = document.querySelector('#create_entry')

    let currentNoteId = 0
    let data = null

    const _emptyNote = () => JSON.parse('{ "content": "" }')

    const _render = () => {

      const _renderList = list => {
        const _makeTitleString = content => content.substr(0, 10).replace(/\n/g, '') || '<span class="empty-string">(EMPTY)</span>'
        const $ul = document.querySelector('ul')

        $ul.innerHTML = list.map((item, index) => {
          let title = _makeTitleString(item.content)
          let className = index === currentNoteId ? 'current' : ''
          return `<li class="${className}" data-id="${index}"><span>${title}<div class='del'>+</div></span></li>`
        }).join('')

        $ul.querySelectorAll('li').forEach(function($li, index){
          $li.addEventListener('click', function(event){
            if (event.target.classList.contains('del')) {
              const currentNote = list[index]
              if (currentNote.content !== '') {
                const noteTitle = _makeTitleString(currentNote.content)
                const deleteConfirmString = `Do you want to delete note: ${noteTitle} ?\nThis can't be undo.`
                if (!confirm(deleteConfirmString)) { return }
              }

              if (index === 0 && data.list.length === 1) {
                data.list = [_emptyNote()]
              }
              else {
                data.list = data.list.filter((note, i) => i !== index)
                if (currentNoteId >= data.list.length) {
                  currentNoteId = data.list.length - 1
                }
              }

              browser.storage.sync.set({ list: data.list })

              _render()
              return
            }

            if (currentNoteId === index) { return }
            currentNoteId = index
            _render()
          })
        })
      }

      const _renderNote = note => {
        $textarea.value = note.content || ''
        $textarea.focus()
      }

      _renderList(data.list)
      _renderNote(data.list[currentNoteId])
    }

    const _enableAnimation = () => {
      setTimeout(() => {
        document.querySelector('style').innerHTML += `
          #create_entry, #note-content, #mode-switcher,
          #addon-author, #list, #list li > span, #list .current:before {
            transition-duration: .2s;
          }
        `
      }, 300)
    }

    const _noteEventHandler = () => {
      // auto saving and indicator
      let write_timeout, saved_timeout
      $textarea.addEventListener('keyup', () => {
        $status.classList.remove('hide')
        $status.textContent = 'Saving...'

        clearTimeout(write_timeout)
        write_timeout = setTimeout(() => {
          const _renderStatusDone = () => {
            $status.classList.remove('hide')
            $status.textContent = 'Saved.'
          }

          data.list[currentNoteId].content = $textarea.value
          browser.storage.sync.set({ list: data.list })
          _renderStatusDone()
          clearTimeout(saved_timeout)
          _render()
          saved_timeout = setTimeout(() => $status.classList.add('hide'), 3000)
        }, 250)
      })
      $textarea.focus()
    }

    const _createButtonEventHandler = () => {
      $create_entry.addEventListener('click', () => {
        currentNoteId = data.list.length
        data.list.push(_emptyNote())
        browser.storage.sync.set({ list: data.list })

        _render()
      })
    }

    const _renderTheme = () => {
      if (data.mode == THEMES.night) {
        $textarea.classList.add('dark')
        $list.classList.add('dark')
      }
      else {
        $textarea.classList.remove('dark')
        $list.classList.remove('dark')
      }
    }

    const _themeSwitchHandler = () => {
      $mode_switcher.addEventListener('click', event => {
        $textarea.classList.toggle('dark')
        $list.classList.toggle('dark')

        data.mode = data.mode === THEMES.day ? THEMES.night : THEMES.day
        browser.storage.sync.set({ mode: data.mode })
        _renderTheme()
      })
    }

    const _multiTabHandler = () => {
      const loadLatestData = async updateTabInfo => {
        let currentTabInfo = await browser.tabs.getCurrent()

        if (typeof updateTabInfo === 'object') { // tab switch
          if (currentTabInfo.id !== updateTabInfo.tabId || currentTabInfo.windowId !== updateTabInfo.windowId) { return }
        }
        else { // window
          if (currentTabInfo.windowId !== updateTabInfo) { return }
        }

        data = await window.utils.loadPreference()
        _render()
      }
      browser.tabs.onActivated.addListener(loadLatestData)
      // XXX: Window event causing double click issue, should temporarily comment it when default open sidebar...
      browser.windows.onFocusChanged.addListener(loadLatestData)
    }

    const _initEventHandler = () => {
      _noteEventHandler()
      _createButtonEventHandler()
      _themeSwitchHandler()
      _multiTabHandler()
    }

    const init = async () => {
      data = await window.utils.loadPreference()
      console.log(data)

      if (data.list.length === 0) {
        data.list.push(_emptyNote())
      }

      _render()
      _renderTheme()
      _initEventHandler()
      _enableAnimation()
    }
    return {
      init: init
    }
  }
  window.addEventListener('load', () => {
    newtab_script().init()
  })
})()
