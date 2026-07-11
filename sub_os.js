(function () {
  const DEBUG = true;

  function log(...args) {
    if (DEBUG) console.log('[OpenSubtitles]', ...args);
  }

  const cache = {};
  const network = new Lampa.Reguest();
  const API_KEY = 'wyzie-9cy5uc876vzjt3cc9qh7kostpsanyn3w';

  // OpenSubtitles через Wyzie (source=charlie)
  const SOURCE = 'charlie';
  const STORAGE_KEY = 'opensubtitles_subs_cache_v2';
  const MAX_SUBS = 15;

  function toExternalUrl(s) {
    if (!s.url) return '';

    if (/\.srt(\?|$|#)/i.test(s.url)) return s.url;

    const fileName = (s.fileName || `${s.id || 'subtitle'}.srt`).replace(/[^\w.\-()\[\] ]+/g, '_');
    const safeName = /\.srt$/i.test(fileName) ? fileName : `${fileName}.srt`;

    if (/opensubtitles\.org/i.test(s.url)) {
      return `${s.url.replace(/\/$/, '')}.srt`;
    }

    if (/sub\.wyzie\.io/i.test(s.url)) {
      const sep = s.url.includes('?') ? '&' : '?';
      return `${s.url}${sep}format=srt`;
    }

    return `${s.url.replace(/\/$/, '')}/${encodeURIComponent(safeName)}`;
  }

  let loadedSubs = null;

  function getStoredSubs(key) {
    const stored = Lampa.Storage.get(STORAGE_KEY, '{}');
    const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
    return parsed[key] || null;
  }

  function setStoredSubs(key, subs) {
    const stored = Lampa.Storage.get(STORAGE_KEY, '{}');
    const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored;
    parsed[key] = subs;
    Lampa.Storage.set(STORAGE_KEY, parsed);
  }

  function getEpisodeInfo(source) {
    if (!source) return null;

    const season = Number(source.season ?? source.season_number);
    const episode = Number(source.episode ?? source.episode_number);

    if (season > 0 && episode > 0) {
      return { season, episode };
    }

    return null;
  }

  function getMediaContext(data) {
    const activity = Lampa.Activity.active?.();
    const movie = activity?.movie;
    if (!activity || !movie) return null;

    const tmdbId = movie.id || movie.tmdb_id;
    if (!tmdbId) return null;

    const isSeries = !!(movie.first_air_date || movie.number_of_seasons || movie.original_name);
    let season;
    let episode;

    const fromData = getEpisodeInfo(data);
    const fromPlaylist = !fromData && data?.playlist?.length
      ? getEpisodeInfo(data.playlist.find((item) => item.url === data.url) || data.playlist[0])
      : null;
    const playdata = Lampa.Player.playdata?.();
    const fromPlaydata = isSeries ? getEpisodeInfo(playdata) : null;
    const episodeInfo = fromData || fromPlaylist || fromPlaydata;

    if (episodeInfo) {
      season = episodeInfo.season;
      episode = episodeInfo.episode;
    }

    const storageKey = `${tmdbId}_${season || 0}_${episode || 0}`;

    return { tmdbId, season, episode, storageKey, isSeries };
  }

  function mapSubs(osSubs) {
    return osSubs
      .filter((s) => s.url && s.language === 'en' && s.format === 'srt')
      .slice(0, MAX_SUBS)
      .map((s) => {
        const fileName = s.fileName || `${s.id || 'subtitle'}.srt`;
        const url = toExternalUrl(s);

        return {
          method: 'link',
          label: s.release || s.display || 'English',
          url: url,
          lang: 'en',
          language: 'en',
          filename: /\.srt$/i.test(fileName) ? fileName : `${fileName}.srt`,
        };
      });
  }

  async function fetchSubs(tmdbId, season, episode) {
    log('fetchSubs called:', { tmdbId, season, episode, source: SOURCE });
    const key = `${tmdbId}_${season || 0}_${episode || 0}_en_${SOURCE}`;

    if (cache[key]) {
      log('Returning cached subtitles for key:', key);
      return cache[key];
    }

    const languages = ['en'];
    const allSubs = [];

    for (const lang of languages) {
      try {
        const base = season && episode
          ? `https://sub.wyzie.io/search?id=${tmdbId}&season=${season}&episode=${episode}&language=${lang}&source=${SOURCE}&key=${API_KEY}`
          : `https://sub.wyzie.io/search?id=${tmdbId}&language=${lang}&source=${SOURCE}&key=${API_KEY}`;

        log('Fetching URL:', base);

        const osSubs = await new Promise((resolve, reject) => {
          network.silent(base, (data) => {
            const subs = Array.isArray(data) ? data : [];
            log('Subtitles found for', lang, ':', subs.length);
            resolve(subs);
          }, (e) => {
            log('Error fetching subtitles for', lang, ':', e);
            reject(e);
          }, false, {
            dataType: 'json',
            timeout: 10000,
          });
        });

        allSubs.push(...osSubs);
      } catch (e) {
        log('Error fetching subtitles for', lang, ':', e);
      }
    }

    return (cache[key] = mapSubs(allSubs));
  }

  async function loadSubs(ctx) {
    const stored = getStoredSubs(ctx.storageKey);
    if (stored) return stored;

    const subs = await fetchSubs(ctx.tmdbId, ctx.season, ctx.episode);
    if (subs.length) setStoredSubs(ctx.storageKey, subs);
    return subs;
  }

  async function loadSubsForItem(tmdbId, season, episode) {
    const storageKey = `${tmdbId}_${season || 0}_${episode || 0}`;
    const stored = getStoredSubs(storageKey);
    if (stored) return stored;

    const subs = await fetchSubs(tmdbId, season, episode);
    if (subs.length) setStoredSubs(storageKey, subs);
    return subs;
  }

  function applySubsToItem(item, subs) {
    if (!subs?.length) return;

    item.subtitles = item.subtitles || [];
    subs.forEach((s) => {
      if (!item.subtitles.find((x) => x.url === s.url)) {
        item.subtitles.push(s);
      }
    });
  }

  async function loadPlaylistSubs(data, ctx) {
    if (!data?.playlist?.length || !ctx?.isSeries) return;

    const seen = new Set();
    const tasks = [];

    data.playlist.forEach((item) => {
      const ep = getEpisodeInfo(item);
      if (!ep) return;

      const key = `${ctx.tmdbId}_${ep.season}_${ep.episode}`;
      if (seen.has(key)) return;
      seen.add(key);

      tasks.push(
        loadSubsForItem(ctx.tmdbId, ep.season, ep.episode).then((subs) => {
          data.playlist.forEach((playlistItem) => {
            const itemEp = getEpisodeInfo(playlistItem);
            if (!itemEp) return;
            if (itemEp.season === ep.season && itemEp.episode === ep.episode) {
              applySubsToItem(playlistItem, subs);
            }
          });
        })
      );
    });

    if (tasks.length) {
      await Promise.all(tasks);
      log('Playlist subtitles prepared for', tasks.length, 'episodes');
    }
  }

  async function prepareSubs(data) {
    const ctx = getMediaContext(data);
    if (!ctx) return { ctx: null, subs: null };

    const subs = await loadSubs(ctx);
    await loadPlaylistSubs(data, ctx);

    return { ctx, subs };
  }

  function applySubs(data, subs) {
    if (!subs?.length) return;

    data.subtitles = data.subtitles || [];
    data.subtitles_call = data.subtitles_call || data.subtitles.slice();

    subs.forEach((s) => {
      if (!data.subtitles.find((x) => x.url === s.url)) {
        data.subtitles.push(s);
      }
    });

    const currentUrl = data.url;

    if (data.playlist && Array.isArray(data.playlist)) {
      data.playlist.forEach((item) => {
        if (currentUrl && item.url && item.url !== currentUrl) return;
        applySubsToItem(item, subs);
      });
    }

    log('Subtitles applied:', subs.length, 'root:', data.subtitles.length);
  }

  function prefetchSubs(ctx) {
    if (!ctx || getStoredSubs(ctx.storageKey)) return;

    loadSubs(ctx).catch((e) => {
      log('Prefetch error:', e);
    });
  }

  log('Plugin initialized, setting up listeners');

  try {
    Lampa.Listener.follow('full', (e) => {
      if (e.type !== 'complite' || !e.data?.movie) return;

      const movie = e.data.movie;
      const tmdbId = movie.id || movie.tmdb_id;
      if (!tmdbId || movie.first_air_date) return;

      prefetchSubs({
        tmdbId,
        storageKey: `${tmdbId}_0_0`,
      });
    });

    Lampa.Player.listener.follow('create', async ({ data, abort }) => {
      if (data.__sub_os_done) {
        data.__sub_os_done = false;
        return;
      }

      log('Player create event fired');

      const ctx = getMediaContext(data);
      if (!ctx) {
        log('Missing required data, aborting');
        return;
      }

      log('Media info:', ctx);

      const cached = getStoredSubs(ctx.storageKey);
      const playlistReady = !ctx.isSeries || !data.playlist?.length || data.playlist.every((item) => {
        const ep = getEpisodeInfo(item);
        if (!ep) return true;
        return !!getStoredSubs(`${ctx.tmdbId}_${ep.season}_${ep.episode}`);
      });

      if (!cached?.length || !playlistReady) {
        log('Subtitles not ready, delaying playback for external player');
        abort();

        try {
          const prepared = await prepareSubs(data);
          if (prepared.subs?.length) {
            loadedSubs = prepared.subs;
            applySubs(data, prepared.subs);
          }
        } catch (e) {
          log('Error fetching subtitles:', e);
        }

        data.__sub_os_done = true;
        Lampa.Player.play(data);
        return;
      }

      loadedSubs = cached;
      await loadPlaylistSubs(data, ctx);
      applySubs(data, cached);
    });

    Lampa.Player.listener.follow('start', async () => {
      log('Player start event fired');

      if (loadedSubs) {
        const playdata = Lampa.Player.playdata?.();
        const current = (playdata?.subtitles || []).map((s) => ({
          label: s.label,
          url: s.url,
          lang: s.lang || s.language || '',
          language: s.language || s.lang || '',
        }));

        const all = [...current];
        loadedSubs.forEach((s) => {
          if (!all.find((x) => x.url === s.url)) {
            all.push(s);
          }
        });

        const idx = all.findIndex((s) => (s.lang || s.language) === 'en');

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
