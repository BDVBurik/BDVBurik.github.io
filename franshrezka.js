(function () {
  "use strict";

  const DATA_URL = "https://BDVBurik.github.io/franchises.json";

  const CACHE_KEY = "franchises_cache";
  const CACHE_TIME_KEY = "franchises_cache_time";

  const CACHE_LIFETIME = 1000 * 60 * 60 * 24 * 30; // 30 дней

  let franchises = [];
  let franchiseMap = {};
  let loaded = false;

  async function loadDatabase() {
    if (loaded) return;

    try {

      const cache = Lampa.Storage.get(CACHE_KEY, null);
      const cacheTime = Lampa.Storage.get(CACHE_TIME_KEY, 0);

      // Загружаем из кеша если он свежий
      if (cache && (Date.now() - cacheTime < CACHE_LIFETIME)) {

        franchises = cache;

        buildIndex();

        loaded = true;

        console.log("Franchises loaded from cache");

        return;
      }

      // Загружаем с сервера
      const response = await fetch(DATA_URL);
      const json = await response.json();

      franchises = json || [];

      // Сохраняем кеш
      Lampa.Storage.set(CACHE_KEY, franchises);
      Lampa.Storage.set(CACHE_TIME_KEY, Date.now());

      buildIndex();

      loaded = true;

      console.log("Franchises loaded from network");

    } catch (err) {

      console.error("Franchise database load error:", err);

      // fallback на старый кеш
      const cache = Lampa.Storage.get(CACHE_KEY, []);

      if (cache && cache.length) {

        franchises = cache;

        buildIndex();

        loaded = true;

        console.log("Franchises loaded from fallback cache");
      }
    }
  }

  function buildIndex() {

    franchiseMap = {};

    franchises.forEach(franchise => {

      (franchise.m || []).forEach(media => {

        if (media && media.t_id) {
          franchiseMap[String(media.t_id)] = franchise;
        }

      });

    });

    console.log("Franchise index size:", Object.keys(franchiseMap).length);
  }

  function findFranchise(tmdbId) {

    return franchiseMap[String(tmdbId)] || null;
  }

  function loadTmdbCards(franchise, cb) {

    const list = (franchise.m || []).filter(x => x && x.t_id);

    const out = [];

    let left = list.length;

    if (!left) {
      cb([]);
      return;
    }

    list.forEach(item => {

      Lampa.Api.sources.tmdb.full(
        {
          id: item.t_id,
          method: item.type || "movie"
        },
        (data) => {

          const media = data.movie || data.tv || data;

          if (media && media.id) {

            media.source = "tmdb";

            media.type = item.type === "tv" ? "tv" : "movie";

            out.push(media);
          }

          left--;

          if (left <= 0) {
            cb(out);
          }
        }
      );
    });
  }

  async function start() {

    if (window.franchise_cards_plugin) return;

    window.franchise_cards_plugin = true;

    if (!Lampa?.Manifest || Lampa.Manifest.app_digital < 300) {
      return;
    }

    await loadDatabase();

    Lampa.Listener.follow("full", function (e) {

      if (e.type !== "start") return;

      const media = e.data.movie || e.data.tv;

      if (!media || !media.id) return;

      const franchise = findFranchise(media.id);

      if (!franchise) return;

      loadTmdbCards(franchise, function (cards) {

        const safe = cards.filter(item =>
          item &&
          item.id &&
          (item.title || item.name)
        );

        if (!safe.length) return;

        const data = {

          title: "",

          results: safe.map(item => ({

            ...item,

            params: {
              emit: {

                onEnter: function () {

                  Lampa.Activity.push({
                    component: "full",
                    id: item.id,
                    method: item.type === "tv" ? "tv" : "movie"
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

        if (e.link && e.link.rows) {

          let insertIndex = -1;

          for (let i = 0; i < e.link.rows.length; i++) {

            const row = e.link.rows[i];

            if (Array.isArray(row) && row[0] === "cards") {

              const rowData = row[1];

              if (
                rowData.title === "Коллекция" ||
                rowData.title === "Рекомендации" ||
                rowData.title === "Collection" ||
                rowData.title === "Recommendations" ||
                rowData.title === "Колекція" ||
                rowData.title === "Рекомендації"
              ) {
                insertIndex = i;
                break;
              }
            }
          }

          if (insertIndex === -1) {
            insertIndex = 2;
          }

          const itemsLength = e.link.items
            ? e.link.items.length
            : 0;

          e.link.rows.splice(insertIndex, 0, ["cards", data]);

          // Если блок уже видим → рендерим сразу
          if (insertIndex < itemsLength) {

            e.link.emit("createAndAppend", ["cards", data]);
          }
        }
      });
    });
  }

  start();

})();