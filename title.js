(function () {
  "use strict";
  //BDVBurik.github.io Title Plugin
  //2025

  const storageKey = "title_cache"; // ключ в Lampa.Storage
  const CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 дней
  let titleCache = Lampa.Storage.get(storageKey) || {};

  async function titleOrigin(card) {
    const now = Date.now();
    const cacheItem = titleCache[card.id];

    // Если есть кэш — показываем сразу
    if (cacheItem) {
      _showEnTitle(cacheItem.en, cacheItem.ru);
    }

    // Проверка срока жизни кэша
    if (cacheItem && now - cacheItem.timestamp < CACHE_TTL) {
      return; // кэш свежий, не обновляем
    }

    // Параметры TMDB
    const params = {
      id: card.id,
      url: card.first_air_date
        ? "https://worker-patient-dream-26d7.bdvburik.workers.dev:8443/https://api.themoviedb.org/3/tv/"
        : "https://worker-patient-dream-26d7.bdvburik.workers.dev:8443/https://api.themoviedb.org/3/movie/",
      urlEnd: "&api_key=4ef0d7355d9ffb5151e987764708ce96",
    };
    const getOptions = {
      method: "GET",
      headers: { accept: "application/json" },
    };

    // Функция получения названия по языку
    async function fetchTitle(lang) {
      const res = await fetch(
        params.url + params.id + "?language=" + lang + params.urlEnd,
        getOptions
      );
      const data = await res.json();
      return data.title || data.name;
    }

    // Параллельная загрузка
    const [etEnTitle, etRuTitle] = await Promise.all([
      fetchTitle("en-US"),
      fetchTitle("ru-RU"),
    ]);

    // Обновляем кэш
    titleCache[card.id] = { en: etEnTitle, ru: etRuTitle, timestamp: now };
    Lampa.Storage.set(storageKey, titleCache);

    // Показываем обновлённые данные
    _showEnTitle(etEnTitle, etRuTitle);

    function _showEnTitle(en, ru) {
      if (!en) return;
      const render = Lampa.Activity.active().activity.render();
      let ruHtml = "";
      if (Lampa.Storage.get("language") !== "ru") {
        ruHtml = `<div style='font-size:1.3em;'>Ru: ${ru}</div>`;
      }
      $(".original_title", render).find("> div").eq(0).after(`
          <div id='titleen'>
            <div>
              <div style='font-size:1.3em;'>En: ${en}</div>
              ${ruHtml}
              <div style='font-size:1.3em;'>Orig: ${
                card.original_title || card.original_name
              }</div>
            </div>
          </div>
        `);
    }
  }

  function startPlugin() {
    window.title_plugin = true;
    Lampa.Listener.follow("full", function (e) {
      if (e.type === "complite") {
        const render = e.object.activity.render();
        $(".original_title", render).remove();
        $(".full-start-new__title", render).after(
          '<div class="original_title" style="margin-top:-0.8em;text-align:right;"><div>'
        );

        titleOrigin(e.data.movie);

        $(".full-start-new__rate-line").css("margin-bottom", "0.8em");
        $(".full-start-new__details").css("margin-bottom", "0.8em");
        $(".full-start-new__tagline").css("margin-bottom", "0.4em");
      }
    });
  }

  if (!window.title_plugin) startPlugin();
})();
