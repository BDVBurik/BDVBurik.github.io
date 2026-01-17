(function () {
    'use strict';

    function removeviewtrailer() {
        document.getElementsByClassName('view--trailer')[0]remove();
    }
        function removeshots() {
        document.getElementsByClassName('shots-view-button')[0]remove();
    }


    // ждём загрузку интерфейса Lampa

      Lampa.Listener.follow("full", (e) => {
        if (e.type !== "complite" || !e.data.movie) return;
        removeviewtrailer();
          removeshots();
      });
 
})();
