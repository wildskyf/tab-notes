;(() => {
  const importJs = () => {
    const init = async () => {
      const $textarea = document.querySelector('#import-content')
      const $importBtn = document.querySelector('#import-button')
	  const data = await window.utils.loadPreference()

      $importBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to import these notes? All of your current notes will be replaced. This action cannot be undone.")) {
			console.log("replacing")
			var tmp = $textarea.value
				.split(/\n\n<<([0-9]+)>>\n\n/g)
				.slice(0, -1)
			var newnotes = []
			for (var i = 0; i < tmp.length; i += 2) {
				newnotes.push({content: tmp[i], time: parseInt(tmp[i+1])})
			}
			
			data.list = newnotes
			browser.storage.local.set({ list: data.list })
		}
      })
    }

    return {
      init
    }
  }

  window.addEventListener('load', () => {
    importJs().init()
  })
})()

