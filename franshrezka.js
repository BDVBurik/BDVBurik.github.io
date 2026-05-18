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
    mediaType = mediaType || "movie";

    Lampa.Activity.push({
      url: "",
      component: "full",
      id: Number(tmdbId),
      method: mediaType,
      card: {
        id: Number(tmdbId),
        media_type: mediaType
      }
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

    $(".items-line__body").append(block);
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

      /* изоляция от других плагинов */
      #collect,
      #collect *{
        box-sizing:border-box !important;
      }

      #collect{
        display:block !important;
        position:relative !important;
        width:100% !important;
        max-width:100% !important;
        overflow:hidden !important;
        margin-top:1.5em !important;
        clear:both !important;
        flex:none !important;
      }

      /* ломает конфликт с uacoments */
      .items-line__body #collect{
        width:100% !important;
        min-width:0 !important;
        flex:0 0 auto !important;
      }

      #collect.collection{
        display:flex !important;
        flex-direction:column !important;
        gap:.15em !important;
      }

      #collect .b-post__partcontent_item{
        display:flex !important;
        width:100% !important;
        min-width:0 !important;
        align-items:center !important;
        padding:.8em 1em !important;
        border-radius:.4em !important;
        background:rgba(255,255,255,.04) !important;
        overflow:hidden !important;
      }

      #collect .b-post__partcontent_item.focus{
        background:rgba(255,255,255,.18) !important;
      }

      #collect .b-post__partcontent_item.current{
        border-left:4px solid #fff !important;
      }

      #collect .td{
        min-width:0 !important;
        overflow:hidden !important;
        text-overflow:ellipsis !important;
        white-space:nowrap !important;
      }

      #collect .num{
        flex:0 0 45px !important;
        text-align:center;
      }

      #collect .title{
        flex:1 1 auto !important;
      }

      #collect .year{
        flex:0 0 80px !important;
        text-align:right;
      }

      #collect .rating{
        flex:0 0 60px !important;
        text-align:center;
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