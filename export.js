;(() => {
  const exportJs = () => {
    const init = async () => {
      const $textarea = document.querySelector('#export-content')
      const $copyBtn = document.querySelector('#copy-button')
	  const $saveBtn = document.querySelector('#save-button')
      const data = await window.utils.loadPreference()

      const notes = data.list
        .map(note => `${note.content}\n\n<<${note.time}>>\n\n`)
        .filter(c => c)
		.join('')

      $textarea.value = notes
	  
	  $copyBtn.addEventListener('click', async () => {
		try {
			await navigator.clipboard.writeText($textarea.value);
			console.log('Notes copied to clipboard');
		} catch (err) {
			alert('Failed to copy: ', err);
		}
	  })

	  $saveBtn.addEventListener('click', async () => {
		var userInput = $textarea.value;
			
		var blob = new Blob([userInput], { type: "text/plain;charset=utf-8" });

		let newLink = document.createElement("a");
		newLink.download = "export.txt";

		if (window.webkitURL != null) {
			newLink.href = window.webkitURL.createObjectURL(blob);
		} else {
			newLink.href = window.URL.createObjectURL(blob);
			newLink.style.display = "none";
			document.body.appendChild(newLink);
		}

		newLink.click();
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

