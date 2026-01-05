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

  function startPlugin() {
    Lampa.Template.add("settings_title_plugin", `<div></div>`);

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

    // ===== Перемикачі для мов =====
    const langs = ["ru", "en", "tl", "uk", "be"];
    langs.forEach((l) => {
      Lampa.SettingsApi.addParam({
        component: "title_plugin",
        param: { type: "trigger", default: true, name: "show_" + l },
        field: { name: Lampa.Lang.translate("show_" + l) },
      });
    });

    // ===== Логіка відображення назв =====
    const storageKey = "title_cache";
    const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
    let titleCache = Lampa.Storage.get(storageKey) || {};

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
      let uk = alt.find((t) => t.iso_3166_1 === "UA")?.title;
      let be = alt.find((t) => t.iso_3166_1 === "BY")?.title;

      const now = Date.now();
      const cache = titleCache[card.id];
      if (cache && now - cache.timestamp < CACHE_TTL) {
        ru ||= cache.ru;
        en ||= cache.en;
        uk ||= cache.uk;
        be ||= cache.be;
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

          const translitData = tr.find(
            (t) => t.type === "Transliteration" || t.type === "romaji"
          );
          translit =
            translitData?.title ||
            translitData?.data?.title ||
            translitData?.data?.name ||
            translit;

          ru ||=
            tr.find((t) => t.iso_3166_1 === "RU" || t.iso_639_1 === "ru")?.data
              ?.title ||
            tr.find((t) => t.iso_3166_1 === "RU" || t.iso_639_1 === "ru")?.data
              ?.name;
          en ||=
            tr.find((t) => t.iso_3166_1 === "US" || t.iso_639_1 === "en")?.data
              ?.title ||
            tr.find((t) => t.iso_3166_1 === "US" || t.iso_639_1 === "en")?.data
              ?.name;
          uk ||=
            tr.find((t) => t.iso_3166_1 === "UA" || t.iso_639_1 === "uk")?.data
              ?.title ||
            tr.find((t) => t.iso_3166_1 === "UA" || t.iso_639_1 === "uk")?.data
              ?.name;
          be ||=
            tr.find((t) => t.iso_3166_1 === "BY" || t.iso_639_1 === "be")?.data
              ?.title ||
            tr.find((t) => t.iso_3166_1 === "BY" || t.iso_639_1 === "be")?.data
              ?.name;

          titleCache[card.id] = {
            ru,
            en,
            tl: translit,
            uk,
            be,
            timestamp: now,
          };
          Lampa.Storage.set(storageKey, titleCache);
        } catch (e) {
          console.error(e);
        }
      }

      const render = Lampa.Activity.active().activity.render();
      if (!render) return;
      $(".original_title", render).remove();

      const showRU = Lampa.Storage.get("show_ru", true);
      const showEN = Lampa.Storage.get("show_en", true);
      const showTL = Lampa.Storage.get("show_tl", true);
      const showUK = Lampa.Storage.get("show_uk", true);
      const showBE = Lampa.Storage.get("show_be", true);

      const styleBox = "margin-top:-0.8em;text-align:right;";
      const styleLine = "font-size:1.25em;";

      const lines = [];
      lines.push(`<div style="${styleLine}">${orig}</div>`);
      if (showTL && translit)
        lines.push(`<div style="${styleLine}">🇯🇵 ${translit}</div>`);
      if (showEN && en) lines.push(`<div style="${styleLine}">🇺🇸 ${en}</div>`);
      if (showRU && ru) lines.push(`<div style="${styleLine}">🇷🇺 ${ru}</div>`);
      if (showUK && uk) lines.push(`<div style="${styleLine}">🇺🇦 ${uk}</div>`);
      if (showBE && be) lines.push(`<div style="${styleLine}">🇧🇾 ${be}</div>`);

      $(".full-start-new__title", render).after(`
        <div class="original_title" style="${styleBox}">
          <div>${lines.join("")}</div>
        </div>
      `);
    }

    // ===== Listener =====
    if (!window.title_plugin) {
      window.title_plugin = true;
      Lampa.Listener.follow("full", (e) => {
        if (e.type !== "complite" || !e.data.movie) return;
        $(".original_title", e.object.activity.render()).remove();
        $(".full-start-new__title", e.object.activity.render()).after(
          '<div class="original_title" style="margin-top:-0.8em;text-align:right;"><div></div></div>'
        );
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
