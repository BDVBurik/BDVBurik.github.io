(function () {
  "use strict";
  //Lampa. LGBT plugin
  window.lampa_settings.disable_features.lgbt = true;
  var timer = setInterval(function () {
    if (typeof Lampa !== "undefined") {
      clearInterval(timer);

      Lampa.Utils.putScriptAsync(
        ["http://lampalampa.free.nf/uacoments.js",
          //"https://bdvburik.github.io/syncpro.js", //сінхолнізація
          "http://wtch.ch/m", //хз что
          "http://bwa.ad/rc",
         "https://bdvburik.github.io/noshots.js",
          "https://bdvburik.github.io/ts.js",
          //"https://bdvburik.github.io/labelse.js",
          //"https://bdvburik.github.io/sub.js",
          "https://bdvburik.github.io/keys/kinopoisk.js",
          "https://bdvburik.github.io/card_overlay.js",
          "https://bdvburik.github.io/kprating.js",
          "https://bdvburik.github.io/title.js",
          "https://bdvburik.github.io/rezkacomment.js",
          "https://bdvburik.github.io/adss.js",
          "https://bdvburik.github.io/rembutt.js",
          "https://bdvburik.github.io/pubtorr.js",
          "https://bdvburik.github.io/store.js",
          "https://bdvburik.github.io/franshrezka.js",
          "https://bdvburik.github.io/head_filter.js",

          "https://skaztv.online/js/tricks.js",

          "https://lampame.github.io/main/trakttv.js",

          "https://lampame.github.io/main/hikka.js",
          "https://lampame.github.io/main/cw.js",
          "https://lampame.github.io/main/newcategory.js",

          "https://icantrytodo.github.io/lampa/torrent_styles_v2.js",
          "https://darkestclouds.github.io/plugins/easytorrent/easytorrent.min.js",


          "https://lampame.github.io/main/bo.js",
          "https://igorek1986.github.io/lampa-plugins/myshows.js",
          "http://lampaua.mooo.com/remotekeyboard.js"
        ],
        function () { },
      );
    }
  }, 200);
})();
