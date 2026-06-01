(function () {
  "use strict";

  const DATA_URL = "https://BDVBurik.github.io/lampa_export.json";
  const CACHE_EXPIRY = 3600000; // 1 hour cache for TMDB data
  const MAX_CONCURRENT_REQUESTS = 3; // Limit concurrent API calls

  let franchises = [];
  let loaded = false;
  let tmdbCache = {}; // Cache for TMDB data
  let activeRequests = 0;
  let requestQueue = [];

  async function loadDatabase() {
    if (loaded) return;
    try {
      franchises = await (await fetch(DATA_URL)).json();
      // Create ID map for faster lookups
      franchises._idMap = new Map();
      franchises.forEach(f => {
        (f.m || []).forEach(m => {
          if (m.t_id) {
            franchises._idMap.set(String(m.t_id), f);
          }
        });
      });
      loaded = true;
    } catch (e) {
      console.error('Failed to load franchise database:', e);
    }
  }

  function findFranchise(tmdbId) {
    // Use pre-built ID map for O(1) lookup instead of O(n*m) iteration
    return franchises._idMap?.get(String(tmdbId)) || null;
  }

  function processTmdbRequest(item) {
    return new Promise((resolve) => {
      const cacheKey = `${item.t_id}_${item.type || 'movie'}`;
      const cached = tmdbCache[cacheKey];

      if (cached && Date.now() - cached.time < CACHE_EXPIRY) {
        resolve({ card: cached.data, error: null });
        return;
      }

      const timeoutId = setTimeout(() => {
        resolve({ card: null, error: 'timeout' });
      }, 5000);

      Lampa.Api.sources.tmdb.full(
        { id: item.t_id, method: item.type || "movie" },
        (data) => {
          clearTimeout(timeoutId);
          if (data && (data.movie || data.tv)) {
            const m = data.movie || data.tv || data;
            m.source = "tmdb";
            m.type = item.type === "tv" ? "tv" : "movie";
            const card = Lampa.Utils.addSource(m, 'tmdb');
            tmdbCache[cacheKey] = { data: card, time: Date.now() };
            resolve({ card, error: null });
          } else {
            resolve({ card: null, error: 'no_data' });
          }
        },
        (error) => {
          clearTimeout(timeoutId);
          console.warn('TMDB load error:', error);
          resolve({ card: null, error });
        }
      );
    });
  }

  function loadTmdbCards(franchise, cb) {
    const list = (franchise.m || []).filter(x => x && x.t_id);
    if (!list.length) return cb([]);

    let completed = 0;
    const results = new Array(list.length).fill(null);
    const pending = [...list.entries()];

    async function processQueue() {
      while (pending.length > 0 && activeRequests < MAX_CONCURRENT_REQUESTS) {
        activeRequests++;
        const [index, item] = pending.shift();

        processTmdbRequest(item).then(({ card }) => {
          results[index] = card;
          completed++;
          activeRequests--;

          if (completed === list.length) {
            cb(results.filter(c => c != null));
          } else {
            processQueue();
          }
        });
      }
    }

    processQueue();
  }
  async function start() {
    if (window.franchise_cards_plugin) return;
    window.franchise_cards_plugin = true;

    await loadDatabase();

    if (!Lampa?.Manifest?.app_digital || Lampa.Manifest.app_digital < 300) return;
    if (!Lampa.Listener || !Lampa.Api) return;



    Lampa.Listener.follow("full", (e) => {
      if (e.type !== "complite" || !e.data) return;

      const media = e.data.movie || e.data.tv;
      if (!media || !media.id) return;

      const franchise = findFranchise(media.id);
      if (!franchise || !franchise.m || franchise.m.length === 0) return;

      loadTmdbCards(franchise, (cards) => {
        if (!cards.length || !e.link || !e.link.rows) return;

        // Filter cards early to avoid processing invalid ones
        const safe = cards.filter(c => c && c.id && (c.title || c.name));
        if (!safe.length) return;

        const data = {
          title: franchise.tf || "Francise",
          results: safe.map(item => ({
            ...item,
            params: {
              emit: {
                onEnter: function () {
                  Lampa.Activity.push({
                    component: "full",
                    id: item.id,
                    method: item.type === "tv" ? "tv" : "movie",
                  });
                }
              }
            }
          })),
          params: {
            module: Lampa.Maker.module("Line").toggle(
              Lampa.Maker.module("Line").MASK.base,
              "Icon"
            )
          }
        };

        // Find insert position efficiently
        let insertIndex = e.link.rows.findIndex(row => {
          if (!Array.isArray(row) || row[0] !== 'cards') return false;
          const rowData = row[1];
          if (!rowData || !rowData.title) return false;
          const title = rowData.title;
          return title === Lampa.Lang.translate('title_collection') ||
            title === Lampa.Lang.translate('title_recomendations');
        });

        if (insertIndex === -1) insertIndex = Math.min(2, e.link.rows.length);

        // Check if row already exists to avoid duplicates
        if (e.link.rows[insertIndex] && Array.isArray(e.link.rows[insertIndex]) &&
          e.link.rows[insertIndex][1] && e.link.rows[insertIndex][1].title === data.title) {
          return;
        }

        e.link.rows.splice(insertIndex, 0, ['cards', data]);

        // Only emit if the row is visible on screen
        if (insertIndex < (e.link.items?.length || 0)) {
          e.link.emit('createAndAppend', ['cards', data]);
        }
      });
    });
  }

  start();
})();

