(function () {
  "use strict";
  // BDVBurik.github.io Title Plugin + ShowTitles integration
  // 2025

  const storageKey = "title_cache"; // ключ в Lampa.Storage
  const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 дней
  let titleCache = Lampa.Storage.get(storageKey) || {};

  async function showTitles(card) {
    var orig = card.original_title || card.original_name;
    var alt = card.alternative_titles?.titles || [];

    // Транслитерация
    var translit = alt.find((t) => t.type === "Transliteration")?.title || orig;

    // Альтернативные переводы
    var ruAlt = alt.find(
      (t) => t.iso_3166_1 === "RU" || t.iso_639_1 === "ru"
    )?.title;
    var ukAlt = alt.find(
      (t) => t.iso_3166_1 === "UA" || t.iso_639_1 === "uk"
    )?.title;
    var enAlt =
      alt.find((t) => t.iso_3166_1 === "US" || t.iso_639_1 === "en")?.title ||
      alt.find((t) => t.iso_3166_1 === "EN")?.title;

    // Ключ кэша
    const now = Date.now();
    const cacheItem = titleCache[card.id];

    // Если есть свежий кэш — используем его
    if (cacheItem && now - cacheItem.timestamp < CACHE_TTL) {
      _renderTitle(cacheItem);
      return;
    }

    // Если чего-то нет — делаем запрос к TMDB
    if (!ruAlt || !ukAlt || !enAlt) {
      Lampa.Api.sources.tmdb.get(
        (card.first_air_date ? "tv" : "movie") +
          "/" +
          card.id +
          "?append_to_response=translations",
        {},
        function (data) {
          var translations = data.translations?.translations || [];

          if (!ruAlt)
            ruAlt = translations.find(
              (t) => t.iso_3166_1 === "RU" || t.iso_639_1 === "ru"
            )?.data.title;
          if (!ukAlt)
            ukAlt = translations.find(
              (t) => t.iso_3166_1 === "UA" || t.iso_639_1 === "uk"
            )?.data.title;
          if (!enAlt)
            enAlt =
              translations.find(
                (t) => t.iso_3166_1 === "US" || t.iso_639_1 === "en"
              )?.data.title ||
              translations.find((t) => t.iso_3166_1 === "EN")?.data.title;

          const result = {
            ORIG: orig,
            TRANS: translit,
            RU: ruAlt || "",
            UK: ukAlt || "",
            EN: enAlt || "",
          };

          // Сохраняем в кэш
          titleCache[card.id] = { ...result, timestamp: now };
          Lampa.Storage.set(storageKey, titleCache);

          _renderTitle(result);
        }
      );
    } else {
      _renderTitle({
        ORIG: orig,
        TRANS: translit,
        RU: ruAlt || "",
        UK: ukAlt || "",
        EN: enAlt || "",
      });
    }

    function _renderTitle(data) {
      const render = Lampa.Activity.active().activity.render();
      $(".original_title", render).remove();

      let ruHtml =
        Lampa.Storage.get("language") !== "ru"
          ? `<div style='font-size:1.3em;'>RU: ${data.RU}</div>`
          : "";
      let ukHtml =
        Lampa.Storage.get("language") !== "uk"
          ? `<div style='font-size:1.3em;'>UK: ${data.UK}</div>`
          : "";

      $(".full-start-new__title", render).after(`
        <div class="original_title" style="margin-top:-0.8em;text-align:right;">
          <div>
            <div style='font-size:1.3em;'>En: ${data.EN}</div>
            ${ruHtml}
            ${ukHtml}
            <div style='font-size:1.3em;'>Orig: ${data.ORIG}</div>
            <div style='font-size:1.3em;'>Trans: ${data.TRANS}</div>
          </div>
        </div>
      `);
    }
  }

  function startPlugin() {
    window.title_plugin = true;
    Lampa.Listener.follow("full", function (e) {
      if (e.type === "complite") {
        const render = e.object.activity.render();
        $(".original_title", render).remove();
        $(".full-start-new__title", render).after(
          '<div class="original_title" style="margin-top:-0.8em;text-align:right;"><div>'
        );
        showTitles(e.data.movie);

        $(".full-start-new__rate-line").css("margin-bottom", "0.8em");
        $(".full-start-new__details").css("margin-bottom", "0.8em");
        $(".full-start-new__tagline").css("margin-bottom", "0.4em");
      }
    });
  }

  if (!window.title_plugin) startPlugin();
})();
