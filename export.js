;(() => {
  const exportJs = () => {
    const init = async () => {
      const $textarea = document.querySelector('#export-content')
      const $switchBtn = document.querySelector('#switch-button')
      const data = await window.utils.loadPreference()

      const notes = data.list
        .map(note => note.content)
        .filter(c => c)
        .join('\n\n--------------------\n\n')

      $textarea.value = notes

      $switchBtn.addEventListener('click', () => {
        const { currentAsk } = $switchBtn.dataset

        if (currentAsk === 'json') {
          $textarea.value = JSON.stringify(data, null, '  ')
          $switchBtn.dataset.currentAsk = 'text'
          $switchBtn.textContent = 'I need pure text.'
        }

        if (currentAsk === 'text') {
          $textarea.value = notes
          $switchBtn.dataset.currentAsk = 'json'
          $switchBtn.textContent = 'I need json file.'
        }
      })
    }

    return {
      init
    }
  }

  window.addEventListener('load', () => {
    exportJs().init()
  })
})()

