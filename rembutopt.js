(function () {
    'use strict';

    function removeOptionsButton() {
        var el = document.getElementsByClassName('button--options')[0];
        if (el) el.remove();
    }

    // ждём загрузку интерфейса Lampa

      Lampa.Listener.follow("full", (e) => {
        if (e.type !== "complite" || !e.data.movie) return;
        removeOptionsButton();
      });
 
})();
