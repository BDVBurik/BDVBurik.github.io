(function () {
  "use strict";

  // ===== Локалізація =====
  Lampa.Lang.add({
    title_plugin: {
      ru: "Title Plugin",
      en: "Title Plugin",
      uk: "Title Plugin",
    },
    show_ru: {
      ru: "Показывать 🇷🇺 RU",
      en: "Show 🇷🇺 RU",
      uk: "Показувати 🇷🇺 RU",
    },
    show_en: {
      ru: "Показывать 🇺🇸 EN",
      en: "Show 🇺🇸 EN",
      uk: "Показувати 🇺🇸 EN",
    },
    show_tl: {
      ru: "Показывать 🇯🇵 Romaji",
      en: "Show 🇯🇵 Romaji",
      uk: "Показувати 🇯🇵 Romaji",
    },
    order_title: {
      ru: "Порядок языков",
      en: "Language order",
      uk: "Порядок мов",
    },
    style: {
      ru: "Стиль отображения",
      en: "Display style",
      uk: "Стиль відображення",
    },
  });

  // ===== Старт плагіна =====
  function startPlugin() {
    // ===== Шаблон для Settings =====
    Lampa.Template.add("settings_title_plugin", `<div></div>`);

    // ===== Зберігання порядку мов =====
    if (!Lampa.Storage.get("title_plugin_order_list")) {
      Lampa.Storage.set("title_plugin_order_list", ["orig", "tl", "en", "ru"]);
    }

    // ===== Додати пункт у меню інтерфейсу =====
    Lampa.SettingsApi.addParam({
      component: "interface",
      param: { type: "button" },
      field: {
        name: Lampa.Lang.translate("title_plugin"),
        description: "Title Plugin settings",
      },
      onChange: () => {
        Lampa.Settings.create("title_plugin", {
          onBack: () => {
            Lampa.Settings.create("interface");
          },
        });
      },
    });

    // ===== Toggle RU =====
    Lampa.SettingsApi.addParam({
      component: "title_plugin",
      param: { type: "trigger", default: true, name: "show_ru" },
      field: { name: Lampa.Lang.translate("show_ru") },
    });

    // ===== Toggle EN =====
    Lampa.SettingsApi.addParam({
      component: "title_plugin",
      param: { type: "trigger", default: true, name: "show_en" },
      field: { name: Lampa.Lang.translate("show_en") },
    });

    // ===== Toggle TL/Romaji =====
    Lampa.SettingsApi.addParam({
      component: "title_plugin",
      param: { type: "trigger", default: true, name: "show_tl" },
      field: { name: Lampa.Lang.translate("show_tl") },
    });

    // ===== Select стиль =====
    Lampa.SettingsApi.addParam({
      component: "title_plugin",
      param: {
        type: "select",
        default: "normal",
        name: "style",
        values: ["normal", "compact", "accent"],
      },
      field: { name: Lampa.Lang.translate("style") },
    });

    // ===== Button drag-and-drop порядок мов =====
    Lampa.SettingsApi.addParam({
      component: "title_plugin",
      param: { type: "button", name: "order_btn" },
      field: { name: Lampa.Lang.translate("order_title") },
      onChange: () => {
        const list = Lampa.Storage.get("title_plugin_order_list", [
          "orig",
          "tl",
          "en",
          "ru",
        ]);
        const comp = new Lampa.Settings({
          title: Lampa.Lang.translate("order_title"),
          list: list.map((l) => ({
            title:
              l === "orig"
                ? "Original"
                : l === "tl"
                ? "Romaji"
                : l === "en"
                ? "English"
                : "Russian",
            move: true,
            value: l,
          })),
          onSave: (newList) => {
            Lampa.Storage.set("title_plugin_order_list", newList);
          },
        });
        comp.open();
      },
    });
  }

  if (window.appready) {
    startPlugin();
  } else {
    Lampa.Listener.follow("app", function (e) {
      if (e.type === "ready") startPlugin();
    });
  }
})();
