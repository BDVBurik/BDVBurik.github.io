(() => {
  const storageKey = "title_cache",
    CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
  let titleCache = Lampa.Storage.get(storageKey) || {};

  async function showTitles(card) {
    const orig = card.original_title || card.original_name,
      alt =
        card.alternative_titles?.titles ||
        card.alternative_titles?.results ||
        [],
      translit = alt.find((t) => t.type === "Transliteration")?.title || orig;

    let ru = alt.find((t) => t.iso_3166_1 === "RU")?.title,
      en = alt.find((t) => t.iso_3166_1 === "US")?.title;

    const now = Date.now(),
      cache = titleCache[card.id];
    if (cache && now - cache.timestamp < CACHE_TTL) {
      ru ||= cache.ru;
      en ||= cache.en;
    }

    if (!ru || !en) {
      try {
        const type = card.first_air_date ? "tv" : "movie",
          data = await new Promise((res, rej) =>
            Lampa.Api.sources.tmdb.get(
              type + "/" + card.id + "?append_to_response=translations",
              {},
              res,
              rej
            )
          ),
          tr = data.translations?.translations || [];
        ru ||= tr.find((t) => t.iso_3166_1 === "RU" || t.iso_639_1 === "ru")
          ?.data.title;
        en ||= tr.find((t) => t.iso_3166_1 === "US" || t.iso_639_1 === "en")
          ?.data.title;
        titleCache[card.id] = { ru, en, timestamp: now };
        Lampa.Storage.set(storageKey, titleCache);
      } catch (e) {
        console.error(e);
      }
    }

    const render = Lampa.Activity.active().activity.render();
    if (!render) return;
    $(".original_title", render).remove();
    const lang = Lampa.Storage.get("language"),
      ruHtml =
        ru && lang !== "ru"
          ? `<div style='font-size:1.3em;'>${ru}: RU</div>`
          : "",
      enHtml =
        en && lang !== "en" && en !== orig
          ? `<div style='font-size:1.3em;'>${en}: EN</div>`
          : "",
      tlHtml =
        translit !== orig && translit !== en
          ? `<div style='font-size:1.3em;'>${translit}: TL</div>`
          : "";

    $(".full-start-new__title", render).after(
      `<div class="original_title" style="margin-top:-0.8em;text-align:right;"><div><div style='font-size:1.3em;'>${orig}: Orig</div>${tlHtml}${enHtml}${ruHtml}</div></div>`
    );
  }

  if (!window.title_plugin) {
    window.title_plugin = true;
    Lampa.Listener.follow("full", (e) => {
      if (e.type !== "complite" || !e.data.movie) return;
      $(".original_title", e.object.activity.render()).remove();
      $(".full-start-new__title", e.object.activity.render()).after(
        '<div class="original_title" style="margin-top:-0.8em;text-align:right;"><div></div></div>'
      );
      showTitles(e.data.movie);
    });
  }
})();
