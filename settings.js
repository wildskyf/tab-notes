; (() => {
  //add event listener to every input
  //save to storage
  //make sure every tab notes page gets updated when switching to that tab

  const settings_script = () => {
    const THEMES = {
      night: "night",
      day: "day"
    }
    const FONTS = {
      monospace: "monospace",
      roboto: "Roboto",
      robotomono: "Roboto Mono",
      lora: "Lora"
    }
    const FONTSIZE = {
      tiny: 8,
      small: 12,
      default: 18,
      large: 30,
      huge: 50
    }
    $font_selector = document.querySelector("#font-selector")
    $font_size_selector = document.querySelector("#font-size-selector")
    $export_button = document.querySelector("#export-button")
    $import_button = document.querySelector("#import-button")
    $clickable_links_switch = document.querySelector("#clickable-links-toggle")
    $dark_mode_switch = document.querySelector("#dark-mode-toggle")
    $follow_system_switch = document.querySelector("#follow-system-toggle")
    $dark_toggle_on_notes_switch = document.querySelector("#dark-toggle-on-notes-toggle")
    $credits_switch = document.querySelector("#credits-toggle")
    $body = document.querySelector("body")

    let data = null

    const _fillSettings = () => {
      _renderTheme()
        //newtab.css uses Roboto Mono at 18px until a font or size is chosen
        ; ($font_selector.querySelector("#" + Object.keys(FONTS).find(key => FONTS[key] === (data.font || FONTS.robotomono))) ?? {}).checked = true
        ; ($font_size_selector.querySelector("#" + Object.keys(FONTSIZE).find(key => FONTSIZE[key] === (data.fontsize || FONTSIZE.default))) ?? {}).checked = true
      $clickable_links_switch.checked = data.clickablelinks
      $dark_toggle_on_notes_switch.checked = data.darktoggleonnotes
      $credits_switch.checked = data.showcredits
    }

    const _fontHandler = () => {
      ; ($font_selector ?? { addEventListener: () => { } }).addEventListener('click', event => {
        if (event.target && event.target.matches("input[type='radio']")) {
          data.font = FONTS[event.target.value]
          browser.storage.local.set({ font: data.font })
        }
      })
    }

    const _fontSizeHandler = () => {
      $font_size_selector.addEventListener('click', event => {
        if (event.target && event.target.matches("input[type='radio']")) {
          data.fontsize = FONTSIZE[event.target.value]
          browser.storage.local.set({ fontsize: data.fontsize })
        }
      })
    }

    const _clickableLinksSwitchHandler = () => {
      $clickable_links_switch.addEventListener('click', event => {
        data.clickablelinks = data.clickablelinks === true ? false : true
        browser.storage.local.set({ clickablelinks: data.clickablelinks })
      })
    }

    const _darkModeSwitchHandler = () => {
      $dark_mode_switch.addEventListener('click', event => {
        //choosing a theme by hand stops following the system
        data.mode = window.utils.isDark(data) ? THEMES.day : THEMES.night
        data.followsystem = false
        browser.storage.local.set({ mode: data.mode, followsystem: data.followsystem })
        _renderTheme()
      })
    }

    const _followSystemSwitchHandler = () => {
      $follow_system_switch.addEventListener('click', event => {
        data.followsystem = $follow_system_switch.checked
        browser.storage.local.set({ followsystem: data.followsystem })
        _renderTheme()
      })
      window.utils.systemDarkMode.addEventListener('change', _renderTheme)
    }

    const _darkToggleOnNotesHandler = () => {
      $dark_toggle_on_notes_switch.addEventListener('click', event => {
        data.darktoggleonnotes = data.darktoggleonnotes === true ? false : true
        browser.storage.local.set({ darktoggleonnotes: data.darktoggleonnotes })
        _renderTheme()
      })
    }

    const _creditsSwitchHandler = () => {
      $credits_switch.addEventListener('click', event => {
        data.showcredits = data.showcredits === true ? false : true
        browser.storage.local.set({ showcredits: data.showcredits })
        _renderTheme()
      })
    }

    const _exportButtonHandler = () => {
      $export_button.addEventListener('click', event => {
        window.open('export.html');
      })
    }

    const _importButtonHandler = () => {
      $import_button.addEventListener('click', event => {
        window.open('import.html');
      })
    }

    const _renderTheme = () => {
      const dark = window.utils.isDark(data)
      $body.classList.toggle('dark', dark)
      $dark_mode_switch.checked = dark
      $follow_system_switch.checked = Boolean(data.followsystem)
    }

    const _multiTabHandler = () => {
      const loadLatestData = async updateTabInfo => {
        data = await window.utils.loadPreference()
        _renderTheme()
      }
      browser.tabs.onActivated.addListener(loadLatestData)
      // XXX: Window event causing double click issue, should temporarily comment it when default open sidebar...
      browser.windows.onFocusChanged.addListener(loadLatestData)
    }

    const _initEventHandler = () => {
      _fontHandler()
      _fontSizeHandler()
      _clickableLinksSwitchHandler()
      _darkModeSwitchHandler()
      _followSystemSwitchHandler()
      _darkToggleOnNotesHandler()
      _creditsSwitchHandler()
      _exportButtonHandler()
      _importButtonHandler()
      _multiTabHandler()
    }
    const init = async () => {
      data = await window.utils.loadPreference()

      _initEventHandler()
      _fillSettings()
      setTimeout(() => { $body.style.transitionDuration = ".3s" }, 300)
    }
    return {
      init: init
    }
  }
  window.addEventListener('load', () => {
    settings_script().init()
  })
})()
