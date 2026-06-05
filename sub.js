(function () {
  const DEBUG = false;

  function log(...args) {
    if (DEBUG) console.log('[Wyzie Subs]', ...args);
  }

  const cache = {};
  const network = new Lampa.Reguest(); // Используем Lampa.Reguest  

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

        // Используем Lampa.Reguest вместо fetch  
        const osSubs = await new Promise((resolve, reject) => {
          network.silent(url, (data) => {
            log('API response for', lang, ':', data);
            const subs = Array.isArray(data) ? data : [];
            log('Subtitles found for', lang, ':', subs.length);
            resolve(subs);
          }, (e) => {
            log('Error fetching subtitles for', lang, ':', e);
            reject(e);
          }, false, {
            dataType: 'json',
            timeout: 10000
          });
        });

        allSubs.push(...osSubs);
      } catch (e) {
        log('Error fetching subtitles for', lang, ':', e);
      }
    }

    return (cache[key] = allSubs);
  }

  const API_KEY = "wyzie-9cy5uc876vzjt3cc9qh7kostpsanyn3w";
  let loadedSubs = null;

  log('Plugin initialized, setting up listeners');
  try {
    Lampa.Player.listener.follow("create", ({ data }) => {
      log('Player create event fired');

      if (loadedSubs) {
        data.subtitles = data.subtitles || [];
        loadedSubs.forEach((s) => {
          if (!data.subtitles.find((x) => x.url === s.url)) {
            data.subtitles.push(s);
          }
        });
        log('Subtitles added to data from cache:', data.subtitles);
      }
    });

    Lampa.Player.listener.follow("start", async () => {
      log('Player start event fired');

      const activity = Lampa.Activity.active?.();
      const movie = activity?.movie;

      if (!activity || !movie) {
        log('Missing required data, aborting');
        return;
      }

      const tmdbId = movie.id || movie.tmdb_id;
      const isSeries = !!movie.first_air_date;
      const playdata = Lampa.Player.playdata?.();
      const season = isSeries ? playdata?.season : undefined;
      const episode = isSeries ? playdata?.episode : undefined;

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

        loadedSubs = filtered;

        const current = (playdata?.subtitles || []).map((s) => ({
          label: s.label,
          url: s.url,
          lang: s.lang || "",
        }));

        const all = [...current];
        filtered.forEach((s) => {
          if (!all.find((x) => x.url === s.url)) {
            all.push(s);
          }
        });

        const idx = all.findIndex((s) => s.lang === 'en');

        try {
          Lampa.Player.subtitles(all, idx === -1 ? 0 : idx);
          log('Subtitles set successfully');
        } catch (e) {
          log('Error setting subtitles:', e);
        }
      } catch (e) {
        log('Error fetching or setting subtitles:', e);
      }
    });

    log('Listeners attached successfully');
  } catch (e) {
    log('Error attaching listeners:', e);
  }
})();