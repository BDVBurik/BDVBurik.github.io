(function () {
  "use strict";
  // ===== Logging Helper =====  
  function log(message, data) {
    console.log("[Title Plugin]", message, data || "");
  }

  function logError(message, error) {
    console.error("[Title Plugin]", message, error || "");
  }

  // ===== Safe Property Access =====  
  function safeGet(obj, path, defaultValue) {
    try {
      return path.split('.').reduce((acc, part) => acc && acc[part], obj) || defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  // ===== Version Check =====  
  function checkCompatibility() {
    if (!window.Lampa) {
      logError("Lampa not found");
      return false;
    }
    if (!Lampa.Lang || !Lampa.Storage) {
      logError("Required APIs not available");
      return false;
    }
    return true;
  }
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

    function showTitles(card) {
      try {
        var orig = card.original_title || card.original_name;
        var altTitles = card.alternative_titles || {};
        var alt = altTitles.titles || altTitles.results || [];

        function countryFlag(code) {
          if (!code) return '';
          return ' <img src="https://flagcdn.com/' + code.toLowerCase() + '.svg"'
            + ' style="width:1.15em;height:auto;vertical-align:inherit;" alt="' + code.toUpperCase() + '">';
        }

        var TRANSLIT_TYPES = ['Transliteration', 'romaji', 'Romanization', 'Latynization',
          'pinyin', 'kana', 'romaji_japanese', 'romaji_korean', 'romaji_chinese', 'latinization'];

        var translitObj = alt.find(function (t) { return TRANSLIT_TYPES.indexOf(t.type) !== -1; });
        var translit = (translitObj && (translitObj.title || (translitObj.data && (translitObj.data.title || translitObj.data.name)))) || '';

        var ru = '', en = '', uk = '', be = '';
        var now = Date.now();
        var cache = titleCache[card.id];

        if (cache && now - cache.timestamp < CACHE_TTL) {
          en = cache.en || '';
          uk = cache.uk || '';
          be = cache.be || '';
          ru = cache.ru || '';
          translit = translit || cache.tl || '';
          console.log('[TitlePlugin] cache hit for id:', card.id);
        }

        function findLang(list, codes) {
          var t = list.find(function (t) { return codes.indexOf(t.iso_3166_1) !== -1 || codes.indexOf(t.iso_639_1) !== -1; });
          return t && t.data && (t.data.title || t.data.name) || '';
        }

        function applyAndRender(tr) {
          var translitData = tr.find(function (t) { return ['Transliteration', 'romaji'].indexOf(t.type) !== -1; });
          if (translitData) translit = (translitData.title || (translitData.data && (translitData.data.title || translitData.data.name))) || translit;

          en = en || findLang(tr, ['US', 'en']);
          uk = uk || findLang(tr, ['UA', 'uk']);
          be = be || findLang(tr, ['BY', 'be']);
          ru = ru || findLang(tr, ['RU', 'ru']);

          // fallback из alternative_titles  
          en = en || (alt.find(function (t) { return t.iso_3166_1 === 'US'; }) || {}).title || '';
          uk = uk || (alt.find(function (t) { return t.iso_3166_1 === 'UA'; }) || {}).title || '';
          be = be || (alt.find(function (t) { return t.iso_3166_1 === 'BY'; }) || {}).title || '';
          ru = ru || (alt.find(function (t) { return t.iso_3166_1 === 'RU'; }) || {}).title || '';

          titleCache[card.id] = { ru: ru, en: en, tl: translit, uk: uk, be: be, timestamp: now };
          try { Lampa.Storage.set('title_cache', titleCache); } catch (e) { console.error('[TitlePlugin] storage error:', e); }

          renderTitles();
        }

        function renderTitles() {
          var active = Lampa.Activity.active();
          if (!active || !active.activity) {
            console.warn('[TitlePlugin] no active activity');
            return;
          }
          var render = active.activity.render();
          if (!render) { console.warn('[TitlePlugin] render is null'); return; }

          $('.original_title', render).remove();

          var showOrder = Lampa.Storage.get(STORAGE_ORDER_KEY, LANGS.slice());
          var hiddenLangs = Lampa.Storage.get(STORAGE_HIDDEN_KEY, []);
          var originCountry = (card.origin_country || [])[0] || '';
          var lines = ['<div style="font-size:1.25em;">' + orig + ' ' + countryFlag(originCountry) + '</div>'];
          var langFlags = { ru: 'RU', en: 'US', uk: 'UA', be: 'BY' };
          var langVals = { en: en, uk: uk, be: be, ru: ru };

          showOrder.forEach(function (lang) {
            if (hiddenLangs.indexOf(lang) !== -1) return;
            var val = lang === 'tl' ? translit : langVals[lang];
            if (val) lines.push('<div style="font-size:1.25em;">' + val + ' ' + countryFlag(langFlags[lang]) + '</div>');
          });

          $('.full-start-new__title', render).after(
            '<div class="original_title" style="margin-bottom:7px;text-align:right;"><div>'
            + lines.join('') + '</div></div>'
          );
        }

        if (!ru || !en || !translit || !uk || !be) {
          var type = card.first_air_date ? 'tv' : 'movie';
          console.log('[TitlePlugin] fetching translations for', type, card.id);
          Lampa.Api.sources.tmdb.get(
            type + '/' + card.id + '?append_to_response=translations',
            {},
            function (data) {
              var tr = (data.translations && data.translations.translations) || [];
              applyAndRender(tr);
            },
            function (e) {
              console.error('[TitlePlugin] tmdb error:', e);
              applyAndRender([]);
            }
          );
        } else {
          renderTitles();
        }
      } catch (e) {
        console.error('[TitlePlugin] showTitles crash:', e.message, e.stack);
      }
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
                            <path d="M7.44873 12.9658L10.8179 16.3349L18.1269 9.02588" stroke="currentColor" stroke-width="3" class="dot" opacity="${isHidden ? 0 : 1
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
  if (window.appready) {
    if (typeof Lampa !== 'undefined' &&
      Lampa.SettingsApi &&
      Lampa.Api &&
      Lampa.Api.sources &&
      Lampa.Api.sources.tmdb &&
      typeof $ !== 'undefined') {
      startPlugin();
    } else {
      console.error('Title Plugin: Required Lampa APIs not available');
    }
  } else {
    Lampa.Listener.follow("app", (e) => {
      if (e.type === "ready") {
        if (typeof Lampa !== 'undefined' &&
          Lampa.SettingsApi &&
          Lampa.Api &&
          Lampa.Api.sources &&
          Lampa.Api.sources.tmdb &&
          typeof $ !== 'undefined') {
          startPlugin();
        } else {
          console.error('Title Plugin: Required Lampa APIs not available');
        }
      }
    });
  }
})();
