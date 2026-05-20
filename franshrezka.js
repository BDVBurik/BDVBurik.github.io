(function () {
  "use strict";

  const DATA_URL = "https://BDVBurik.github.io/lampa_export.json";

  let franchises = [];
  let loaded = false;

  async function loadDatabase() {
    if (loaded) return;
    franchises = await (await fetch(DATA_URL)).json();
    loaded = true;
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
        { id: item.t_id, method: item.type || "movie" },
        (data) => {
          if (data && data.movie) {
            const m = data.movie || data.tv || data;
            m.source = "tmdb";
            m.type = item.type === "tv" ? "tv" : "movie";
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
    let rendering = false;

    Lampa.Listener.follow("full", (e) => {
      if (rendering) return;
      if (e.type !== "complite") return;
      const media = e.data.movie || e.data.tv;

      if (!media) return;

      const franchise = findFranchise(media.id);
      if (franchise) {
        rendering = true;

        loadTmdbCards(franchise, (cards) => {
          if (!cards.length) {
            rendering = false;
            return;
          }

          const safe = cards.filter(c => c && c.id && (c.title || c.name));
          if (!safe.length) {
            rendering = false;
            return;
          }

          const data = {
            title: franchise.tf || "Коллекция",
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

          // Добавляем в rows компонента
          if (e.link && e.link.rows) {
            let insertIndex = -1;

            for (let i = 0; i < e.link.rows.length; i++) {
              const row = e.link.rows[i];
              if (Array.isArray(row) && row[0] === 'cards') {
                const rowData = row[1];
                if (rowData.title === 'Коллекция' || rowData.title === 'Рекомендации' ||
                  rowData.title === 'Collection' || rowData.title === 'Recommendations' ||
                  rowData.title === 'Колекція' || rowData.title === 'Рекомендації') {
                  insertIndex = i;
                  break;
                }
              }
            }

            if (insertIndex === -1) {
              insertIndex = 2;
            }



            e.link.rows.splice(insertIndex, 0, ['cards', data]);

            // Если строка должна быть видима сразу (в пределах view)  
            if (insertIndex < e.link.view) {
              e.link.emit('createAndAppend', ['cards', data]);
            }
          }

          rendering = false;
        });
      }
    });
  }

  start();
})();

