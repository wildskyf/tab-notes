;(() => {
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
        $dark_mode_switch = document.querySelector("#dark-mode-toggle")
		$dark_toggle_on_notes_switch = document.querySelector("#dark-toggle-on-notes-toggle")
		$credits_switch = document.querySelector("#credits-toggle")
        $body = document.querySelector("body")

        let data = null

        const _fillSettings = () => {
            _renderTheme()
			$font_selector.querySelector("#"+Object.keys(FONTS).find(key => FONTS[key] === data.font)).checked = true
			$font_size_selector.querySelector("#"+Object.keys(FONTSIZE).find(key => FONTSIZE[key] === data.fontsize)).checked = true
            $dark_mode_switch.checked = data.mode === THEMES.night
			$credits_switch.checked = data.showcredits
        }

        const _fontHandler = () => {
            $font_selector.addEventListener('click', event => {
                if ( event.target && event.target.matches("input[type='radio']") ) {
					data.font = FONTS[event.target.value]
                    browser.storage.local.set({ font: data.font })
                }
            })
        }
        
		const _fontSizeHandler = () => {
			$font_size_selector.addEventListener('click', event => {
				if ( event.target && event.target.matches("input[type='radio']") ) {
					data.fontsize = FONTSIZE[event.target.value]
                    browser.storage.local.set({ fontsize: data.fontsize })
                }
			})
		}

        const _darkModeSwitchHandler = () => {
            $dark_mode_switch.addEventListener('click', event => {
              $body.classList.toggle('dark')
              //$textarea.classList.toggle('dark')
              //$list.classList.toggle('dark')
      
              data.mode = data.mode === THEMES.day ? THEMES.night : THEMES.day
              browser.storage.local.set({ mode: data.mode })
              _renderTheme()
            })
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

        const _renderTheme = () => {
            if (data.mode == THEMES.night) {
              $body.classList.add('dark')
              //$textarea.classList.add('dark')
              //$list.classList.add('dark')
            }
            else {
              $body.classList.remove('dark')
              //$textarea.classList.remove('dark')
              //$list.classList.remove('dark')
            }
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
            _darkModeSwitchHandler()
			_darkToggleOnNotesHandler()
			_creditsSwitchHandler()
            _exportButtonHandler()
			_multiTabHandler()
        }
        const init = async () => {
            data = await window.utils.loadPreference()

            _initEventHandler()
            _fillSettings()
        }
        return {
            init: init
        }
    }
    window.addEventListener('load', () => {
        settings_script().init()
    })
})()