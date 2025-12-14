(function () {
  "use strict";
  // BDVBurik.github.io Title Plugin
  // 2025

  function isCJK(text) {
    // Проверка на иероглифы (китайские, японские, корейские)
    return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(text);
  }

  async function showTitles(card) {
    const orig = card.original_title || card.original_name;
    const alt = card.alternative_titles?.titles || [];

    // Транслитерация (только для иероглифов)
    const translitAlt = alt.find((t) => t.type === "Transliteration")?.title;
    const translit = isCJK(orig) && translitAlt ? translitAlt : "";

    // Альтернативные переводы
    let ruAlt = alt.find(
      (t) => t.iso_3166_1 === "RU" || t.iso_639_1 === "ru"
    )?.title;
    let ukAlt = alt.find(
      (t) => t.iso_3166_1 === "UA" || t.iso_639_1 === "uk"
    )?.title;
    let enAlt =
      alt.find((t) => t.iso_3166_1 === "US" || t.iso_639_1 === "en")?.title ||
      alt.find((t) => t.iso_3166_1 === "EN")?.title;

    // Если чего-то нет — делаем запрос к TMDB
    if (!ruAlt || !ukAlt || !enAlt) {
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
      } catch (e) {
        console.error("TMDB get failed:", e);
      }
    }

    renderTitles(card, {
      ORIG: orig,
      TRANS: translit,
      RU: ruAlt,
      UK: ukAlt,
      EN: enAlt,
    });
  }

  function renderTitles(card, data) {
    const render = Lampa.Activity.active().activity.render();
    if (!render) return;

    $(".original_title", render).remove();

    const lines = [];

    if (data.ORIG)
      lines.push(`<div style='font-size:1.3em;'>${data.ORIG} :OR</div>`);
    if (data.TRANS)
      lines.push(`<div style='font-size:1.3em;'>${data.TRANS} :TL</div>`);
    if (data.EN && Lampa.Storage.get("language") !== "en")
      lines.push(`<div style='font-size:1.3em;'>${data.EN} :EN</div>`);
    if (data.RU && Lampa.Storage.get("language") !== "ru")
      lines.push(`<div style='font-size:1.3em;'>${data.RU} :RU</div>`);
    if (data.UK && Lampa.Storage.get("language") !== "uk")
      lines.push(`<div style='font-size:1.3em;'>${data.UK} :UK</div>`);

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
