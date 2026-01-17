(function () {
  "use strict";

  var timer = setInterval(function () {
    if (typeof Lampa !== "undefined") {
      clearInterval(timer);

      Lampa.Utils.putScriptAsync(
        [
          "https://bdvburik.github.io/ts.js",
          "https://bdvburik.github.io/labelse.js",
          "https://bdvburik.github.io/sub.js",
          "https://bdvburik.github.io/kp_rating.js",
          "https://bdvburik.github.io/title.js",
          "https://bdvburik.github.io/rezkacomment.js",
          "https://bdvburik.github.io/ads.js",
          "https://bdvburik.github.io/rembutt.js",
          "https://bdvburik.github.io/pubtorr.js",
          "https://bdvburik.github.io/store.js",

          "https://skaztv.online/js/tricks.js",

          "https://ipavlin98.github.io/lmp-series-skip-db/series-skip.js",
          "https://ipavlin98.github.io/lmp-plugins/anime-skip.js",
          "https://ipavlin98.github.io/lmp-plugins/season-fix.js",

          "https://igorek1986.github.io/lampa-plugins/myshows.js",

          "http://bwa.to/oeogfeb",

          "https://bywolf88.github.io/lampa-plugins/interface_mod.js",

          "https://icantrytodo.github.io/lampa/torrent_styles_v2.js",
          "https://darkestclouds.github.io/plugins/easytorrent/easytorrent.min.js",
          "https://and7ey.github.io/lampa/head_filter.js",

          "https://lampame.github.io/main/bo.js",
        ],
        function () {},
      );
    }
  }, 200);
})();
