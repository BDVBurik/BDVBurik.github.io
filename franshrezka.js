(function () {
  "use strict";

  // BDVBurik franchise plugin (JSON edition)

  const DATA_URL =
    "https://BDVBurik.github.io/franchises_full.json";

  let franchises = [];
  let loaded = false;

  // =========================
  // Load DB
  // =========================
  async function loadDatabase() {
    if (loaded) return;

    try {
      const response = await fetch(DATA_URL);
      franchises = await response.json();
      loaded = true;
      console.log("Franchise DB loaded:", franchises.length);
    } catch (e) {
      console.error("DB load error", e);
    }
  }

  // =========================
  // Find franchise
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
  // Open movie card directly
  // =========================
  function openMovie(tmdbId) {
    Lampa.Activity.push({
      url: "movie/" + tmdbId,
      component: "full",
      method: "movie"
    });
  }

  // =========================
  // Render
  // =========================
  function renderCollection(franchise, currentTmdbId) {
    if (!franchise || !franchise.movies?.length) return;

    $(".collection").remove();

    let html = "";
    let currentIndex = 0;

    franchise.movies.forEach((movie, index) => {
      const isCurrent =
        String(movie.tmdb_id) === String(currentTmdbId);

      if (isCurrent) currentIndex = index;

      html += `
        <div
          class="b-post__partcontent_item selector ${isCurrent ? "current focus" : ""
        }"
          data-id="${movie.tmdb_id}"
        >
          <span class="td num">${index + 1}</span>
          <span class="td title">${movie.title}</span>
          <span class="td year">${movie.year || ""}</span>
          <span class="td rating">${movie.imdb_rating || ""}</span>
        </div>
      `;
    });

    const block = $(`
      <div id="collect" class="collection selector">
        ${html}
      </div>
    `);

    $(".full-descr__text").after(block);

    // Enter
    $("#collect .b-post__partcontent_item").on(
      "hover:enter",
      function () {
        const id = $(this).data("id");
        openMovie(id);
      }
    );

    // Focus current
    setTimeout(() => {
      $("#collect .b-post__partcontent_item")
        .removeClass("focus")
        .eq(currentIndex)
        .addClass("focus");
    }, 150);
  }

  // =========================
  // Styles
  // =========================
  function injectStyle() {
    if ($("#franchise-style").length) return;

    $("head").append(`
      <style id="franchise-style">

        .collection{
          margin-top:1.5em;
          width:100%;
          display:flex;
          flex-direction:column;
          gap:.15em;
        }

        .b-post__partcontent_item{
          display:flex;
          align-items:center;
          padding:.8em 1em;
          border-radius:.4em;
          background:rgba(255,255,255,.03);
          transition:.15s;
        }

        .b-post__partcontent_item:hover{
          background:rgba(255,255,255,.08);
        }

        .b-post__partcontent_item.focus{
          background:rgba(255,255,255,.18);
        }

        .b-post__partcontent_item.current{
          border-left:4px solid #fff;
        }

        .td{
          flex:1;
          white-space:nowrap;
          overflow:hidden;
          text-overflow:ellipsis;
        }

        .num{
          max-width:45px;
          text-align:center;
          opacity:.7;
        }

        .title{
          flex:5;
        }

        .year{
          max-width:80px;
          text-align:right;
          opacity:.75;
        }

        .rating{
          max-width:70px;
          text-align:center;
          font-weight:600;
        }

      </style>
    `);
  }

  // =========================
  // Init
  // =========================
  async function startPlugin() {
    if (window.franchise_json_plugin) return;
    window.franchise_json_plugin = true;

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