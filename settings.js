;(() => {
    //add event listener to every input
    //save to storage
    //make sure every tab notes page gets updated when switching to that tab
	//TODO: dark mode toggle on tab note page, and dark mode toggle in settings page can get desynced. The toggle on note page doesn't update the settings button.

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
        $font_selector =				document.querySelector("#font-selector")
		$font_size_selector =			document.querySelector("#font-size-selector")
        $export_button =				document.querySelector("#export-button")
		$import_button =				document.querySelector("#import-button")
		$clickable_links_switch = 		document.querySelector("#clickable-links-toggle")
        $dark_mode_switch =				document.querySelector("#dark-mode-toggle")
		$dark_toggle_on_notes_switch =	document.querySelector("#dark-toggle-on-notes-toggle")
		$credits_switch =				document.querySelector("#credits-toggle")
		$pat_textfield =				document.querySelector("#pat-field")
		$pat_update_button =			document.querySelector("#pat-update-button")
		$pat_help_button =				document.querySelector("#pat-help-button")
		$sync_status =					document.querySelector("#sync-status")
        $body =							document.querySelector("body")

        let data = null

        const _fillSettings = () => {
            _renderTheme()
			$font_selector.querySelector("#"+Object.keys(FONTS).find(key => FONTS[key] === data.font)).checked = true
			$font_size_selector.querySelector("#"+Object.keys(FONTSIZE).find(key => FONTSIZE[key] === data.fontsize)).checked = true
			$clickable_links_switch.checked = data.clickablelinks
			$dark_toggle_on_notes_switch.checked = data.darktoggleonnotes
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

		const _clickableLinksSwitchHandler = () => {
			$clickable_links_switch.addEventListener('click', event => {
				data.clickablelinks = data.clickablelinks === true ? false : true
				browser.storage.local.set({ clickablelinks: data.clickablelinks })
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

		const _importButtonHandler = () => {
			$import_button.addEventListener('click', event => {
				window.open('import.html');
			})
		}

		const _patUpdateButtonHandler = () => {
			$pat_update_button.addEventListener('click', async event => {
				if (confirm("This will save your GitHub personal access token in the browser's local storage. If a bad actor gets access to your PC e.g. by using a virus, they could access your personal access token. However, this data is safe from any website related attacks because it only exists purely locally on your PC.\n\nI'm not responsible for any damages that may occur. By clicking OK you confirm that you've read and accept these terms and conditions.")) {
					//I named it map instead of pat, so any malware that auto collects personal access tokens might have more difficulty finding the personal access token
					data.map = $pat_textfield.value
					browser.storage.local.set({ map: data.map })
					//check if user has tab-notes.html in their github gists
					fetch(`https://api.github.com/gists`, {
						method: "GET",
						headers: {
							Accept: "application/vnd.github+json",
							Authorization: `Bearer ${data.map}`
						},
					}).then(async response => {
						if (!response.ok) {
							return response.text().then(text => { throw new Error(text) })
						}
						return response.json()
					}).then(out => {
						//perhaps not very performant, but it works
						data.gistid = out.reduce((a, c) => a = Object.values(c.files)[0].filename == "tab-notes.html" ? c.id : a, undefined)
						browser.storage.local.set({ gistid: data.gistid })
						var notecontent
						if (data.gistid != undefined) {
							fetch(`https://api.github.com/gists/${data.gistid}`, {
								method: "GET",
								headers: {
									Accept: "application/vnd.github+json",
									//Authorization: `Bearer ${data.map}`
								}
							}).then(async response => {
								if (!response.ok) {
									return response.text().then(text => { throw new Error(text) })
								}
								return response.json()
							}).then(out => {
								notecontent = out.files["tab-notes.html"].content
								//all successful, now replacing current text with what's in the gist
								console.log(`Link to the gist content: https://api.github.com/gists/${data.gistid}`);
								if (confirm(`A gist named \"tab-notes.html\" was detected on your GitHub account. All of your notes will be replaced with the contents of this gist (a link to the gist content can be found in the devtools by pressing F12).\n\nPress OK if you want to continue.`)) {
									//replace notes content
									var tmp = notecontent.split(/\n\n<<([0-9]+)>>\n\n/g).slice(0, -1)
									var newnotes = []
									for (var i = 0; i < tmp.length; i += 2) {
										newnotes.push({content: tmp[i], time: parseInt(tmp[i+1])})
									}
									data.list = newnotes
									browser.storage.local.set({ list: data.list })
								}
							}).catch(error => {
								alert(`An error has occured. A \"tab-notes.html\" gist was found, but couldn't be loaded: ${error}`)
							})
						} else {
							alert("Couldn't find a \"tab-notes.html\" gist on your GitHub account. Please make one and fill it with your exported notes.")
						}
					}).catch(error => {
						alert(`An error has occured. The personal access token you entered might be incorrect: ${error}`)
					})
					_syncStatusHandler()
				}
			})
		}

		const _patHelpButtonHandler = () => {
			$pat_help_button.addEventListener('click', event => {
				alert("To sync extensions across multiple devices, generate a personal access token on GitHub with the \"gist\" scope, and enter this personal access token in the input field, then press update.")
			})
		}

		const _syncStatusHandler = () => {
			if (data.map != undefined) {
				fetch(`https://api.github.com/gists`, {
					method: "GET",
					headers: {
						Accept: "application/vnd.github+json",
						Authorization: `Bearer ${data.map}`
					},
				}).then(async response => {
					if (!response.ok) {
						return response.text().then(text => { throw new Error(text) })
					}
					$sync_status.innerHTML = "Sync status: synced successfully"
				}).catch(error => {
					$sync_status.innerHTML = "Sync status: not synced"
				})
			} else {
				$sync_status.innerHTML = "Sync status: not synced"
			}
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
			_clickableLinksSwitchHandler()
            _darkModeSwitchHandler()
			_darkToggleOnNotesHandler()
			_creditsSwitchHandler()
            _exportButtonHandler()
			_importButtonHandler()
			_syncStatusHandler()
			_patUpdateButtonHandler()
			_patHelpButtonHandler()
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