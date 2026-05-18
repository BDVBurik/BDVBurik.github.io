(function () {
  "use strict";

  const DATA_URL =
    "https://BDVBurik.github.io/lampa_export.json";

  let franchises = [];
  let loaded = false;

  const tmdbCache = {};

  // =========================
  // LOAD DB
  // =========================
  async function loadDatabase() {
    if (loaded) return;

    try {
      const response = await fetch(DATA_URL);
      franchises = await response.json();
      loaded = true;

      console.log("Franchise DB loaded:", franchises.length);
    } catch (e) {
      console.error("Franchise DB error", e);
    }
  }

  // =========================
  // FIND FRANCHISE
  // =========================
  function findFranchise(tmdbId) {
    const id = String(tmdbId);

    for (const fr of franchises) {
      for (const mv of fr.m || []) {
        if (String(mv.t_id) === id) return fr;
      }
    }

    return null;
  }

  // =========================
  // OPEN CARD
  // =========================
  function openMovie(tmdbId, mediaType) {
    Lampa.Activity.push({
      url: "",
      component: "full",
      id: Number(tmdbId),
      method: mediaType || "movie",
      card: {
        id: Number(tmdbId),
        media_type: mediaType || "movie"
      }
    });
  }

  // =========================
  // TMDB FETCH (year + rating)
  // =========================
  async function getTmdbInfo(id, type) {
    if (!id) return null;

    if (tmdbCache[id]) return tmdbCache[id];

    try {
      const url =
        "https://api.themoviedb.org/3/" +
        type +
        "/" +
        id +
        "?api_key=" +
        Lampa.TMDB.key() +
        "&language=ru-RU";

      const res = await fetch(url);
      const data = await res.json();

      const info = {
        year: (data.release_date || data.first_air_date || "").slice(0, 4),
        rating: data.vote_average || ""
      };

      tmdbCache[id] = info;

      return info;
    } catch (e) {
      return null;
    }
  }

  // =========================
  // RENDER
  // =========================
  function renderCollection(franchise, currentTmdbId, currentMethod) {
    if (!franchise?.m?.length) return;

    $(".collection").remove();

    let html = "";
    let focusIndex = 0;

    const total = franchise.m.length;

    franchise.m.forEach((movie, index) => {
      const id = movie.t_id;
      const isCurrent = String(id) === String(currentTmdbId);

      if (isCurrent) focusIndex = index;

      const displayIndex = total - index;

      html += `
    <div
      class="b-post__partcontent_item selector ${isCurrent ? "current focus" : ""}"
      data-id="${id}"
      data-type="${movie.type || currentMethod || "movie"}"
    >
      <span class="td num">${displayIndex}</span>
      <span class="td title">${movie.t || ""}</span>
      <span class="td year" id="y-${id}"></span>
      <span class="td rating" id="r-${id}"></span>
    </div>
  `;
    });

    const block = $(`
      <div id="collect" class="collection">
        ${html}
      </div>
    `);

    const container = $(".full-descr__left");

    container.css({
      "overflow": "hidden",
      "position": "relative"
    });

    container.append(block);

    bindControls(focusIndex);

    // =========================
    // ASYNC TMDB ENRICHMENT
    // =========================
    franchise.m.forEach(async (movie) => {
      const id = movie.t_id;
      const type = movie.type || "movie";

      const info = await getTmdbInfo(id, type);
      if (!info) return;

      if (info.year) $(`#y-${id}`).text(info.year);
      if (info.rating) $(`#r-${id}`).text(info.rating.toFixed(1));
    });
  }

  // =========================
  // CONTROLS
  // =========================
  function bindControls(focusIndex) {
    const items = $("#collect .b-post__partcontent_item");

    items.off("hover:enter hover:focus");

    items.on("hover:focus", function () {
      items.removeClass("focus");
      $(this).addClass("focus");

      const parent = $("#collect");
      const top = $(this).position().top;
      const height = $(this).outerHeight();

      parent.stop().animate({
        scrollTop:
          parent.scrollTop() +
          top -
          parent.height() / 2 +
          height / 2
      }, 120);
    });

    items.on("hover:enter", function () {
      openMovie(
        $(this).data("id"),
        $(this).data("type")
      );
    });

    setTimeout(() => {
      items.eq(focusIndex).trigger("hover:focus");
    }, 150);
  }
  // =========================
  // STYLE
  // =========================
  function injectStyle() {
    if ($("#franchise-style").length) return;

    $("head").append(`
    <style id="franchise-style">

      #collect{
        display:flex !important;
        flex-direction:column !important;
        gap:.15em !important;
        margin-top:1em !important;

        max-height:42vh !important;
        overflow-y:auto !important;
        overflow-x:hidden !important;

        padding-right:8px !important;
      }

      #collect::-webkit-scrollbar{
        width:4px;
      }

      #collect::-webkit-scrollbar-thumb{
        background:rgba(255,255,255,.25);
        border-radius:4px;
      }

      #collect .b-post__partcontent_item{
        display:flex !important;
        align-items:center !important;

        min-height:48px !important;
        flex-shrink:0 !important;

        padding:.7em 1em !important;
        border-radius:.4em !important;
        background:rgba(255,255,255,.05) !important;

        transition:all .15s ease;
      }

      #collect .b-post__partcontent_item.focus{
        background:rgba(255,255,255,.22) !important;
        transform:scale(1.015);
      }

      #collect .b-post__partcontent_item.current{
        border-left:4px solid #fff !important;
      }

      #collect .td{
        overflow:hidden;
        white-space:nowrap;
        text-overflow:ellipsis;
      }

      #collect .num{
        width:44px;
        text-align:center;
        flex-shrink:0;
      }

      #collect .title{
        flex:1;
        padding:0 .8em;
      }

      #collect .year{
        width:72px;
        text-align:right;
        flex-shrink:0;
      }

      #collect .rating{
        width:60px;
        text-align:center;
        flex-shrink:0;
      }

    </style>
  `);
  }

  // =========================
  // INIT
  // =========================
  async function start() {
    if (window.franchise_json_plugin) return;
    window.franchise_json_plugin = true;

    await loadDatabase();
    injectStyle();

    Lampa.Listener.follow("full", function (e) {
      if (e.type !== "complite") return;

      const tmdbId = e.data.movie.id;
      const method = e.object.method;

      const franchise = findFranchise(tmdbId);

      if (franchise) {
        renderCollection(franchise, tmdbId, method);
      }
    });
  }

  start();
})();