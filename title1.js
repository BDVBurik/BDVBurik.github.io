(() => {
  // bdvburik.github.io  — Title Plugin
  // 2026

  const storageKey = "title_cache",
    CACHE_TTL = 30 * 24 * 60 * 60 * 1000;

  let titleCache = Lampa.Storage.get(storageKey) || {};

  const LANG_UI = Lampa.Storage.get('language') || 'uk';

  const DICT = {
    uk: {
      group: 'Title Plugin',
      order_btn: 'Порядок мов (drag & drop)',
      show_ru: 'Показувати 🇷🇺 RU',
      show_en: 'Показувати 🇺🇸 EN',
      show_tl: 'Показувати 🇯🇵 Romaji',
      style: 'Стиль відображення',
      order_title: 'Порядок мов'
    },
    ru: {
      group: 'Title Plugin',
      order_btn: 'Порядок языков (drag & drop)',
      show_ru: 'Показывать 🇷🇺 RU',
      show_en: 'Показывать 🇺🇸 EN',
      show_tl: 'Показывать 🇯🇵 Romaji',
      style: 'Стиль отображения',
      order_title: 'Порядок языков'
    },
    en: {
      group: 'Title Plugin',
      order_btn: 'Language order (drag & drop)',
      show_ru: 'Show 🇷🇺 RU',
      show_en: 'Show 🇺🇸 EN',
      show_tl: 'Show 🇯🇵 Romaji',
      style: 'Display style',
      order_title: 'Language order'
    }
  };

  function i18n(key) {
    return (DICT[LANG_UI] && DICT[LANG_UI][key]) || DICT.en[key] || key;
  }

  async function showTitles(card) {
    const orig = card.original_title || card.original_name;
    const alt =
      card.alternative_titles?.titles ||
      card.alternative_titles?.results ||
      [];

    let translitObj = alt.find(
      (t) => t.type === "Transliteration" || t.type === "romaji"
    );

    let translit =
      translitObj?.title ||
      translitObj?.data?.title ||
      translitObj?.data?.name ||
      "";

    let ru = alt.find((t) => t.iso_3166_1 === "RU")?.title;
    let en = alt.find((t) => t.iso_3166_1 === "US")?.title;

    const now = Date.now();
    const cache = titleCache[card.id];

    if (cache && now - cache.timestamp < CACHE_TTL) {
      ru ||= cache.ru;
      en ||= cache.en;
    }

    if (!ru || !en || !translit) {
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

        const translitData = tr.find(
          (t) => t.type === "Transliteration" || t.type === "romaji"
        );

        translit =
          translitData?.title ||
          translitData?.data?.title ||
          translitData?.data?.name ||
          translit;

        ru ||= tr.find(
          (t) => t.iso_3166_1 === "RU" || t.iso_639_1 === "ru"
        )?.data?.title ||
          tr.find(
            (t) => t.iso_3166_1 === "RU" || t.iso_639_1 === "ru"
          )?.data?.name;

        en ||= tr.find(
          (t) => t.iso_3166_1 === "US" || t.iso_639_1 === "en"
        )?.data?.title ||
          tr.find(
            (t) => t.iso_3166_1 === "US" || t.iso_639_1 === "en"
          )?.data?.name;

        titleCache[card.id] = { ru, en, timestamp: now };
        Lampa.Storage.set(storageKey, titleCache);
      } catch (e) {
        console.error(e);
      }
    }

    const render = Lampa.Activity.active().activity.render();
    if (!render) return;

    $(".original_title", render).remove();

    const uiLang = Lampa.Storage.get("language");

    const showRU = Lampa.Storage.get('title_plugin_ru', true);
    const showEN = Lampa.Storage.get('title_plugin_en', true);
    const showTL = Lampa.Storage.get('title_plugin_tl', true);

    const style = Lampa.Storage.get('title_plugin_style', 'normal');

    let styleBox = 'margin-top:-0.8em;text-align:right;';
    let styleLine = 'font-size:1.25em;';

    if (style === 'compact') {
      styleLine = 'font-size:1.05em;opacity:.9;';
    }

    if (style === 'accent') {
      styleLine = 'font-size:1.2em;color:#58a6ff;';
    }

    let ruHtml = '';
    let enHtml = '';
    let tlHtml = '';

    if (showRU && ru && uiLang !== 'ru')
      ruHtml = `<div style="${styleLine}">🇷🇺 ${ru}</div>`;

    if (showEN && en && uiLang !== 'en' && en !== orig)
      enHtml = `<div style="${styleLine}">🇺🇸 ${en}</div>`;

    if (showTL && translit && translit !== orig && translit !== en)
      tlHtml = `<div style="${styleLine}">🇯🇵 ${translit}</div>`;

    const orderList = Lampa.Storage.get(
      'title_plugin_order_list',
      ['orig', 'tl', 'en', 'ru']
    );

    const LINES = { tl: tlHtml, en: enHtml, ru: ruHtml };

    const body = orderList
      .filter(k => k !== 'orig')
      .map(k => LINES[k] || '')
      .join('');

    $(".full-start-new__title", render).after(`
      <div class="original_title" style="${styleBox}">
        <div>
          <div style="${styleLine}">${orig}</div>
          ${body}
        </div>
      </div>
    `);
  }

  if (!window.title_plugin) {
    window.title_plugin = true;

    // ===== SETTINGS GROUP =====
    Lampa.Settings.addGroup({
      group: 'title_plugin',
      name: i18n('group')
    });

    // --- toggles ---
    Lampa.Settings.add({
      group: 'title_plugin',
      state: 'title_plugin_ru',
      type: 'toggle',
      value: Lampa.Storage.get('title_plugin_ru', true),
      name: i18n('show_ru'),
      onChange: v => Lampa.Storage.set('title_plugin_ru', v)
    });

    Lampa.Settings.add({
      group: 'title_plugin',
      state: 'title_plugin_en',
      type: 'toggle',
      value: Lampa.Storage.get('title_plugin_en', true),
      name: i18n('show_en'),
      onChange: v => Lampa.Storage.set('title_plugin_en', v)
    });

    Lampa.Settings.add({
      group: 'title_plugin',
      state: 'title_plugin_tl',
      type: 'toggle',
      value: Lampa.Storage.get('title_plugin_tl', true),
      name: i18n('show_tl'),
      onChange: v => Lampa.Storage.set('title_plugin_tl', v)
    });

    // --- style select ---
    Lampa.Settings.add({
      group: 'title_plugin',
      state: 'title_plugin_style',
      type: 'select',
      values: [
        { title: 'Normal', name: 'normal' },
        { title: 'Compact', name: 'compact' },
        { title: 'Accent', name: 'accent' }
      ],
      value: Lampa.Storage.get('title_plugin_style', 'normal'),
      name: i18n('style'),
      onChange: v => Lampa.Storage.set('title_plugin_style', v)
    });

    // --- drag & drop order editor ---
    function openOrderEditor() {
      const list = Lampa.Storage.get(
        'title_plugin_order_list',
        ['orig','tl','en','ru']
      );

      const comp = new Lampa.Settings.create({
        title: i18n('order_title'),
        list: list.map(l => ({
          title:
            l === 'orig' ? 'Original' :
            l === 'tl'   ? 'Romaji'   :
            l === 'en'   ? 'English'  :
                           'Russian',
          move: true,
          value: l
        })),
        onSave(newList){
          Lampa.Storage.set('title_plugin_order_list', newList);
        }
      });

      comp.open();
    }

    Lampa.Settings.add({
      group: 'title_plugin',
      state: 'title_plugin_order_btn',
      type: 'button',
      name: i18n('order_btn'),
      onChange: openOrderEditor
    });

    // ===== LISTENER =====
    Lampa.Listener.follow("full", (e) => {
      if (e.type !== "complite" || !e.data.movie) return;

      $(".original_title", e.object.activity.render()).remove();

      $(".full-start-new__title", e.object.activity.render()).after(
        '<div class="original_title" style="margin-top:-0.8em;text-align:right;"><div></div></div>'
      );

      showTitles(e.data.movie);
    });
  }
})();
