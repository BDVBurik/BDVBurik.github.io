(function () {
  "use strict";

  // ===== Локалізація =====
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
    show_ru: { ru: "Показывать 🇷🇺 RU", en: "Show 🇷🇺 RU" },
    show_en: { ru: "Показывать 🇺🇸 EN", en: "Show 🇺🇸 EN" },
    show_tl: { ru: "Показывать 🇯🇵 Romaji", en: "Show 🇯🇵 Romaji" },
    show_uk: { ru: "Показывать 🇺🇦 UA", en: "Show 🇺🇦 UA" },
    show_be: { ru: "Показывать 🇧🇾 BE", en: "Show 🇧🇾 BE" },
  });

  const ORDER_KEY = "title_plugin_order";
  const DEFAULT_ORDER = ["orig", "tl", "en", "ru", "uk", "be"];

  function startPlugin() {
    // ===== Settings root =====
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

    // ===== Перемикачі мов =====
    ["ru", "en", "tl", "uk", "be"].forEach((l) => {
      Lampa.SettingsApi.addParam({
        component: "title_plugin",
        param: { type: "trigger", default: true, name: "show_" + l },
        field: { name: Lampa.Lang.translate("show_" + l) },
      });
    });

    // ===== Порядок =====
    Lampa.SettingsApi.addParam({
      component: "title_plugin",
      param: { type: "button" },
      field: { name: Lampa.Lang.translate("title_order") },
      onChange: openOrderEditor,
    });

    function openOrderEditor() {
      let order = Lampa.Storage.get(ORDER_KEY, DEFAULT_ORDER.slice());

      const labels = {
        orig: "Original",
        tl: "Romaji",
        en: "EN",
        ru: "RU",
        uk: "UA",
        be: "BE",
      };

      const list = $("<div class='menu-edit-list'></div>");

      function redraw() {
        list.empty();
        order.forEach((key, i) => {
          const item = $(`
            <div class="menu-edit-list__item">
              <div class="menu-edit-list__title">${labels[key]}</div>
              <div class="menu-edit-list__move up selector">▲</div>
              <div class="menu-edit-list__move down selector">▼</div>
            </div>
          `);

          item.find(".up").on("hover:enter", () => {
            if (i > 0) {
              [order[i - 1], order[i]] = [order[i], order[i - 1]];
              redraw();
            }
          });

          item.find(".down").on("hover:enter", () => {
            if (i < order.length - 1) {
              [order[i + 1], order[i]] = [order[i], order[i + 1]];
              redraw();
            }
          });

          list.append(item);
        });
      }

      redraw();

      Lampa.Modal.open({
        title: Lampa.Lang.translate("title_order"),
        html: list,
        size: "small",
        onBack: () => {
          Lampa.Storage.set(ORDER_KEY, order);
          Lampa.Modal.close();
        },
      });
    }

    // ===== Логіка відображення =====
    async function showTitles(card) {
      const orig = card.original_title || card.original_name;
      const alt = card.alternative_titles?.titles || [];

      const data = {
        orig,
        tl: alt.find((t) => t.type === "romaji")?.title,
        ru: alt.find((t) => t.iso_3166_1 === "RU")?.title,
        en: alt.find((t) => t.iso_3166_1 === "US")?.title,
        uk: alt.find((t) => t.iso_3166_1 === "UA")?.title,
        be: alt.find((t) => t.iso_3166_1 === "BY")?.title,
      };

      const render = Lampa.Activity.active().activity.render();
      $(".original_title", render).remove();

      const order = Lampa.Storage.get(ORDER_KEY, DEFAULT_ORDER);
      const flags = {
        ru: "🇷🇺",
        en: "🇺🇸",
        uk: "🇺🇦",
        be: "🇧🇾",
      };

      const lines = [];

      order.forEach((key) => {
        if (key !== "orig" && !Lampa.Storage.get("show_" + key, true)) return;
        if (!data[key]) return;

        const flag = flags[key] || "";
        lines.push(`<div style="font-size:1.25em;">${data[key]} ${flag}</div>`);
      });

      $(".full-start-new__title", render).after(`
        <div class="original_title" style="margin-bottom:7px;text-align:right">
          ${lines.join("")}
        </div>
      `);
    }

    // ===== Listener =====
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
