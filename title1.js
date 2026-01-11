(function () {
  "use strict";

  /* ================== ЛОКАЛИЗАЦИЯ ================== */
  Lampa.Lang.add({
    title_plugin: {
      ru: "Title Plugin",
      en: "Title Plugin",
      uk: "Title Plugin",
      be: "Title Plugin",
    },
    title_order: {
      ru: "Порядок названий",
      en: "Title order",
      uk: "Порядок назв",
      be: "Парадак назваў",
    },
    show_ru: { ru: "🇷🇺 Русский", en: "🇷🇺 Russian" },
    show_en: { ru: "🇺🇸 Английский", en: "🇺🇸 English" },
    show_tl: { ru: "🇯🇵 Romaji", en: "🇯🇵 Romaji" },
    show_uk: { ru: "🇺🇦 Украинский", en: "🇺🇦 Ukrainian" },
    show_be: { ru: "🇧🇾 Белорусский", en: "🇧🇾 Belarusian" },
  });

  const LANGS = [
    { id: "orig", label: "Original" },
    { id: "tl", label: "🇯🇵 Romaji" },
    { id: "en", label: "🇺🇸 English" },
    { id: "ru", label: "🇷🇺 Русский" },
    { id: "uk", label: "🇺🇦 Ukrainian" },
    { id: "be", label: "🇧🇾 Belarusian" },
  ];

  const ORDER_KEY = "title_plugin_order";
  const CACHE_KEY = "title_cache";
  const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

  function getOrder() {
    return Lampa.Storage.get(
      ORDER_KEY,
      LANGS.map((l) => l.id)
    );
  }

  function setOrder(order) {
    Lampa.Storage.set(ORDER_KEY, order);
  }

  function startPlugin() {
    /* ================== НАСТРОЙКИ ================== */
    Lampa.SettingsApi.addParam({
      component: "interface",
      param: { type: "button" },
      field: {
        name: Lampa.Lang.translate("title_plugin"),
        description: "Titles & order",
      },
      onChange: () => {
        Lampa.Settings.create("title_plugin", {
          onBack: () => Lampa.Settings.create("interface"),
        });
      },
    });

    ["ru", "en", "tl", "uk", "be"].forEach((l) => {
      Lampa.SettingsApi.addParam({
        component: "title_plugin",
        param: { type: "trigger", default: true, name: "show_" + l },
        field: { name: Lampa.Lang.translate("show_" + l) },
      });
    });

    /* ====== РЕДАКТОР ПОРЯДКА ====== */
    Lampa.SettingsApi.addParam({
      component: "title_plugin",
      param: { type: "button" },
      field: { name: Lampa.Lang.translate("title_order") },
      onChange: openOrderEditor,
    });

    /* ================== РЕНДЕР ================== */
    let cache = Lampa.Storage.get(CACHE_KEY, {});

    async function showTitles(card) {
      const now = Date.now();
      const orig = card.original_title || card.original_name;
      let ru, en, uk, be, tl;

      if (cache[card.id] && now - cache[card.id].ts < CACHE_TTL) {
        ({ ru, en, uk, be, tl } = cache[card.id]);
      }

      if (!ru || !en || !tl || !uk || !be) {
        try {
          const type = card.first_air_date ? "tv" : "movie";
          const data = await new Promise((res, rej) =>
            Lampa.Api.sources.tmdb.get(
              `${type}/${card.id}?append_to_response=translations`,
              {},
              res,
              rej
            )
          );

          const tr = data.translations?.translations || [];
          const find = (iso) =>
            tr.find((t) => t.iso_639_1 === iso || t.iso_3166_1 === iso)?.data
              ?.title ||
            tr.find((t) => t.iso_639_1 === iso || t.iso_3166_1 === iso)?.data
              ?.name;

          ru ||= find("ru");
          en ||= find("en");
          uk ||= find("uk");
          be ||= find("be");
          tl ||= tr.find((t) => t.type === "Transliteration")?.data?.title;

          cache[card.id] = { ru, en, uk, be, tl, ts: now };
          Lampa.Storage.set(CACHE_KEY, cache);
        } catch (e) {
          console.error(e);
        }
      }

      const render = Lampa.Activity.active().activity.render();
      if (!render) return;

      $(".original_title", render).remove();

      const order = getOrder();
      const lines = [];

      order.forEach((id) => {
        if (id === "orig") lines.push(`<div>${orig}</div>`);
        if (id === "tl" && tl && Lampa.Storage.get("show_tl", true))
          lines.push(`<div>${tl}</div>`);
        if (id === "en" && en && Lampa.Storage.get("show_en", true))
          lines.push(`<div>${en} 🇺🇸</div>`);
        if (id === "ru" && ru && Lampa.Storage.get("show_ru", true))
          lines.push(`<div>${ru} 🇷🇺</div>`);
        if (id === "uk" && uk && Lampa.Storage.get("show_uk", true))
          lines.push(`<div>${uk} 🇺🇦</div>`);
        if (id === "be" && be && Lampa.Storage.get("show_be", true))
          lines.push(`<div>${be} 🇧🇾</div>`);
      });

      $(".full-start-new__title", render).after(`
        <div class="original_title" style="text-align:right;margin-bottom:6px">
          <div style="font-size:1.25em">${lines.join("")}</div>
        </div>
      `);
    }

    /* ================== EDITOR UI ================== */
    function openOrderEditor() {
      const order = getOrder();
      const list = $("<div class='menu-edit-list'></div>");

      order.forEach((id) => {
        const lang = LANGS.find((l) => l.id === id);
        const item = $(`
          <div class="menu-edit-list__item selector">
            <div class="menu-edit-list__title">${lang.label}</div>
            <div class="menu-edit-list__move up">▲</div>
            <div class="menu-edit-list__move down">▼</div>
          </div>
        `);

        item.find(".up").on("hover:enter", () => {
          const i = order.indexOf(id);
          if (i > 0) [order[i - 1], order[i]] = [order[i], order[i - 1]];
          setOrder(order);
          openOrderEditor();
        });

        item.find(".down").on("hover:enter", () => {
          const i = order.indexOf(id);
          if (i < order.length - 1)
            [order[i + 1], order[i]] = [order[i], order[i + 1]];
          setOrder(order);
          openOrderEditor();
        });

        list.append(item);
      });

      Lampa.Modal.open({
        title: Lampa.Lang.translate("title_order"),
        html: list,
        size: "small",
        onBack: () => Lampa.Modal.close(),
      });
    }

    /* ================== LISTENER ================== */
    if (!window.title_plugin) {
      window.title_plugin = true;
      Lampa.Listener.follow("full", (e) => {
        if (e.type !== "complite" || !e.data.movie) return;
        showTitles(e.data.movie);
      });
    }
  }

  if (window.appready) startPlugin();
  else Lampa.Listener.follow("app", (e) => e.type === "ready" && startPlugin());
})();
