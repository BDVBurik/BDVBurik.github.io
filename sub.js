(function () {
  const OSV3 = "https://opensubtitles-v3.strem.io/";
  const log = (...a) => console.log("[OpenSubs]", ...a);

  let cache = {};

  async function fetchSubs(imdb) {
    if (cache[imdb]) return cache[imdb];

    const r = await fetch(`${OSV3}subtitles/movie/${imdb}.json`);
    const j = await r.json();
    cache[imdb] = j.subtitles || [];
    return cache[imdb];
  }

  async function setupSubs() {
    const activity = Lampa.Activity.active?.();
    const imdb = activity?.movie?.imdb_id;
    if (!imdb) return;

    log("IMDb:", imdb);

    const subs = await fetchSubs(imdb);
    if (!subs.length) return;

    // --- фильтр EN/RU + только сабы с прямым url
    const filtered = subs.filter(
      (s) => (s.lang === "eng" || s.lang === "rus") && s.url
    );

    if (!filtered.length) return;

    // --- группируем по языку
    const grouped = { eng: [], rus: [] };
    filtered.forEach((s) => {
      const lang = s.lang;
      if (!grouped[lang]) grouped[lang] = [];
      grouped[lang].push(s);
    });

    // --- формируем финальный массив: EN сначала, потом RU
    const order = ["eng", "rus"];
    const prepared = [];
    order.forEach((lang) => {
      if (!grouped[lang]) return;
      // сортируем внутри языка: HI/AI пометки в конце
      const sorted = grouped[lang].sort((a, b) => {
        const aTag =
          (a.hearing_impaired ? 1 : 0) + (a.machine_translated ? 1 : 0);
        const bTag =
          (b.hearing_impaired ? 1 : 0) + (b.machine_translated ? 1 : 0);
        return aTag - bTag;
      });
      sorted.forEach((s) => {
        prepared.push({
          label:
            (lang === "eng" ? "English" : "Русский") +
            (s.hearing_impaired ? " [HI]" : "") +
            (s.machine_translated ? " [AI]" : ""),
          srclang: lang,
          type: "vtt",
          url: s.url,
        });
      });
    });

    log("Inject subtitles:", prepared.length);
    Lampa.Player.subtitles(prepared);
  }

  Lampa.Player.listener.follow("start", setupSubs);
})();
