var VERSION = 2;

window.onload = () => {
  var $textarea = document.querySelector('#note-content');
  var $mode_switcher = document.querySelector('#mode-switcher');

  var initNote = () => {
    browser.storage.sync.get().then( data => {

      if (data.version === undefined) {
        data = {
          version: VERSION,
          content: '',
          mode: 'day'
        };
        browser.storage.sync.set(data);
      }
      else if (data.version === 1) {
        browser.storage.sync.set({
          version: VERSION,
          mode: 'day'
        });
      }

      $textarea.value = data.content;
    });

    // Mode
    browser.storage.sync.get().then( data => {
      $mode_switcher.dataset.current = data.mode || "day";
      if (data.mode == "night") {
        $textarea.classList.add('dark');
      }
      else {
        $textarea.classList.remove('dark');
      }
    });
  };
  initNote();

  // when user writing
  $textarea.addEventListener('keyup', event => {
    browser.storage.sync.set({ content: event.target.value });
  });

  // when actived window or tab changed
  browser.tabs.onActivated.addListener(initNote);
  browser.windows.onFocusChanged.addListener(initNote);

  // day and night mode switcher
  $mode_switcher.addEventListener('click', event => {
    var isDay = $mode_switcher.dataset.current == 'day';
    $mode_switcher.dataset.current = isDay ? 'night' : 'day';
    $textarea.classList.toggle('dark');
    browser.storage.sync.set({ mode: isDay ? 'night' : 'day' });
  });
};

