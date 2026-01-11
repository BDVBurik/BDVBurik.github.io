(function () {
  "use strict";

  /* ================= Локализация ================= */

  Lampa.Lang.add({
    title_plugin: {
      ru: "Title Plugin",
      en: "Title Plugin",
      uk: "Title Plugin",
      be: "Title Plugin",
    },
    title_plugin_order: {
      ru: "Порядок названий",
      en: "Title order",
      uk: "Порядок назв",
      be: "Парадак назваў",
    },
    show_ru: {
      ru: "Показывать 🇷🇺 RU",
      en: "Show 🇷🇺 RU",
      uk: "Показувати 🇷🇺 RU",
      be: "Паказваць 🇷🇺 RU",
    },
    show_en: {
      ru: "Показывать 🇺🇸 EN",
      en: "Show 🇺🇸 EN",
      uk: "Показувати 🇺🇸 EN",
      be: "Паказваць 🇺🇸 EN",
    },
    show_tl: {
      ru: "Показывать 🇯🇵 Romaji",
      en: "Show 🇯🇵 Romaji",
      uk: "Показувати 🇯🇵 Romaji",
      be: "Паказваць 🇯🇵 Romaji",
    },
    show_uk: {
      ru: "Показывать 🇺🇦 UA",
      en: "Show 🇺🇦 UA",
      uk: "Показувати 🇺🇦 UA",
      be: "Паказваць 🇺🇦 UA",
    },
    show_be: {
      ru: "Показывать 🇧🇾 BE",
      en: "Show 🇧🇾 BE",
      uk: "Показувати 🇧🇾 BE",
      be: "Паказваць 🇧🇾 BE",
    },
  });

  /* ================= Константы ================= */

  const ORDER_KEY = "title_plugin_order";
  const DEFAULT_ORDER = ["orig", "tl", "en", "ru", "uk", "be"];

  const TITLE_LABELS = {
    orig: "Оригинал",
    tl: "Romaji",
    en: "EN 🇺🇸",
    ru: "RU 🇷🇺",
    uk: "UA 🇺🇦",
    be: "BE 🇧🇾",
  };

  function getOrder() {
    return Lampa.Storage.get(ORDER_KEY, DEFAULT_ORDER.slice());
  }

  function setOrder(order) {
    Lampa.Storage.set(ORDER_KEY, order);
  }

  /* ================= Старт ================= */

  function startPlugin() {
    /* ===== Меню настроек ===== */

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

    /* ===== Переключатели языков ===== */

    ["ru", "en", "tl", "uk", "be"].forEach((l) => {
      Lampa.SettingsApi.addParam({
        component: "title_plugin",
        param: { type: "trigger", default: true, name: "show_" + l },
        field: { name: Lampa.Lang.translate("show_" + l) },
      });
    });

    /* ===== Порядок ===== */

    Lampa.SettingsApi.addParam({
      component: "title_plugin",
      param: { type: "button" },
      field: {
        name: Lampa.Lang.translate("title_plugin_order"),
      },
      onChange: openOrderDialog,
    });

    /* ================= Диалог порядка ================= */

    function openOrderDialog() {
      let order = getOrder();
      const list = $("<div class='menu-edit-list'></div>");

      function render() {
        list.empty();

        order.forEach((key, index) => {
          const item = $(`
            <div class="menu-edit-list__item">
              <div class="menu-edit-list__title">${TITLE_LABELS[key]}</div>
              <div class="menu-edit-list__move up selector">▲</div>
              <div class="menu-edit-list__move down selector">▼</div>
            </div>
          `);

          item.find(".up").on("hover:enter", () => {
            if (index > 0) {
              [order[index - 1], order[index]] = [
                order[index],
                order[index - 1],
              ];
              setOrder(order);
              render();
            }
          });

          item.find(".down").on("hover:enter", () => {
            if (index < order.length - 1) {
              [order[index + 1], order[index]] = [
                order[index],
                order[index + 1],
              ];
              setOrder(order);
              render();
            }
          });

          list.append(item);
        });
      }

      render();

      Lampa.Modal.open({
        title: Lampa.Lang.translate("title_plugin_order"),
        html: list,
        size: "small",
        onBack: () => Lampa.Modal.close(),
      });
    }

    /* ================= Логика отображения ================= */

    async function showTitles(card) {
      const orig = card.original_title || card.original_name;

      let ru, en, uk, be, tl;

      const alt =
        card.alternative_titles?.titles ||
        card.alternative_titles?.results ||
        [];

      tl = alt.find((t) => /roma|latin|kana/i.test(t.type || ""))?.title;
      ru = alt.find((t) => t.iso_3166_1 === "RU")?.title;
      en = alt.find((t) => t.iso_3166_1 === "US")?.title;
      uk = alt.find((t) => t.iso_3166_1 === "UA")?.title;
      be = alt.find((t) => t.iso_3166_1 === "BY")?.title;

      const values = { orig, ru, en, uk, be, tl };
      const enabled = {
        orig: true,
        ru: Lampa.Storage.get("show_ru", true),
        en: Lampa.Storage.get("show_en", true),
        uk: Lampa.Storage.get("show_uk", true),
        be: Lampa.Storage.get("show_be", true),
        tl: Lampa.Storage.get("show_tl", true),
      };

      const order = getOrder();
      const lines = [];

      order.forEach((key) => {
        if (!enabled[key]) return;
        if (!values[key]) return;

        lines.push(`<div style="font-size:1.25em">${values[key]}</div>`);
      });

      const render = Lampa.Activity.active().activity.render();
      $(".original_title", render).remove();

      $(".full-start-new__title", render).after(`
        <div class="original_title" style="margin-bottom:7px;text-align:right">
          ${lines.join("")}
        </div>
      `);
    }

    /* ================= Listener ================= */

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
