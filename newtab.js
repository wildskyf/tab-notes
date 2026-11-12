; (() => {

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
    const $textarea = document.querySelector('#note-content')
    const $list = document.querySelector('#list')
    const $mode_switcher = document.querySelector('#mode-switcher')
    const $setting_gear = document.querySelector('#setting-icon')
    const $credits_button = document.querySelector("#addon-author")
    const $status = document.querySelector('#status')
    const $create_entry = document.querySelector('#create_entry')
    const $undo_deletion = document.querySelector("#undo_deletion")

    let currentNoteId = 0
    let data = null
    let undostack = []

    let hide_timeout = null

    //paste text in plaintext, still allow pasting images
    $textarea.addEventListener("paste", function (event) {
      if (event.clipboardData.getData("text/plain") !== "") {
        event.preventDefault();
        document.execCommand("inserttext", false, event.clipboardData.getData("text/plain"));
      }
    })

    //click links with ctrl+click
    $textarea.addEventListener("click", function (event) {
      if (data.clickablelinks && event.ctrlKey) {
        var link = clickedword()
        try {
          url = new URL(link);
          window.open(url)
        } catch (_) {
          console.log(link + " is an invalid link.")
        }
      }
    })

    function clickedword() {
      var sel = document.getSelection();
      sel.modify("extend", "backward", "paragraphboundary");
      var pos = sel.toString().length;
      if (sel.anchorNode != undefined) sel.collapseToEnd();
      var fullstr = sel.focusNode.textContent
      return fullstr.substring(fullstr.lastIndexOf(' ', pos) + 1, fullstr.indexOf(' ', pos) >= pos ? fullstr.indexOf(' ', pos) : fullstr.length)
    }

    const _emptyNote = () => {
      const emptyNote = Object.create(null)
      emptyNote.content = ''
      emptyNote.time = (new Date()).getTime()
      return emptyNote
    }

    //plain-text title: the first letters and digits of the note in any script, with tags and entities removed
    const _noteTitle = content => {
      const text = content.replace(/<[^>]*>/g, ' ').slice(0, 200)
      //DOMParser decodes entities like &nbsp; without loading images or running scripts
      const decoded = new DOMParser().parseFromString(text, 'text/html').body.textContent
      return decoded.replace(/\s+/g, ' ').replace(/[^\p{L}\p{N} ]/gu, '').trim().substr(0, 10)
    }

    const _render = (rendernote) => {
      $body.style.backgroundColor = "#ffffff"
      const _renderList = list => {
        const _makeTitleString = content => _noteTitle(content) || '<span class="empty-string">(EMPTY)</span>'
        const $ul = document.querySelector('ul')

        $ul.innerHTML = list.sort((a, b) => b.time - a.time).map((item, index) => {
          let title = _makeTitleString(item.content)
          let className = index === currentNoteId ? 'current' : ''
          return `<li class="${className}" data-id="${index}"><span>${title}<div class='del'>+</div><div class='dnld'><img class="dnldimg" src="./dnld.png" alt="Download"></div></span></li>`
        }).join('')

        if (undostack.length > 0) {
          $undo_deletion.style.display = "block"
        } else {
          $undo_deletion.style.display = "none"
        }

        $ul.querySelectorAll('li').forEach(function ($li, index) {
          $li.addEventListener('click', function (event) {
            //console.log($textarea.innerText || $textarea.textContent)
            if (event.target.classList.contains('del')) {
              const currentNote = list[index]
              if (currentNote.content !== '') {
                const noteTitle = _noteTitle(currentNote.content) || '(EMPTY)'
                const deleteConfirmString = `Do you want to delete note: ${noteTitle}?`
                if (!confirm(deleteConfirmString)) { return }
              }
              //this code is responsible for deleting notes
              //if after deleting this note, the list of notes will be empty:
              if (index === 0 && data.list.length === 1) {
                undostack.push(data.list[index])
                data.list = [_emptyNote()]
              }
              //if after deleting this note, the list of notes is not empty:
              else {
                undostack.push(data.list[index])
                data.list = data.list.filter((note, i) => i !== index)
                if (currentNoteId >= data.list.length) {
                  currentNoteId = data.list.length - 1
                }
              }
              browser.storage.local.set({ list: data.list })

              _render(true)
              return
            }
            else if (event.target.classList.contains('dnld') || event.target.classList.contains('dnldimg')) {
              currentNoteId = index
              _render(true)
              const noteTitle = _noteTitle(list[index].content) || 'note'
              //const dbutton = $li.querySelector('.dnld');
              //console.log(dbutton);

              var userInput = $textarea.innerText;

              var blob = new Blob([userInput], { type: "text/plain;charset=utf-8" });

              let newLink = document.createElement("a");
              newLink.download = `${noteTitle}.txt`;

              if (window.webkitURL != null) {
                newLink.href = window.webkitURL.createObjectURL(blob);
              }
              else {
                newLink.href = window.URL.createObjectURL(blob);
                newLink.style.display = "none";
                document.body.appendChild(newLink);
              }

              newLink.click();
              return
            }

            if (currentNoteId === index) { return }
            currentNoteId = index
            _render(true)
          })
        })
      }

      const _renderNote = note => {
        $textarea.innerHTML = note.content || ''
        $textarea.focus()
      }

      _renderList(data.list)
      if (rendernote) {
        _renderNote(data.list[currentNoteId])
      }
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
      // auto saving and indicator; "input" also covers mouse paste, drag and drop, and undo from the menu
      let write_timeout
      $textarea.addEventListener('input', () => {
        //if note didnt change
        if (data.list[currentNoteId].content === $textarea.innerHTML) { return }

        $status.classList.remove('hide')
        $status.textContent = 'Saving...'

        clearTimeout(hide_timeout)
        clearTimeout(write_timeout)
        write_timeout = setTimeout(_saveNote, 250)
      })
      $textarea.focus()
    }

    const _saveNote = async () => {
      const edited = data.list[currentNoteId]
      const note = { content: $textarea.innerHTML, time: (new Date()).getTime() }
      //merge into the latest stored list, so notes saved meanwhile by another Tab Notes page are kept
      const { list = [] } = await browser.storage.local.get('list')
      const index = list.findIndex(n => n.time === edited.time)
      //if another page changed or deleted this note meanwhile, keep both versions
      if (index >= 0) { list[index] = note } else { list.unshift(note) }
      data.list = list.sort((a, b) => b.time - a.time)
      currentNoteId = 0
      await browser.storage.local.set({ list: data.list })

      $status.textContent = 'Saved.'
      clearTimeout(hide_timeout)
      _render(false)
      hide_timeout = setTimeout(() => $status.classList.add('hide'), 3000)
    }

    //another Tab Notes page (a tab or the toolbar popup) saved, so show its changes here
    const _storageChangeHandler = () => {
      const signature = list => list.map(note => `${note.time}:${note.content.length}`).join()
      browser.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes.list || !changes.list.newValue) { return }
        const list = changes.list.newValue
        //this page's own save
        if (signature(list) === signature(data.list)) { return }

        const current = data.list[currentNoteId]
        const unsaved = Boolean(current) && $textarea.innerHTML !== current.content
        //keep the note being typed even if the other page changed or deleted it; the next save adds it back
        if (unsaved && !list.some(note => note.time === current.time)) { list.push(current) }
        //sort before looking up the index, since rendering sorts the list too
        data.list = list.sort((a, b) => b.time - a.time)
        currentNoteId = current ? Math.max(data.list.findIndex(note => note.time === current.time), 0) : 0
        //leave the editor alone while typing; otherwise show the latest content
        _render(!unsaved)
      })
    }

    const _createButtonEventHandler = () => {
      $create_entry.addEventListener('click', () => {
        currentNoteId = 0
        data.list = [_emptyNote(), ...data.list]
        browser.storage.local.set({ list: data.list })

        _render(true)
      })
    }

    const _undoButtonEventHandler = () => {
      $undo_deletion.addEventListener('click', () => {
        if (undostack.length > 0) {
          data.list = [...data.list, undostack.pop()]
          browser.storage.local.set({ list: data.list })

          _render(true)
        } else {
          alert("Nothing to undo.")
        }
      })
    }

    const _renderTheme = () => {
      //font and font size stay unset until chosen in settings, so fall back to the stylesheet instead of "undefined"
      $textarea.style.fontFamily = data.font || ''
      $textarea.style.fontSize = data.fontsize ? data.fontsize + "px" : ''
      $textarea.style.lineHeight = data.fontsize ? data.fontsize * 1.5 + "px" : ''
      if (data.mode == THEMES.night) {
        $body.classList.add('dark')
        $textarea.classList.add('dark')
        $list.classList.add('dark')
        $setting_gear.classList.add('dark')
      }
      else {
        $body.classList.remove('dark')
        $textarea.classList.remove('dark')
        $list.classList.remove('dark')
        $setting_gear.classList.remove('dark')
      }
      $mode_switcher.hidden = !data.darktoggleonnotes
      $credits_button.hidden = !data.showcredits
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

    const _settingHandler = () => {
      $setting_gear.addEventListener('click', event => {
        window.open('settings.html')
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
        _render(true)
        _renderTheme()
      }
      browser.tabs.onActivated.addListener(loadLatestData)
      // XXX: Window event causing double click issue, should temporarily comment it when default open sidebar...
      browser.windows.onFocusChanged.addListener(loadLatestData)
    }

    const _initEventHandler = () => {
      _noteEventHandler()
      _storageChangeHandler()
      _createButtonEventHandler()
      _undoButtonEventHandler()
      _themeSwitchHandler()
      _settingHandler()
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
      //GitHub sync was removed in 4.0.4, so drop the token and sync state it left behind
      browser.storage.local.remove(['map', 'gistid', 'offline'])
      //render instantly so screen doesn't stay white
      _render(true)
      _renderAnnoucement()
      _render(true)
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
