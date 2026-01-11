(function () {
  "use strict";

  /************* ЛОКАЛИЗАЦИЯ *************/
  Lampa.Lang.add({
    title_plugin: {
      ru: "Title Plugin",
      en: "Title Plugin",
      uk: "Title Plugin",
      be: "Title Plugin",
    },
    order_title: {
      ru: "Порядок названий",
      en: "Titles order",
      uk: "Порядок назв",
      be: "Парадак назваў",
    },
    move_up: {
      ru: "Вверх",
      en: "Up",
      uk: "Вгору",
      be: "Уверх",
    },
    move_down: {
      ru: "Вниз",
      en: "Down",
      uk: "Уніз",
      be: "Уніз",
    },
  });

  /************* НАСТРОЙКИ *************/
  const ORDER_KEY = "title_plugin_order";

  const DEFAULT_ORDER = ["orig", "tl", "en", "ru", "uk", "be"];

  function getOrder() {
    return Lampa.Storage.get(ORDER_KEY, DEFAULT_ORDER.slice());
  }

  function setOrder(order) {
    Lampa.Storage.set(ORDER_KEY, order);
  }

  const TITLE_LABELS = {
    orig: "Original",
    tl: "🇯🇵 Romaji",
    en: "🇺🇸 EN",
    ru: "🇷🇺 RU",
    uk: "🇺🇦 UA",
    be: "🇧🇾 BE",
  };

  /************* UI РЕДАКТОРА ПОРЯДКА *************/
  function openOrderEditor() {
    let order = getOrder();

    const list = $("<div class='menu-edit-list'></div>");

    function render() {
      list.empty();

      order.forEach((key, index) => {
        const item = $(`
          <div class="menu-edit-list__item">
            <div class="menu-edit-list__title">${TITLE_LABELS[key]}</div>
            <div class="menu-edit-list__move selector up">▲</div>
            <div class="menu-edit-list__move selector down">▼</div>
          </div>
        `);

        item.find(".up").on("hover:enter", () => {
          if (index > 0) {
            [order[index - 1], order[index]] = [order[index], order[index - 1]];
            setOrder(order);
            render();
          }
        });

        item.find(".down").on("hover:enter", () => {
          if (index < order.length - 1) {
            [order[index + 1], order[index]] = [order[index], order[index + 1]];
            setOrder(order);
            render();
          }
        });

        list.append(item);
      });
    }

    render();

    Lampa.Modal.open({
      title: Lampa.Lang.translate("order_title"),
      html: list,
      size: "small",
      onBack: () => {
        Lampa.Modal.close();
      },
    });
  }

  /************* РЕГИСТРАЦИЯ В SETTINGS *************/
  function startPlugin() {
    Lampa.SettingsApi.addParam({
      component: "interface",
      param: { type: "button" },
      field: {
        name: Lampa.Lang.translate("title_plugin"),
        description: "Title Plugin settings",
      },
      onChange: () => {
        openOrderEditor();
      },
    });

    initLogic();
  }

  /************* ЛОГИКА ОТОБРАЖЕНИЯ *************/
  async function showTitles(card) {
    const orig = card.original_title || card.original_name;
    const alt = card.alternative_titles?.titles || [];

    const ru = alt.find((t) => t.iso_3166_1 === "RU")?.title;
    const en = alt.find((t) => t.iso_3166_1 === "US")?.title;
    const uk = alt.find((t) => t.iso_3166_1 === "UA")?.title;
    const be = alt.find((t) => t.iso_3166_1 === "BY")?.title;

    const translit = alt.find((t) => /romaji|latin/i.test(t.type))?.title || "";

    const map = {
      orig,
      tl: translit,
      en,
      ru,
      uk,
      be,
    };

    const order = getOrder();

    const lines = order
      .map((key) => map[key])
      .filter(Boolean)
      .map((text) => `<div style="font-size:1.25em;">${text}</div>`);

    const render = Lampa.Activity.active().activity.render();
    if (!render) return;

    $(".original_title", render).remove();

    $(".full-start-new__title", render).after(`
      <div class="original_title" style="margin-bottom:7px;text-align:right">
        ${lines.join("")}
      </div>
    `);
  }

  function initLogic() {
    if (window.title_plugin) return;
    window.title_plugin = true;

    Lampa.Listener.follow("full", (e) => {
      if (e.type !== "complite" || !e.data.movie) return;
      showTitles(e.data.movie);
    });
  }

  if (window.appready) startPlugin();
  else
    Lampa.Listener.follow("app", (e) => {
      if (e.type === "ready") startPlugin();
    });
})();
