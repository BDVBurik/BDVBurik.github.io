(function () {
  // BDVBurik 2024
  "use strict";

  async function titleOrigin(card) {
    const params = {
      id: card.id,
      url: card.first_air_date
        ? "https://worker-patient-dream-26d7.bdvburik.workers.dev:8443/https://api.themoviedb.org/3/tv/"
        : "https://worker-patient-dream-26d7.bdvburik.workers.dev:8443/https://api.themoviedb.org/3/movie/",
      urlEnd: "&api_key=4ef0d7355d9ffb5151e987764708ce96",
    };

    const getTitle = async (lang) => {
      try {
        const res = await fetch(
          `${params.url}${params.id}?language=${lang}${params.urlEnd}`,
          { method: "GET", headers: { accept: "application/json" } }
        );
        const data = await res.json();
        return data.title || data.name || "";
      } catch (e) {
        console.error("Error fetching title:", e);
        return "";
      }
    };

    const [etEnTitle, etRuTitle] = await Promise.all([
      getTitle("en-US"),
      getTitle("ru-RU"),
    ]);

    _showEnTitle(etEnTitle, etRuTitle);

    function _showEnTitle(enTitle, ruTitle) {
      if (!enTitle) return;
      const render = Lampa.Activity.active().activity.render();
      const ruHtml =
        Lampa.Storage.get("language") !== "ru"
          ? `<div style='font-size:1.3em'>Ru: ${ruTitle}</div>`
          : "";

      $(".original_title", render)
        .find("> div")
        .eq(0)
        .after(
          `<div id='titleen'>
              <div>
                <div style='font-size:1.3em'>En: ${enTitle}</div>
                ${ruHtml}
                <div style='font-size:1.3em'>Orig: ${
                  card.original_title || card.original_name
                }</div>
              </div>
           </div>`
        );
    }
  }

  function startPlugin() {
    if (window.title_plugin) return;
    window.title_plugin = true;

    Lampa.Listener.follow("full", (e) => {
      if (e.type !== "complite") return;

      const render = e.object.activity.render();
      $(".original_title", render).remove();
      $(".full-start-new__title", render).after(
        '<div class="original_title" style="margin-top:-0.8em;text-align:right;"><div>'
      );

      titleOrigin(e.data.movie);

      // Минимальные отступы
      $(".full-start-new__rate-line").css("margin-bottom", "0.8em");
      $(".full-start-new__details").css("margin-bottom", "0.8em");
      $(".full-start-new__tagline").css("margin-bottom", "0.4em");
    });
  }

  startPlugin();
})();
