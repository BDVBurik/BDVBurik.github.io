(function () {
  "use strict";

  // Проверка наличия иероглифов (CJK: китайские, японские, корейские)
  function hasCJK(text) {
    return /[\u4E00-\u9FFF\uAC00-\uD7AF\u3040-\u30FF]/.test(text);
  }

  function showTitles(card) {
    var orig = card.original_title || card.original_name;
    var alt = card.alternative_titles?.titles || [];

    // Транслитерация — только если в оригинале есть иероглифы
    var translit = hasCJK(orig)
      ? alt.find((t) => t.type === "Transliteration")?.title
      : "";

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

          renderTitles(orig, translit, ruAlt, ukAlt, enAlt);
        }
      );
    } else {
      renderTitles(orig, translit, ruAlt, ukAlt, enAlt);
    }
  }

  function renderTitles(orig, translit, ru, uk, en) {
    console.table({
      ORIG: orig,
      TRANS: translit,
      RU: ru || "",
      UK: uk || "",
      EN: en || "",
    });

    const render = Lampa.Activity.active().activity.render();
    $(".original_title", render).remove();
    $(".full-start-new__title", render).after(`
      <div class="original_title" style="margin-top:-0.8em;text-align:right;">
        <div>
          ${
            translit
              ? `<div style="font-size:1.3em;">Trans: ${translit}</div>`
              : ""
          }
          ${en ? `<div style="font-size:1.3em;">En: ${en}</div>` : ""}
          ${ru ? `<div style="font-size:1.3em;">RU: ${ru}</div>` : ""}
          ${uk ? `<div style="font-size:1.3em;">UK: ${uk}</div>` : ""}
          <div style="font-size:1.3em;">Orig: ${orig}</div>
        </div>
      </div>
    `);
  }

  // Использование
  var card = Lampa.Activity.active().card;
  if (card) showTitles(card);

  Lampa.Listener.follow("full", function (e) {
    if (e.type === "complite") showTitles(e.data.movie);
  });
})();
