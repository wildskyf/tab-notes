;(() => {
    //add event listener to every input
    //save to storage
    //make sure every tab notes page gets updated when switching to that tab

    const settings_script = () => {
        const THEMES = {
            night: "night",
            day: "day"
        }
        $font_selector = document.querySelector("#font-selector")
        $export_button = document.querySelector("#export-button")
        $dark_mode_switch = document.querySelector("#dark-mode-toggle")

        let data = null

        const _fillSettings = () => {
            $dark_mode_switch.checked = data.mode == THEMES.night
        }

        const _fontSizeHandler = () => {
            $font_selector.addEventListener('click', event => {
                if ( event.target && event.target.matches("input[type='radio']") ) {
                    //data.fontSize = event.target.value
                    browser.storage.local.set({ font_size: data.fontSize })
                }
            })
        }

        const _darkModeSwitchHandler = () => {
            $dark_mode_switch.addEventListener('click', event => {
              $body.classList.toggle('dark')
              $textarea.classList.toggle('dark')
              $list.classList.toggle('dark')
      
              data.mode = data.mode === THEMES.day ? THEMES.night : THEMES.day
              browser.storage.local.set({ mode: data.mode })
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
              $textarea.classList.add('dark')
              $list.classList.add('dark')
            }
            else {
              $body.classList.remove('dark')
              $textarea.classList.remove('dark')
              $list.classList.remove('dark')
            }
        }

        const _initEventHandler = () => {
            _fontSizeHandler()
            _darkModeSwitchHandler()
            _exportButtonHandler()
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