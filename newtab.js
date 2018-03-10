const VERSION = 2;
const theme = {
  night: "night",
  day: "day"
};

window.onload = () => {
  var writeTimeout;
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

      // Check the theme
      if (data.mode == theme.night) {
        $textarea.classList.add('dark');
      }
      else {
        $textarea.classList.remove('dark');
      }

      // Update the page
      $textarea.value = data.content || "";
      $mode_switcher.dataset.current = data.mode || theme.day;
    });
  };

  var updateStorage = newData => browser.storage.sync.set({ content: newData });

  // when user writing
  $textarea.addEventListener('keyup', event => {
    clearTimeout(writeTimeout);
    writeTimeout = setTimeout(() => updateStorage(event.target.value), 300);
  });

  // day and night mode switcher
  $mode_switcher.addEventListener('click', event => {
    var reverseMode = $mode_switcher.dataset.current == theme.day ? theme.night : theme.day;
    $textarea.classList.toggle('dark');
    $mode_switcher.dataset.current = reverseMode;
    browser.storage.sync.set({ mode: reverseMode });
  });

  // re-init when actived window or tab changed
  browser.tabs.onActivated.addListener(initNote);
  browser.windows.onFocusChanged.addListener(initNote);

  initNote();
};
