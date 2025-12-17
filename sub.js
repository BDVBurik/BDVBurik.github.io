(function () {
  //BDVBuriлk.github.io
  //OST plugin for Lampa
  //2025
  const OSV3 = "https://opensubtitles-v3.strem.io/",
    cache = {};
  async function fetchSubs(imdb, season, episode) {
    const key = `${imdb}_${season || 0}_${episode || 0}`;
    if (cache[key]) return cache[key];
    try {
      const url =
        season && episode
          ? `${OSV3}subtitles/series/${imdb}:${season}:${episode}.json`
          : `${OSV3}subtitles/movie/${imdb}.json`;
      const r = await fetch(url),
        j = await r.json();
      return (cache[key] = j.subtitles || []);
    } catch {
      return [];
    }
  }
  async function setupSubs() {
    const activity = Lampa.Activity.active?.(),
      playdata = Lampa.Player.playdata?.(),
      movie = activity?.movie;
    if (!activity || !playdata || !movie) return;
    const imdb = movie.imdb_id,
      isSeries = !!movie.first_air_date,
      season = isSeries ? playdata.season : undefined,
      episode = isSeries ? playdata.episode : undefined;
    const osSubs = await fetchSubs(imdb, season, episode);
    const filtered = osSubs
      .filter((s) => (s.lang === "eng" || s.lang === "rus") && s.url)
      .map((s) => ({
        label: s.lang === "eng" ? "eng" : "rus",
        url: s.url,
        lang: s.lang,
      }));
    const current = (playdata.subtitles || []).map((s) => ({
      label: s.label,
      url: s.url,
      lang: s.lang || "",
    }));
    const all = [...current];
    filtered.forEach((s) => {
      if (!all.find((x) => x.url === s.url)) all.push(s);
    });
    if (!all.length) return;
    const idx = all.findIndex((s) => s.lang === "eng");
    Lampa.Player.subtitles(all, idx === -1 ? 0 : idx);
  }
  Lampa.Player.listener.follow("start", () => setTimeout(setupSubs, 500));
})();
