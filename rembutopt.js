(function () {
    'use strict';

    function removeOptionsButton() {
        var el = document.getElementsByClassName('button--options')[0];
        if (el) el.remove();
    }

    // ждём загрузку интерфейса Lampa

  if (window.appready) startPlugin();
  else
    Lampa.Listener.follow("app", (e) => {
      if (e.type === "ready") startPlugin();
    });
})();
