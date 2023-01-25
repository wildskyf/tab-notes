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
    const $textarea = document.querySelector('#note-content')
    const $list = document.querySelector('#list')
    const $mode_switcher = document.querySelector('#mode-switcher')
    const $setting_gear = document.querySelector('#setting-icon')
    const $status = document.querySelector('#status')
    const $create_entry = document.querySelector('#create_entry')
    const $undo_deletion = document.querySelector("#undo_deletion")

    let currentNoteId = 0
    let data = null
    let undostack = []

	$textarea.addEventListener("paste", function (event) {
		event.preventDefault();
		document.execCommand("inserttext", false, event.clipboardData.getData("text/plain"));
	})

    const _emptyNote = () => {
      const emptyNote = Object.create(null)
      emptyNote.content = ''
      emptyNote.time = (new Date()).getTime()
      return emptyNote
    }

    

    const _render = (rendernote) => {
      const _renderList = list => {
        const _makeTitleString = content => content.substr(0, 50).replace(/<.*?>/g, '').replace(/[^A-Za-z0-9 ]/g, '').substr(0, 10) || '<span class="empty-string">(EMPTY)</span>'
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

        $ul.querySelectorAll('li').forEach(function($li, index){
          $li.addEventListener('click', function(event){
            //console.log($textarea.innerText || $textarea.textContent)
            if (event.target.classList.contains('del')) {
              const currentNote = list[index]
              if (currentNote.content !== '') {
                const noteTitle = _makeTitleString(currentNote.content)
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
              //console.log("download");
              currentNoteId = index
              _render(true)
              const noteTitle = _makeTitleString(list[index].content)
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
      // auto saving and indicator
      let write_timeout, saved_timeout
      $textarea.addEventListener('keyup', () => {
        //if note didnt change
        if (data.list[currentNoteId].content === $textarea.innerHTML) { return }

        $status.classList.remove('hide')
        $status.textContent = 'Saving...'

        clearTimeout(write_timeout)
        write_timeout = setTimeout(() => {
          const _renderStatusDone = () => {
            $status.classList.remove('hide')
            $status.textContent = 'Saved.'
          }

          data.list[currentNoteId].content = $textarea.innerHTML
          data.list[currentNoteId].time = (new Date()).getTime()
          currentNoteId = 0
          browser.storage.local.set({ list: data.list })
          _renderStatusDone()
          clearTimeout(saved_timeout)
          //remove render, because I directly edit the innerHTML, and if it attempts to render, it'll reset the caret position
          //TODO: the sidebar does need to be rerendered
          _render(false);
        
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
