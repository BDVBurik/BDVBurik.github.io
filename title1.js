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

    reset_to_default: {
      ru: "Сбросить по умолчанию",
      en: "Reset to Default",
      uk: "Скинути за замовчуванням",
      be: "Скінуць па змаўчанні",
    },

    show_en: {
      ru: 'Показывать <img src="https://flagcdn.com/us.svg" style="width:1.15em;height:auto;vertical-align:middle;"> EN',
      en: 'Show <img src="https://flagcdn.com/us.svg" style="width:1.15em;height:auto;vertical-align:middle;"> EN',
      uk: 'Показувати <img src="https://flagcdn.com/us.svg" style="width:1.15em;height:auto;vertical-align:middle;"> EN',
      be: 'Паказваць <img src="https://flagcdn.com/us.svg" style="width:1.15em;height:auto;vertical-align:middle;"> EN',
    },

    show_tl: {
      ru: "Показывать Romaji (transliteration)",
      en: "Show Romaji (transliteration)",
      uk: "Показувати Romaji (transliteration)",
      be: "Паказваць Romaji (transliteration)",
    },

    show_uk: {
      ru: 'Показывать <img src="https://flagcdn.com/ua.svg" style="width:1.15em;height:auto;vertical-align:middle;"> UA',
      en: 'Show <img src="https://flagcdn.com/ua.svg" style="width:1.15em;height:auto;vertical-align:middle;"> UA',
      uk: 'Показувати <img src="https://flagcdn.com/ua.svg" style="width:1.15em;height:auto;vertical-align:middle;"> UA',
      be: 'Паказваць <img src="https://flagcdn.com/ua.svg" style="width:1.15em;height:auto;vertical-align:middle;"> UA',
    },

    show_be: {
      ru: 'Показывать <img src="https://flagcdn.com/by.svg" style="width:1.15em;height:auto;vertical-align:middle;"> BE',
      en: 'Show <img src="https://flagcdn.com/by.svg" style="width:1.15em;height:auto;vertical-align:middle;"> BE',
      uk: 'Показувати <img src="https://flagcdn.com/by.svg" style="width:1.15em;height:auto;vertical-align:middle;"> BE',
      be: 'Паказваць <img src="https://flagcdn.com/by.svg" style="width:1.15em;height:auto;vertical-align:middle;"> BE',
    },
    show_ru: {
      ru: 'Показывать <img src="https://flagcdn.com/ru.svg" style="width:1.15em;height:auto;vertical-align:middle;"> RU',
      en: 'Show <img src="https://flagcdn.com/ru.svg" style="width:1.15em;height:auto;vertical-align:middle;"> RU',
      uk: 'Показувати <img src="https://flagcdn.com/ru.svg" style="width:1.15em;height:auto;vertical-align:middle;"> RU',
      be: 'Паказваць <img src="https://flagcdn.com/ru.svg" style="width:1.15em;height:auto;vertical-align:middle;"> RU',
    },
  });

  const LANGS = ["en", "tl", "uk", "be", "ru"];
  const STORAGE_ORDER_KEY = "title_plugin_order";
  const STORAGE_HIDDEN_KEY = "title_plugin_hidden";

  function startPlugin() {
    // ===== Settings button =====
    Lampa.SettingsApi.addParam({
      component: "interface",
      param: { type: "button" },
      field: {
        name: Lampa.Lang.translate("title_plugin"),
        description: "Title Plugin settings",
      },
      onChange: openEditor,
    });

    // ===== Title display logic =====
    const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
    let titleCache = Lampa.Storage.get("title_cache") || {};

    async function showTitles(card) {
      const orig = card.original_title || card.original_name;
      const alt =
        card.alternative_titles?.titles ||
        card.alternative_titles?.results ||
        [];
      function countryFlag(code) {
        if (!code) return "";

        let ref =
          document.querySelector('div[style*="font-size"]') || document.body;

        let fontSize = parseFloat(getComputedStyle(ref).fontSize);

        return `
        <img 
            src="https://flagcdn.com/${code.toLowerCase()}.svg"
            style="
                width:1.15em;
                height:auto;
                vertical-align:inherit;                
            "
            alt="${code.toUpperCase()}"
        >
    `;
      }

      let translitObj = alt.find((t) =>
        [
          "Transliteration",
          "romaji",
          "Romanization",
          "Latynization",
          "pinyin",
          "kana",
          "romaji_japanese",
          "romaji_korean",
          "romaji_chinese",
          "latinization",
        ].includes(t.type)
      );
      let translit =
        translitObj?.title ||
        translitObj?.data?.title ||
        translitObj?.data?.name ||
        "";
      let ru = "";
      let en = "";
      let uk = "";
      let be = "";
      const now = Date.now();
      const cache = titleCache[card.id];
      if (cache && now - cache.timestamp < CACHE_TTL) {
        en = cache.en;
        uk = cache.uk;
        be = cache.be;
        ru = cache.ru;
        translit ||= cache.tl;
      }

      if (!ru || !en || !translit || !uk || !be) {
        try {
          const type = card.first_air_date ? "tv" : "movie";
          const data = await new Promise((res, rej) => {
            Lampa.Api.sources.tmdb.get(
              `${type}/${card.id}?append_to_response=translations`,
              {},
              res,
              rej
            );
          });
          const tr = data.translations?.translations || [];
          const translitData = tr.find((t) =>
            ["Transliteration", "romaji"].includes(t.type)
          );
          translit =
            translitData?.title ||
            translitData?.data?.title ||
            translitData?.data?.name ||
            translit;
          // Универсальная функция для поиска нужного языка/страны
          function findLang(list, codes) {
            const t = list.find(
              (t) => codes.includes(t.iso_3166_1) || codes.includes(t.iso_639_1)
            );
            return t?.data?.title || t?.data?.name;
          }

          // Использование

          en ||= findLang(tr, ["US", "en"]);
          uk ||= findLang(tr, ["UA", "uk"]);
          be ||= findLang(tr, ["BY", "be"]);
          ru ||= findLang(tr, ["RU", "ru"]);

          titleCache[card.id] = {
            ru,
            en,
            tl: translit,
            uk,
            be,
            timestamp: now,
          };
          Lampa.Storage.set("title_cache", titleCache);
        } catch (e) {
          console.error(e);
        }
        en ||= alt.find((t) => t.iso_3166_1 === "US")?.title;
        uk ||= alt.find((t) => t.iso_3166_1 === "UA")?.title;
        be ||= alt.find((t) => t.iso_3166_1 === "BY")?.title;
        ru ||= alt.find((t) => t.iso_3166_1 === "RU")?.title;
      }

      const render = Lampa.Activity.active().activity.render();
      if (!render) return;
      $(".original_title", render).remove();

      let showOrder = Lampa.Storage.get(STORAGE_ORDER_KEY, LANGS.slice());
      let hiddenLangs = Lampa.Storage.get(STORAGE_HIDDEN_KEY, []);
      const lines = [
        `<div style="font-size:1.25em;">${orig}  ${countryFlag(
          card.origin_country[0]
        )}</div>`,
      ];

      showOrder.forEach((lang) => {
        if (hiddenLangs.includes(lang)) return;
        const val = lang === "tl" ? translit : { en, uk, be, ru }[lang];
        if (val)
          lines.push(
            `<div style="font-size:1.25em;">${val} ${countryFlag(
              { ru: "RU", en: "US", uk: "UA", be: "BY" }[lang]
            )}
            </div>`
          );
      });

      $(".full-start-new__title", render).after(
        `<div class="original_title" style="margin-bottom:7px;text-align:right;"><div>${lines.join(
          ""
        )}</div></div>`
      );
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

  // ===== Editor modal =====
  function openEditor() {
    const order = Lampa.Storage.get(STORAGE_ORDER_KEY, LANGS.slice());
    const hidden = Lampa.Storage.get(STORAGE_HIDDEN_KEY, []);
    const list = $('<div class="menu-edit-list"></div>');
    const style = $(`
        <style>
        .menu-edit-list__item { display:flex; align-items:center; justify-content:space-between; margin:0.3em 0; }
        .menu-edit-list__title { flex:1; font-size:1.1em; padding-left:0.5em; }
        .menu-edit-list__move { width:1.8em; height:1.8em; display:flex; align-items:center; justify-content:center; cursor:pointer; font-weight:bold; user-select:none; }
        .menu-edit-list__toggle { width:1.8em; height:1.8em; display:flex; align-items:center; justify-content:center; cursor:pointer; margin-left:0.5em; border:2px solid rgba(255,255,255,0.5); border-radius:3px; }
        .menu-edit-list__toggle .dot { width:1em; height:1em; }
        .folder-reset-button { background: rgba(200,100,100,0.3); margin-top:1em; border-radius:0.3em; padding:0.5em; text-align:center; cursor:pointer; }
        </style>
    `);
    $("body").append(style);

    order.forEach((lang) => {
      const title = Lampa.Lang.translate("show_" + lang);
      const isHidden = hidden.includes(lang);
      const item = $(`
                <div class="menu-edit-list__item">
                    <div class="menu-edit-list__title">${title}</div>
                    <div class="menu-edit-list__move move-up selector">▲</div>
                    <div class="menu-edit-list__move move-down selector">▼</div>
                    <div class="menu-edit-list__toggle selector">
                        <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <rect x="1.89111" y="1.78369" width="21.793" height="21.793" rx="3.5" stroke="currentColor" stroke-width="3"/>
                            <path d="M7.44873 12.9658L10.8179 16.3349L18.1269 9.02588" stroke="currentColor" stroke-width="3" class="dot" opacity="${
                              isHidden ? 0 : 1
                            }" stroke-linecap="round"/>
                        </svg>
                    </div>
                </div>`);

      // ===== Toggle hide/show =====
      item.find(".menu-edit-list__toggle").on("hover:enter", function () {
        const idx = hidden.indexOf(lang);
        if (idx !== -1) {
          hidden.splice(idx, 1);
          item.find(".dot").attr("opacity", "1");
        } else {
          hidden.push(lang);
          item.find(".dot").attr("opacity", "0");
        }
        Lampa.Storage.set(STORAGE_HIDDEN_KEY, hidden);
      });

      // ===== Move up/down =====
      item.find(".move-up").on("hover:enter", function () {
        const prev = item.prev();
        if (prev.length) {
          item.insertBefore(prev);
          updateOrder();
        }
      });
      item.find(".move-down").on("hover:enter", function () {
        const next = item.next();
        if (next.length) {
          item.insertAfter(next);
          updateOrder();
        }
      });

      list.append(item);
    });

    const resetBtn = $(
      '<div class="selector folder-reset-button" style="margin-top:1em;padding:1em;text-align:center;">' +
        Lampa.Lang.translate("reset_to_default") +
        "</div>"
    );
    resetBtn.on("hover:enter", function () {
      Lampa.Storage.set(STORAGE_ORDER_KEY, LANGS.slice());
      Lampa.Storage.set(STORAGE_HIDDEN_KEY, []);
      Lampa.Modal.close();
      Lampa.Controller.toggle("settings");
    });
    list.append(resetBtn);

    function updateOrder() {
      const newOrder = [];
      list.find(".menu-edit-list__item").each(function () {
        const title = $(this).find(".menu-edit-list__title").text();
        const key = LANGS.find(
          (l) => Lampa.Lang.translate("show_" + l) === title
        );
        if (key) newOrder.push(key);
      });
      Lampa.Storage.set(STORAGE_ORDER_KEY, newOrder);
    }

    Lampa.Modal.open({
      title: Lampa.Lang.translate("title_plugin"),
      html: list,
      size: "small",
      scroll_to_center: true,
      onBack: function () {
        Lampa.Modal.close();
        Lampa.Controller.toggle("settings");
      },
    });
  }

  // ===== Init plugin =====
  if (window.appready) startPlugin();
  else
    Lampa.Listener.follow("app", (e) => {
      if (e.type === "ready") startPlugin();
    });
})();
