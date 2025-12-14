(function () {
  "use strict";

  async function showTitles(card) {
    const orig = card.original_title || card.original_name;
    const alt = card.alternative_titles?.titles || [];

    // Функция для поиска перевода в альтернативных названиях
    const findAlt = (langs) => {
      return langs
        .map(
          (l) => alt.find((t) => t.iso_3166_1 === l || t.iso_639_1 === l)?.title
        )
        .find(Boolean);
    };

    let translit = findAlt(["Transliteration"]) || orig;
    let ru = findAlt(["RU", "ru"]);
    let uk = findAlt(["UA", "uk"]);
    let en = findAlt(["US", "EN", "en"]);

    // Если чего-то нет — TMDB
    if (!ru || !uk || !en) {
      try {
        const type = card.first_air_date ? "tv" : "movie";
        const data = await new Promise((resolve, reject) => {
          Lampa.Api.sources.tmdb.get(
            type + "/" + card.id + "?append_to_response=translations",
            {},
            resolve,
            reject
          );
        });
        const translations = data.translations?.translations || [];

        const findTranslation = (langs) =>
          langs
            .map(
              (l) =>
                translations.find(
                  (t) => t.iso_3166_1 === l || t.iso_639_1 === l
                )?.data.title
            )
            .find(Boolean);

        if (!ru) ru = findTranslation(["RU", "ru"]);
        if (!uk) uk = findTranslation(["UA", "uk"]);
        if (!en) en = findTranslation(["US", "EN", "en"]);
      } catch (e) {
        console.error("TMDB get failed:", e);
      }
    }

    renderTitles({ ORIG: orig, TRANS: translit, RU: ru, UK: uk, EN: en });
  }

  function renderTitles(data) {
    const render = Lampa.Activity.active().activity.render();
    if (!render) return;
    $(".original_title", render).remove();

    const language = Lampa.Storage.get("language");
    const lines = [];

    // Формируем строки по объекту
    const map = { OR: "ORIG", TL: "TRANS", EN: "EN", RU: "RU", UK: "UK" };
    for (let key in map) {
      const val = data[map[key]];
      if (!val) continue;
      if (
        (key === "TRANS" || key === "EN" || key === "RU" || key === "UK") &&
        val === data.ORIG
      )
        continue;
      if (
        (key === "EN" && language === "en") ||
        (key === "RU" && language === "ru") ||
        (key === "UK" && language === "uk")
      )
        continue;
      lines.push(`<div style='font-size:1.3em;'>${val} :${key}</div>`);
    }

    $(".full-start-new__title", render).after(`
      <div class="original_title" style="margin-top:-0.8em;text-align:right;">
        <div>${lines.join("")}</div>
      </div>
    `);
  }

  function startPlugin() {
    if (window.title_plugin) return;
    window.title_plugin = true;

    Lampa.Listener.follow("full", function (e) {
      if (e.type !== "complite") return;
      const card = e.data.movie;
      if (!card) return;
      const render = e.object.activity.render();
      $(".original_title", render).remove();
      $(".full-start-new__title", render).after(
        '<div class="original_title" style="margin-top:-0.8em;text-align:right;"><div></div></div>'
      );
      showTitles(card);
    });
  }

  startPlugin();
})();
