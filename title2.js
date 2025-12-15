(() => {
  // bdvburik.github.io plugin title.js
  // 2025
  //
  const storageKey = "title_cache",
    CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
  let titleCache = Lampa.Storage.get(storageKey) || {};

  async function showTitles(card) {
    const orig = card.original_title || card.original_name;
    const alt =
      card.alternative_titles?.titles || card.alternative_titles?.results || [];

    let translitObj = alt.find(
      (t) => t.type === "Transliteration" || t.type === "romaji"
    );
    let translit =
      translitObj?.title ||
      translitObj?.data?.title ||
      translitObj?.data?.name ||
      "";

    let ru = alt.find((t) => t.iso_3166_1 === "RU")?.title;
    let en = alt.find((t) => t.iso_3166_1 === "US")?.title;

    const now = Date.now();
    const cache = titleCache[card.id];
    if (cache && now - cache.timestamp < CACHE_TTL) {
      ru ||= cache.ru;
      en ||= cache.en;
    }

    if (!ru || !en || !translit) {
      try {
        const type = card.first_air_date ? "tv" : "movie";
        const data = await new Promise((res, rej) =>
          Lampa.Api.sources.tmdb.get(
            `${type}/${card.id}?append_to_response=translations`,
            {},
            res,
            rej
          )
        );
        console.log(data);
        const tr = data.translations?.translations || [];

        const translitData = tr.find(
          (t) => t.type === "Transliteration" || t.type === "romaji"
        );
        translit =
          translitData?.title ||
          translitData?.data?.title ||
          translitData?.data?.name ||
          translit;
        ru ||=
          tr.find((t) => t.iso_3166_1 === "RU" || t.iso_639_1 === "ru")?.data
            ?.title ||
          tr.find((t) => t.iso_3166_1 === "RU" || t.iso_639_1 === "ru")?.data
            ?.name;
        en ||=
          tr.find((t) => t.iso_3166_1 === "US" || t.iso_639_1 === "en")?.data
            ?.title ||
          tr.find((t) => t.iso_3166_1 === "US" || t.iso_639_1 === "en")?.data
            ?.name;

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
        translit && translit !== orig && translit !== en
          ? `<div style='font-size:1.3em;'>${translit}: TL</div>`
          : "";

    $(".full-start-new__title", render).after(
      `<div class="original_title" style="margin-top:-0.8em;text-align:right;">
         <div>
           <div style='font-size:1.3em;'>${orig}: Orig</div>
           ${tlHtml}${enHtml}${ruHtml}
         </div>
       </div>`
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
