(function () {
    'use strict';

    function removeviewtrailer() {
    

                document.querySelectorAll('[class*="view--trailer"]').forEach(el => {
    el.classList.add('hide');
    }
        function removeshots() {
        document.querySelectorAll('[class*="shots-view-button"]').forEach(el => {
    el.classList.add('hide');
});

    }


    // ждём загрузку интерфейса Lampa

      Lampa.Listener.follow("full", (e) => {
        if (e.type !== "complite" || !e.data.movie) return;
        removeviewtrailer();
          removeshots();
      });
 
})();
