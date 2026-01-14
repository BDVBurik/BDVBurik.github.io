(function(){
    document.addEventListener("contextmenu", e => {
      e.preventDefault();
      window.history.back();
    });
})();
