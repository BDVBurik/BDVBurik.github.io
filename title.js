(function () {
  //BDVBurik 2024
  "use strict";

  async function titleOrigin(card) {
    var orig = card.original_title || card.original_name;
    var params = {
      id: card.id,
      url: "https://api.themoviedb.org/3/movie/",
      urlEnd: "&api_key=4ef0d7355d9ffb5151e987764708ce96",
    };

    if (card.first_air_date) {
      params.url = "https://api.themoviedb.org/3/tv/";
      params.urlEnd = "&api_key=4ef0d7355d9ffb5151e987764708ce96";
    }

    var getOptions = {
      method: "GET",
      headers: {
        accept: "application/json",
      },
    };

    async function getEnTitle() {
      var title;
      var ftc = await fetch(
        params.url + params.id + "?language=en-US" + params.urlEnd,
        getOptions
      )
        .then((response) => response.json())
        .then((e) => (title = e.title || e.name));

      return title;
    }
    async function getRuTitle() {
      var title;
      var ftc = await fetch(
        params.url + params.id + "?language=ru-RU" + params.urlEnd,
        getOptions
      )
        .then((response) => response.json())
        .then((e) => (title = e.title || e.name));
      return title;
    }

    var etEnTitle = await getEnTitle();
    var etRuTitle = await getRuTitle();
    _showEnTitle(etEnTitle);

    function _showEnTitle(data) {
      let ru = "";
      if (data) {
        var render = Lampa.Activity.active().activity.render();

        if (Lampa.Storage.get("language") != "ru") {
          ru =
            "<div style='font-size: 1.3em; height: auto;'>Ru:" +
            etRuTitle +
            "</div >";
        } else ru = "";
      }
      $(".original_title", render)
        .find("> div")
        .eq(0)
        .after(
          `<div id='titleen'><div><div style='font-size: 1.3em; height: auto; '>En: 
              ${data} </div>${ru}
              <div style='font-size: 1.3em; height: auto; '> Orig: 
                ${card.original_title || card.original_name} 
              </div></div></div>`
        );
    }
  }

  function startPlugin() {
    window.title_plugin = true;
    Lampa.Listener.follow("full", function (e) {
      if (e.type == "complite") {
        var render = e.object.activity.render();
        $(".original_title", render).remove();
        $(".full-start-new__title", render).after(
          '<div class="original_title" style="  margin-top:-0.8em ; text-align: right;"><div>'
        );
        titleOrigin(e.data.movie);
        $(".full-start-new__rate-line").css("margin-bottom", "0.8em");
        $(".full-start-new__details").css("margin-bottom", "0.8em");
        $(".full-start-new__tagline").css("margin-bottom", "0.4em");
      }
    });
  }
  if (!window.title_plugin) startPlugin();
})();
