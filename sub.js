(function () {
  const DEBUG = false;

  function log(...args) {
    if (DEBUG) console.log('[Wyzie Subs]', ...args);
  }

  const cache = {};

  async function fetchSubs(tmdbId, season, episode, languages = ['en', 'ru']) {
    log('fetchSubs called:', { tmdbId, season, episode, languages });
    const key = `${tmdbId}_${season || 0}_${episode || 0}_${languages.join(',')}`;
    if (cache[key]) {
      log('Returning cached subtitles for key:', key);
      return cache[key];
    }

    const allSubs = [];

    for (const lang of languages) {
      try {
        const url = season && episode
          ? `https://sub.wyzie.io/search?id=${tmdbId}&season=${season}&episode=${episode}&language=${lang}&key=${API_KEY}`
          : `https://sub.wyzie.io/search?id=${tmdbId}&language=${lang}&key=${API_KEY}`;

        log('Fetching URL:', url);
        const r = await fetch(url);
        const j = await r.json();
        log('API response for', lang, ':', j);

        const subs = Array.isArray(j) ? j : [];
        log('Subtitles found for', lang, ':', subs.length);
        allSubs.push(...subs);
      } catch (e) {
        log('Error fetching subtitles for', lang, ':', e);
      }
    }

    return (cache[key] = allSubs);
  }

  const API_KEY = "wyzie-9cy5uc876vzjt3cc9qh7kostpsanyn3w";

  log('Plugin initialized, setting up listener');
  try {
    Lampa.Player.listener.follow("create", async ({ data }) => {
      log('Player create event fired');

      const activity = Lampa.Activity.active?.();
      const movie = activity?.movie;

      if (!activity || !movie) {
        log('Missing required data, aborting');
        return;
      }

      const tmdbId = movie.id || movie.tmdb_id;
      const isSeries = !!movie.first_air_date;
      const season = isSeries ? data.season : undefined;
      const episode = isSeries ? data.episode : undefined;

      log('Media info:', { tmdbId, isSeries, season, episode });

      if (!tmdbId) {
        log('No TMDB ID found, aborting');
        return;
      }

      try {
        const osSubs = await fetchSubs(tmdbId, season, episode, ['en', 'ru']);
        log('Wyzie Subtitles received:', osSubs);

        const filtered = osSubs
          .filter((s) => s.url && (s.language === 'en' || s.language === 'ru'))
          .map((s, i) => ({
            index: i,
            label: s.display || s.language,
            url: s.url,
            lang: s.language,
          }));

        log('Filtered subtitles:', filtered);

        if (!filtered.length) {
          log('No subtitles available, aborting');
          return;
        }

        data.subtitles = data.subtitles || [];
        filtered.forEach((s) => {
          if (!data.subtitles.find((x) => x.url === s.url)) {
            data.subtitles.push(s);
          }
        });

        log('Subtitles added to data:', data.subtitles);
      } catch (e) {
        log('Error fetching or setting subtitles:', e);
      }
    });

    log('Listener attached successfully');
  } catch (e) {
    log('Error attaching listener:', e);
  }
})();