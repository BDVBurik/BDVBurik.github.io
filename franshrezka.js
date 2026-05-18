(function () {
  "use strict";

  const DATA_URL =
    "https://BDVBurik.github.io/franchises_full.json";

  let franchises = [];

  // =========================
  // Load DB
  // =========================
  async function loadDatabase() {
    if (franchises.length) return franchises;

    const response = await fetch(DATA_URL);
    franchises = await response.json();

    return franchises;
  }

  // =========================
  // Find franchise by TMDB id
  // =========================
  function findFranchise(tmdbId) {
    for (const franchise of franchises) {
      for (const movie of franchise.movies || []) {
        if (String(movie.tmdb_id) === String(tmdbId)) {
          return franchise;
        }
      }
    }

    return null;
  }

  // =========================
  // Render
  // =========================
  function renderCollection(franchise, currentTmdbId) {
    if (!franchise || !franchise.movies) return;

    let html = "";

    franchise.movies.forEach((movie, index) => {
      const current =
        String(movie.tmdb_id) === String(currentTmdbId);

      html += `
        <div class="b-post__partcontent_item ${current ? "current" : ""
        }">
          <span class="td num">${index + 1}</span>
          <span class="td title">${movie.title}</span>
          <span class="td year">${movie.year || ""}</span>
          <span class="td rating">${movie.imdb_rating || ""}</span>
        </div>
      `;
    });

    const block = $(`
      <div class="collection selector" id="collect">
        ${html}
      </div>
    `);

    $(".collection").remove();
    $(".full-descr__text").after(block);
  }

  // =========================
  // Style
  // =========================
  function injectStyle() {
    if ($("#franchise-style").length) return;

    $("head").append(`
      <style id="franchise-style">
        .td{
          display:table-cell;
          padding:0 10px;
          border-bottom:1px solid rgba(255,255,255,.08);
        }

        .collection{
          display:table;
          width:100%;
          margin-top:1em;
        }

        .b-post__partcontent_item{
          display:table-row;
        }

        .b-post__partcontent_item:hover{
          background:#ffffff11;
        }

        .current{
          background:#ffffff22;
        }

        .num{width:50px;text-align:center}
        .year{width:80px;text-align:right}
        .rating{width:80px;text-align:center}
      </style>
    `);
  }

  // =========================
  // Main
  // =========================
  async function startPlugin() {
    if (window.franchise_plugin) return;
    window.franchise_plugin = true;

    await loadDatabase();

    injectStyle();

    Lampa.Listener.follow("full", function (e) {
      if (e.type !== "complite") return;

      const tmdbId = e.data.movie.id;

      const franchise = findFranchise(tmdbId);

      if (franchise) {
        renderCollection(franchise, tmdbId);
      }
    });
  }

  startPlugin();
})();