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

    const response = await fetch(DATA_URL);
    franchises = await response.json();
    loaded = true;
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
  function openMovie(id, media) {
    window.location.assign(
      location.origin +
      "/?card=" +
      id +
      "&media=" +
      media +
      "&source=tmdb"
    );
  }

  // =========================
  // Card HTML
  // =========================
  function createCard(movie, currentId) {
    const current =
      String(movie.tmdb_id) === String(currentId);

    const media = movie.media_type || "movie";

    const poster = movie.poster
      ? movie.poster.replace("/w500/", "/w300/")
      : "";

    return `
      <div class="card selector ${current ? "focus" : ""
      }"
        data-id="${movie.tmdb_id}"
        data-media="${media}">

        <div class="card__view">
          <img src="${poster}" class="card__img">

          <div class="card__icons">
            <div class="card__icons-inner"></div>
          </div>

          <div class="card__vote">
            ${movie.imdb_rating || ""}
          </div>

          <div class="card--content-type ${media}">
            ${media}
          </div>
        </div>

        <div class="card__title">
          ${movie.title || ""}
        </div>

        <div class="card__age">
          ${movie.year || ""}
        </div>
      </div>
    `;
  }

  // =========================
  // Render line
  // =========================
  function renderCollection(franchise, currentId) {
    $(".franchise-line").remove();

    const cards = franchise.movies
      .map((m) => createCard(m, currentId))
      .join("");

    const html = $(`
      <div class="items-line franchise-line layer--visible layer--render items-line--type-default">
        <div class="items-line__head">
          <div class="items-line__title">
            Коллекция
          </div>
        </div>

        <div class="items-line__body">
          <div class="scroll scroll--horizontal">
            <div class="scroll__content">
              <div class="scroll__body mapping--line">
                ${cards}
              </div>
            </div>
          </div>
        </div>
      </div>
    `);

    $(".full-descr").after(html);

    bindControls();
  }

  // =========================
  // Controls
  // =========================
  function bindControls() {
    const cards = $(".franchise-line .card");

    cards.on("hover:focus", function () {
      cards.removeClass("focus");
      $(this).addClass("focus");
    });

    cards.on("hover:enter", function () {
      openMovie(
        $(this).data("id"),
        $(this).data("media")
      );
    });
  }

  // =========================
  // Style tweaks
  // =========================
  function injectStyle() {
    if ($("#franchise-style").length) return;

    $("head").append(`
      <style id="franchise-style">

        .franchise-line{
          margin-top:2em;
        }

        .franchise-line .card{
          min-width:14em;
        }

        .franchise-line .card__vote{
          color:cornflowerblue;
        }

      </style>
    `);
  }

  // =========================
  // Init
  // =========================
  async function startPlugin() {
    if (window.franchise_cards_plugin) return;
    window.franchise_cards_plugin = true;

    await loadDatabase();
    injectStyle();

    Lampa.Listener.follow("full", function (e) {
      if (e.type !== "complite") return;

      const franchise = findFranchise(
        e.data.movie.id
      );

      if (franchise) {
        renderCollection(
          franchise,
          e.data.movie.id
        );
      }
    });
  }

  startPlugin();
})();