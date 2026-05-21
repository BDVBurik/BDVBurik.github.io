(function () {
  "use strict";

  const DATA_URL = "https://BDVBurik.github.io/lampa_export.json";
  const STORAGE_KEY = "franchise_db";
  const CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds  

  let franchises = [];
  let loaded = false;

  async function loadDatabase() {
    if (loaded) return;

    try {
      // Try to load from cache first  
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        const now = Date.now();

        // Check if cache is still valid (less than 30 days old)  
        if (data.timestamp && (now - data.timestamp < CACHE_DURATION)) {
          franchises = data.franchises;
          loaded = true;
          console.log('Franchise plugin: loaded from cache');
          return;
        }
      }

      // Fetch fresh data  
      const response = await fetch(DATA_URL);
      franchises = await response.json();

      // Save to cache with timestamp  
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        franchises: franchises,
        timestamp: Date.now()
      }));

      loaded = true;
      console.log('Franchise plugin: loaded from URL and cached');
    } catch (error) {
      console.error('Franchise plugin: error loading data', error);
      // Try to use stale cache if available  
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        franchises = data.franchises || [];
        loaded = true;
        console.log('Franchise plugin: using stale cache');
      }
    }
  }

  function findFranchise(tmdbId) {
    for (const f of franchises) {
      for (const m of (f.m || [])) {
        if (String(m.t_id) === String(tmdbId)) {
          return f;
        }
      }
    }
    return null;
  }

  function loadTmdbCards(franchise, cb) {
    const list = (franchise.m || []).filter(x => x && x.t_id);
    const out = [];
    let left = list.length;

    if (!left) return cb([]);

    list.forEach(item => {
      Lampa.Api.sources.tmdb.full(
        { id: item.t_id, method: "movie" },
        (data) => {
          if (data && data.movie) {
            const m = data.movie || data.tv || data;
            m.source = "tmdb";
            // Determine type from the data itself  
            m.type = data.movie ? "movie" : (data.tv ? "tv" : "movie");
            out.push(m);
          }
          if (--left === 0) cb(out);
        }
      );
    });
  }

  async function start() {
    if (window.franchise_cards_plugin) return;
    window.franchise_cards_plugin = true;

    await loadDatabase();

    if (!Lampa?.Manifest || Lampa.Manifest.app_digital < 300) return;

    Lampa.Listener.follow("full", (e) => {
      if (e.type !== "complite") return;

      const media = e.data.movie || e.data.tv;
      if (!media) return;

      const franchise = findFranchise(media.id);
      if (franchise) {
        loadTmdbCards(franchise, (cards) => {
          const safe = cards.filter(c => c && c.id && (c.title || c.name));

          if (!safe.length) return;

          const data = {
            title: "Франшиза", // Generic title since tf is no longer in JSON  
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
                  },
                  onFocus: function () {
                    console.log("Focus", item);
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

          // Add to component rows  
          if (e.link && e.link.rows) {
            let insertIndex = -1;

            for (let i = 0; i < e.link.rows.length; i++) {
              const row = e.link.rows[i];
              if (Array.isArray(row) && row[0] === 'cards') {
                const rowData = row[1];
                if (rowData.title === 'Колекція' || rowData.title === 'Рекомендації') {
                  insertIndex = i;
                  break;
                }
              }
            }

            if (insertIndex === -1) {
              insertIndex = 2;
            }

            const currentView = e.link.view || 3;
            const itemsLength = e.link.items ? e.link.items.length : 0;

            if (insertIndex >= itemsLength) {
              e.link.rows.splice(insertIndex, 0, ['cards', data]);
            } else {
              e.link.rows.splice(insertIndex, 0, ['cards', data]);
              e.link.emit('createAndAppend', ['cards', data]);
            }
          }
        });
      }
    });
  }

  start();
})();