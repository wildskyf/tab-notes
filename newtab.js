;(() => {
  // FIXME: Should use uuid instead of index as key for storage
  /** DB
    * {
    *   version: <number>,
    *   mode: <string>
    *   list: [{
    *       content: <string>
    *       time: <number>
    *   }]
    * }
    **/

  const newtab_script = () => {
    const THEMES = {
      night: "night",
      day: "day"
    }
    const $body = document.querySelector('body')
    const $textarea = document.querySelector('textarea')
    const $list = document.querySelector('#list')
    const $mode_switcher = document.querySelector('#mode-switcher')
    const $status = document.querySelector('#status')
    const $create_entry = document.querySelector('#create_entry')

    let currentNoteId = 0
    let data = null

    const _emptyNote = () => {
      const emptyNote = Object.create(null)
      emptyNote.content = ''
      emptyNote.time = (new Date()).getTime()
      return emptyNote
    }

    const _render = () => {
      const _renderList = list => {
        const _makeTitleString = (content) => content.split("\n")[0].substr(0,20) || "New Note";
        const $ul = document.querySelector('ul')

        $ul.innerHTML = list.sort((a, b) => b.time - a.time).map((item, index) => {
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
                const deleteConfirmString = `Are you sure you want to delete \`${noteTitle}\`?\nThis action cannot be undone.`
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

              browser.storage.local.set({ list: data.list })

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
        if (data.list[currentNoteId].content === $textarea.value) { return }

        $status.classList.remove('hide')
        $status.textContent = 'Saving...'

        clearTimeout(write_timeout)
        write_timeout = setTimeout(() => {
          const _renderStatusDone = () => {
            $status.classList.remove('hide')
            $status.textContent = 'Saved!'
          }

          data.list[currentNoteId].content = $textarea.value
          data.list[currentNoteId].time = (new Date()).getTime()
          currentNoteId = 0
          browser.storage.local.set({ list: data.list })
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
        currentNoteId = 0
        data.list = [_emptyNote(), ...data.list]
        browser.storage.local.set({ list: data.list })

        _render()
      })
    }

    const _renderTheme = () => {
      if (data.mode == THEMES.night) {
        $body.classList.add('dark')
        $textarea.classList.add('dark')
        $list.classList.add('dark')
      }
      else {
        $body.classList.remove('dark')
        $textarea.classList.remove('dark')
        $list.classList.remove('dark')
      }
    }

    const _themeSwitchHandler = () => {
      $mode_switcher.addEventListener('click', event => {
        $body.classList.toggle('dark')
        $textarea.classList.toggle('dark')
        $list.classList.toggle('dark')

        data.mode = data.mode === THEMES.day ? THEMES.night : THEMES.day
        browser.storage.local.set({ mode: data.mode })
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

    const _renderAnnoucement = async () => {
      const syncRes = await browser.storage.sync.get()
      if (!syncRes.list && !syncRes.mode) { return } // not use the version using storage.sync

      // annoucement
      const $annoucement_container = document.querySelector('.annoucement-container')
      $annoucement_container.innerHTML = `
        <div id='annoucement'>
          Due to <a href='https://blog.mozilla.org/addons/2020/07/09/changes-to-storage-sync-in-firefox-79/' target='_blank'>Firefox WebExtension Storage API update</a>,
          the sync function between Firefox is not work anymore...
          <div class='btn'>So sad, I get it.</div>
        </div>
      `
      const $migrate_btn = $annoucement_container.querySelector('.btn')
      const migrateBtnOnClick = async () => {
        $migrate_btn.removeEventListener('click', migrateBtnOnClick)
        const before = await browser.storage.sync.get()
        const clearRes = await browser.storage.sync.clear()
        const after = await browser.storage.sync.get()
        $annoucement_container.remove()
      }

      $migrate_btn.addEventListener('click', migrateBtnOnClick)

    }

    const init = async () => {
      data = await window.utils.loadPreference()

      _renderAnnoucement()
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
