(function () {
  "use strict";

  /* ================= ЛОКАЛИЗАЦИЯ ================= */

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
    show_ru: { ru: "🇷🇺 Русский" },
    show_en: { ru: "🇺🇸 English" },
    show_tl: { ru: "🇯🇵 Romaji" },
    show_uk: { ru: "🇺🇦 Українська" },
    show_be: { ru: "🇧🇾 Беларуская" },
    show_orig: { ru: "🎬 Оригинал" },
  });

  const LANGS = [
    { id: "orig", label: "show_orig" },
    { id: "tl", label: "show_tl" },
    { id: "en", label: "show_en" },
    { id: "ru", label: "show_ru" },
    { id: "uk", label: "show_uk" },
    { id: "be", label: "show_be" },
  ];

  const ORDER_KEY = "title_lang_order";
  const ENABLE_KEY = "title_lang_enabled";

  function startPlugin() {
    Lampa.Template.add("settings_title_plugin", `<div></div>`);

    /* ========== ПУНКТ В НАСТРОЙКАХ ========== */

    Lampa.SettingsApi.addParam({
      component: "interface",
      param: { type: "button" },
      field: {
        name: Lampa.Lang.translate("title_plugin"),
        description: "Title Plugin settings",
      },
      onChange: () => {
        Lampa.Settings.create("title_plugin", {
          onBack: () => Lampa.Settings.create("interface"),
        });
      },
    });

    /* ========== ИНИЦИАЛИЗАЦИЯ STORAGE ========== */

    let order = Lampa.Storage.get(ORDER_KEY);
    if (!Array.isArray(order)) {
      order = LANGS.map((l) => l.id);
      Lampa.Storage.set(ORDER_KEY, order);
    }

    let enabled = Lampa.Storage.get(ENABLE_KEY) || {};
    LANGS.forEach((l) => {
      if (!(l.id in enabled)) enabled[l.id] = true;
    });
    Lampa.Storage.set(ENABLE_KEY, enabled);

    /* ========== НАСТРОЙКА ПОРЯДКА ========== */

    Lampa.SettingsApi.addParam({
      component: "title_plugin",
      param: { type: "static" },
      field: {
        name: Lampa.Lang.translate("title_order"),
      },
    });

    function renderOrderMenu() {
      const list = $("<div class='menu-edit-list'></div>");

      order.forEach((id) => {
        const lang = LANGS.find((l) => l.id === id);
        if (!lang) return;

        const item = $(`
          <div class="menu-edit-list__item">
            <div class="menu-edit-list__title">${Lampa.Lang.translate(
              lang.label
            )}</div>
            <div class="menu-edit-list__move move-up selector">⬆</div>
            <div class="menu-edit-list__move move-down selector">⬇</div>
            <div class="menu-edit-list__toggle selector">
              ${enabled[id] ? "✔" : "✖"}
            </div>
          </div>
        `);

        item.find(".move-up").on("hover:enter", () => {
          const i = order.indexOf(id);
          if (i > 0) {
            [order[i - 1], order[i]] = [order[i], order[i - 1]];
            Lampa.Storage.set(ORDER_KEY, order);
            openSettings();
          }
        });

        item.find(".move-down").on("hover:enter", () => {
          const i = order.indexOf(id);
          if (i < order.length - 1) {
            [order[i + 1], order[i]] = [order[i], order[i + 1]];
            Lampa.Storage.set(ORDER_KEY, order);
            openSettings();
          }
        });

        item.find(".menu-edit-list__toggle").on("hover:enter", () => {
          enabled[id] = !enabled[id];
          Lampa.Storage.set(ENABLE_KEY, enabled);
          openSettings();
        });

        list.append(item);
      });

      return list;
    }

    function openSettings() {
      Lampa.Modal.open({
        title: Lampa.Lang.translate("title_plugin"),
        html: renderOrderMenu(),
        size: "small",
        onBack: () => {
          Lampa.Modal.close();
          Lampa.Controller.toggle("full_start");
        },
      });
    }

    Lampa.SettingsApi.addParam({
      component: "title_plugin",
      param: { type: "button" },
      field: { name: Lampa.Lang.translate("title_order") },
      onChange: openSettings,
    });

    /* ========== ОТРИСОВКА НАЗВАНИЙ ========== */

    async function showTitles(card) {
      const orig = card.original_title || card.original_name;
      const alt = card.alternative_titles?.titles || [];

      const map = {
        orig: orig,
        tl: alt.find((t) => /roma|latin/i.test(t.type))?.title,
        en: alt.find((t) => t.iso_3166_1 === "US")?.title,
        ru: alt.find((t) => t.iso_3166_1 === "RU")?.title,
        uk: alt.find((t) => t.iso_3166_1 === "UA")?.title,
        be: alt.find((t) => t.iso_3166_1 === "BY")?.title,
      };

      const render = Lampa.Activity.active().activity.render();
      if (!render) return;

      $(".original_title", render).remove();

      const lines = [];
      order.forEach((id) => {
        if (enabled[id] && map[id]) {
          lines.push(`<div style="font-size:1.25em;">${map[id]}</div>`);
        }
      });

      if (!lines.length) return;

      $(".full-start-new__title", render).after(`
        <div class="original_title" style="margin-bottom:7px;text-align:right">
          ${lines.join("")}
        </div>
      `);
    }

    /* ========== LISTENER ========== */

    if (!window.title_plugin) {
      window.title_plugin = true;
      Lampa.Listener.follow("full", (e) => {
        if (e.type !== "complite" || !e.data.movie) return;
        showTitles(e.data.movie);
      });
    }
  }

  if (window.appready) startPlugin();
  else
    Lampa.Listener.follow("app", (e) => {
      if (e.type === "ready") startPlugin();
    });
})();
