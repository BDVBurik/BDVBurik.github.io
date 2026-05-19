(function () {
  "use strict";

  const DATA_URL = "https://BDVBurik.github.io/lampa_export.json";

  let franchises = [];
  let loaded = false;

  async function loadDatabase() {
    if (loaded) return;

    try {
      const response = await fetch(DATA_URL);
      franchises = await response.json();
      loaded = true;
    } catch (e) {
      console.error("Franchise DB error", e);
    }
  }

  function findFranchise(tmdbId) {
    return franchises.find(f =>
      Array.isArray(f.m) &&
      f.m.some(m => String(m.t_id) === String(tmdbId))
    );
  }

  function createCard(movie) {
    // стандартная карточка Lampa
    const card = new Lampa.Card({
      id: movie.t_id,
      title: movie.t,
      name: movie.t,
      method: movie.type || "movie",
      card: {
        title: movie.t
      }
    });

    return card.render();
  }

  function renderCarousel(franchise, e) {
    if (!franchise || !franchise.m) return;

    const wrap = $('<div class="tmdb-recommendations"></div>');

    const title = $(`
      <div class="recommend-title">
        ${franchise.tf || "Рекомендации"}
      </div>
    `);

    const row = $('<div class="recommend-row"></div>');

    franchise.m.forEach(movie => {
      row.append(createCard(movie));
    });

    wrap.append(title);
    wrap.append(row);

    // вставка как TMDB (под full info блоком)
    const target = e.body.find(".full-details").first();
    if (target.length) {
      target.after(wrap);
    } else {
      e.body.append(wrap);
    }

    // фокус/инициализация карточек
    Lampa.Utils?.focus && Lampa.Utils.focus(wrap);
  }

  async function start() {
    if (window.franchise_json_plugin) return;
    window.franchise_json_plugin = true;

    await loadDatabase();

    Lampa.Listener.follow("full", function (e) {
      if (!e || e.type !== "complete") return;

      const id =
        e?.data?.movie?.id ||
        e?.data?.id ||
        null;

      const franchise = findFranchise(id);

      if (franchise) {
        e.body.find(".tmdb-recommendations").remove();
        renderCarousel(franchise, e);
      }
    });
  }

  start();
})();