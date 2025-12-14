(function () {
  "use strict";
  // BDVBurik.github.io Title Plugin
  // 2025

  const storageKey = "title_cache";
  const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 дней
  let titleCache = Lampa.Storage.get(storageKey) || {};

  async function showTitles(card) {
    const orig = card.original_title || card.original_name;
    const alt = card.alternative_titles?.titles || [];

    // Транслитерация
    const translit =
      alt.find((t) => t.type === "Transliteration")?.title || orig;

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

    // Проверяем кэш TMDB
    const now = Date.now();
    const cacheItem = titleCache[card.id];
    if (cacheItem && now - cacheItem.timestamp < CACHE_TTL) {
      if (!ruAlt) ruAlt = cacheItem.ru;
      if (!ukAlt) ukAlt = cacheItem.uk;
      if (!enAlt) enAlt = cacheItem.en;
    }

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

        // Обновляем кэш
        titleCache[card.id] = {
          ru: ruAlt,
          uk: ukAlt,
          en: enAlt,
          timestamp: now,
        };
        Lampa.Storage.set(storageKey, titleCache);
      } catch (e) {
        console.error("TMDB get failed:", e);
      }
    }

    // Рендерим карточку
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

    // Формируем строки
    let lines = [];

    // Orig
    if (data.ORIG)
      lines.push(`<div style='font-size:1.3em;'>${data.ORIG} :OR</div>`);

    // Trans, показываем только если отличается от Orig
    if (data.TRANS && data.TRANS !== data.ORIG)
      lines.push(`<div style='font-size:1.3em;'>${data.TRANS} :TL</div>`);

    // EN
    if (
      data.EN &&
      data.EN !== data.ORIG &&
      Lampa.Storage.get("language") !== "en"
    )
      lines.push(`<div style='font-size:1.3em;'>${data.EN} :EN</div>`);

    // RU
    if (
      data.RU &&
      data.RU !== data.ORIG &&
      Lampa.Storage.get("language") !== "ru"
    )
      lines.push(`<div style='font-size:1.3em;'>${data.RU} :RU</div>`);

    // UK
    if (
      data.UK &&
      data.UK !== data.ORIG &&
      Lampa.Storage.get("language") !== "uk"
    )
      lines.push(`<div style='font-size:1.3em;'>${data.UK} :UK</div>`);

    // Вставляем в DOM
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

      // Очищаем старые
      const render = e.object.activity.render();
      $(".original_title", render).remove();

      // Сразу создаем контейнер
      $(".full-start-new__title", render).after(
        '<div class="original_title" style="margin-top:-0.8em;text-align:right;"><div></div></div>'
      );

      showTitles(card);
    });
  }

  startPlugin();
})();
