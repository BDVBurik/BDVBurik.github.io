(function () {
  "use strict";

 
  function removeshots() {
    document.querySelectorAll(".view--trailer")[0].classList.add("hide");
  }

  // ждём загрузку интерфейса Lampa

  Lampa.Listener.follow("full", (e) => {
    if (e.type !== "complite" || !e.data.movie) return;
   
    removeshots();
  });
})();
