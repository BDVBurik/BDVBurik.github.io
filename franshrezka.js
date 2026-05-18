(function () {
  "use strict";

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

      console.log(
        "Franchise DB loaded:",
        franchises.length
      );
    } catch (e) {
      console.error("Franchise DB error", e);
    }
  }

  // =========================
  // Detect media type
  // =========================
  function detectMediaType(movie, currentMethod) {
    if (movie.media_type) return movie.media_type;

    return currentMethod === "tv" ? "tv" : "movie";
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
  // Open card
  // =========================
  function openMovie(tmdbId, mediaType) {
    Lampa.Api.sources.tmdb.card({
      id: tmdbId,
      method: mediaType
    }).then(function (json) {
      Lampa.Activity.push({
        card: json,
        component: "full",
        page: 1
      });
    });
  }

  // =========================
  // Render
  // =========================
  function renderCollection(
    franchise,
    currentTmdbId,
    currentMethod
  ) {
    if (!franchise?.movies?.length) return;

    $(".collection").remove();

    let html = "";
    let currentIndex = 0;

    franchise.movies.forEach((movie, index) => {
      const isCurrent =
        String(movie.tmdb_id) === String(currentTmdbId);

      if (isCurrent) currentIndex = index;

      const mediaType = detectMediaType(
        movie,
        currentMethod
      );

      html += `
        <div
          class="b-post__partcontent_item selector ${isCurrent ? "current focus" : ""
        }"
          data-id="${movie.tmdb_id}"
          data-type="${mediaType}"
        >
          <span class="td num">${index + 1}</span>
          <span class="td title">${movie.title || ""}</span>
          <span class="td year">${movie.year || ""}</span>
          <span class="td rating">${movie.imdb_rating || ""}</span>
        </div>
      `;
    });

    const block = $(`
      <div id="collect" class="collection">
        ${html}
      </div>
    `);

    $(".full-descr__text").after(block);

    bindControls(currentIndex);
  }

  // =========================
  // Controls
  // =========================
  function bindControls(currentIndex) {
    const items = $("#collect .b-post__partcontent_item");

    items.off();

    items.on("hover:focus", function () {
      items.removeClass("focus");
      $(this).addClass("focus");
    });

    items.on("hover:enter", function () {
      const id = $(this).data("id");
      const type = $(this).data("type");

      openMovie(id, type);
    });

    setTimeout(() => {
      items.eq(currentIndex).trigger("hover:focus");
    }, 200);
  }

  // =========================
  // Style
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
          transition:.2s;
        }

        .b-post__partcontent_item.focus{
          background:rgba(255,255,255,.18);
          transform:scale(1.01);
        }

        .b-post__partcontent_item.current{
          border-left:4px solid #fff;
        }

        .td{
          flex:1;
          overflow:hidden;
          text-overflow:ellipsis;
          white-space:nowrap;
        }

        .num{
          max-width:45px;
          text-align:center;
          opacity:.6;
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
      const currentMethod = e.object.method;

      const franchise = findFranchise(tmdbId);

      if (franchise) {
        renderCollection(
          franchise,
          tmdbId,
          currentMethod
        );
      }
    });
  }

  startPlugin();
})();