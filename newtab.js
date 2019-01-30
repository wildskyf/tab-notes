const VERSION = 2;
const theme = {
  night: "night",
  day: "day"
};

window.onload = () => {
  console.log(browser);
  var write_timeout, saved_timeout;
  var $textarea = document.querySelector('#note-content');
  var $mode_switcher = document.querySelector('#mode-switcher');
  var $status = document.querySelector('#status');

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

  var updateStorage = newData => {
    browser.storage.sync.set({ content: newData });
    $status.classList.remove('hide');
    $status.textContent = 'Saved.';
    clearTimeout(saved_timeout);
    write_timeout = setTimeout(() => $status.classList.add('hide'), 3000);
  };

  // when user writing
  $textarea.addEventListener('keyup', event => {
    $status.classList.remove('hide');
    $status.textContent = 'Saving...'
    clearTimeout(write_timeout);
    write_timeout = setTimeout(() => updateStorage(event.target.value), 250);
  });

  // day and night mode switcher
  $mode_switcher.addEventListener('click', event => {
    var reverseMode = $mode_switcher.dataset.current == theme.day ? theme.night : theme.day;
    $textarea.classList.toggle('dark');
    $mode_switcher.dataset.current = reverseMode;
    browser.storage.sync.set({ mode: reverseMode });
  });

  window.addEventListener('keypress', e => {
    if (!(e.which == 115 && (e.ctrlKey || e.metaKey)) && !(e.which == 19)) return;
    e.preventDefault();
    clearTimeout(write_timeout);
    updateStorage(event.target.value)
  });

  // re-init when actived window or tab changed
  browser.tabs.onActivated.addListener(initNote);
  browser.windows.onFocusChanged.addListener(initNote);

  initNote();
};
