(function () {
  const DEBUG = true;

  function log(...args) {
    if (DEBUG) console.log('[Wyzie Subs]', ...args);
  }

  const cache = {};
  const network = new Lampa.Reguest();
  const API_KEY = "wyzie-9cy5uc876vzjt3cc9qh7kostpsanyn3w";

  // Ключ для хранения в Storage  
  const STORAGE_KEY = 'wyzie_subs_cache';

  // Получить субтитры из кэша Storage  
  function getStoredSubs(tmdbId) {
    const stored = Lampa.Storage.get(STORAGE_KEY, '{}');
    const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
    return parsed[tmdbId] || null;
  }

  // Сохранить субтитры в Storage  
  function setStoredSubs(tmdbId, subs) {
    const stored = Lampa.Storage.get(STORAGE_KEY, '{}');
    const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
    parsed[tmdbId] = subs;
    Lampa.Storage.set(STORAGE_KEY, parsed);
  }

  async function fetchSubs(tmdbId, season, episode, languages = ['en', 'uk']) {
    log('fetchSubs called:', { tmdbId, season, episode, languages });
    const key = `${tmdbId}_${season || 0}_${episode || 0}_${languages.join(',')}`;

    // Проверяем оперативный кэш  
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

  let loadedSubs = null;

  log('Plugin initialized, setting up listeners');
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
      const playdata = Lampa.Player.playdata?.();
      const season = isSeries ? playdata?.season : undefined;
      const episode = isSeries ? playdata?.episode : undefined;

      log('Media info:', { tmdbId, isSeries, season, episode });

      if (!tmdbId) {
        log('No TMDB ID found, aborting');
        return;
      }

      // Сначала пробуем получить из Storage кэша  
      const storageKey = `${tmdbId}_${season || 0}_${episode || 0}`;
      let storedSubs = getStoredSubs(storageKey);

      if (storedSubs) {
        log('Loaded subtitles from Storage:', storedSubs);
        loadedSubs = storedSubs;
      } else {
        // Если нет в Storage, загружаем  
        try {
          const osSubs = await fetchSubs(tmdbId, season, episode, ['en', 'uk']);
          log('Wyzie Subtitles received:', osSubs);

          const filtered = osSubs
            .filter((s) => s.url && (s.language === 'en' || s.language === 'uk'))
            .map((s, i) => ({
              index: i,
              label: s.display || s.language,
              url: s.url,
              lang: s.language,
            }));

          log('Filtered subtitles:', filtered);

          if (filtered.length) {
            loadedSubs = filtered;
            // Сохраняем в Storage  
            setStoredSubs(storageKey, filtered);
            log('Subtitles saved to Storage');
          }
        } catch (e) {
          log('Error fetching subtitles:', e);
        }
      }

      // Добавляем в data.subtitles
      if (loadedSubs) {
        data.subtitles = data.subtitles || [];
        loadedSubs.forEach((s) => {
          if (!data.subtitles.find((x) => x.url === s.url)) {
            data.subtitles.push(s);
          }
        });

        // Also add to playlist items for external players  
        if (data.playlist && Array.isArray(data.playlist)) {
          log('Adding subtitles to playlist items');
          log('Current playlist:', data.playlist);
          data.playlist.forEach((item) => {
            item.subtitles = item.subtitles || [];
            loadedSubs.forEach((s) => {
              if (!item.subtitles.find((x) => x.url === s.url)) {
                item.subtitles.push(s);
              }
            });
          });
        }

        log('Subtitles added to data and playlist:', data.subtitles);
      }
    });  

    Lampa.Player.listener.follow("start", async () => {
      log('Player start event fired');

      // Для внутреннего плеера устанавливаем субтитры  
      if (loadedSubs) {
        const playdata = Lampa.Player.playdata?.();
        const current = (playdata?.subtitles || []).map((s) => ({
          label: s.label,
          url: s.url,
          lang: s.lang || "",
        }));

        const all = [...current];
        loadedSubs.forEach((s) => {
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
      }
    });

    log('Listeners attached successfully');
  } catch (e) {
    log('Error attaching listeners:', e);
  }
})();