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
          " https://bdvburik.github.io/myshows.js",
        ],
        function () {},
      );
    }
  }, 200);
})();
