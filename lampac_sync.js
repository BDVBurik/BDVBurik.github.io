// =============================================================================
//  LampacSync — плагин для Lampa
//  Синхронизирует таймкоды и закладки через Cloudflare Worker
//  Worker: https://lampac-compat.bdvburik.workers.dev
//  GitHub: https://bdvburik.github.io/lampac_sync.js
// =============================================================================

(function () {
  "use strict";

  if (window.lampac_sync_plugin) return;
  window.lampac_sync_plugin = true;

  var PLUGIN_NAME = "LampacSync";
  var PLUGIN_VER = "1.0.0";
  var DEFAULT_HOST = "https://lampac-compat.bdvburik.workers.dev";

  // -------------------------------------------------------------------------
  //  Helpers
  // -------------------------------------------------------------------------

  function getHost() {
    var h = Lampa.Storage.field("lampac_sync_host");
    return (h && h.replace(/\/+$/, "")) || DEFAULT_HOST;
  }

  function getEmail() {
    return Lampa.Storage.field("lampac_sync_email") || "";
  }

  function buildUrl(path, extra) {
    var email = getEmail();
    if (!email) return null;

    var url = getHost() + path;
    url +=
      (url.indexOf("?") === -1 ? "?" : "&") +
      "account_email=" +
      encodeURIComponent(email);

    var uid = Lampa.Storage.get("lampac_unic_id", "");
    if (!uid) {
      uid = Math.random().toString(36).slice(2, 10);
      Lampa.Storage.set("lampac_unic_id", uid);
    }
    url += "&uid=" + encodeURIComponent(uid);

    var acc = Lampa.Storage.get("account", "{}");
    var profile_id = Lampa.Storage.get("lampac_profile_id", "");
    if (profile_id) url += "&profile_id=" + encodeURIComponent(profile_id);
    else if (acc && acc.profile && acc.profile.id) {
      url += "&profile_id=" + encodeURIComponent(acc.profile.id);
    }

    if (extra) url += "&" + extra;
    return url;
  }

  function request(method, path, body, onSuccess, onError, extraQuery) {
    var url = buildUrl(path, extraQuery);
    if (!url) {
      if (onError) onError(0, null);
      return;
    }

    try {
      var xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.timeout = 10000;

      if (
        method === "POST" &&
        typeof body === "string" &&
        body.indexOf("=") !== -1
      ) {
        xhr.setRequestHeader(
          "Content-Type",
          "application/x-www-form-urlencoded",
        );
      } else if (method === "POST" && body) {
        xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      }

      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        var parsed = null;
        try {
          parsed = JSON.parse(xhr.responseText || "null");
        } catch (e) {}

        if (xhr.status >= 200 && xhr.status < 300) {
          if (onSuccess) onSuccess(parsed, xhr.status);
        } else {
          dbg("✗", method, path, xhr.status, parsed);
          if (onError) onError(xhr.status, parsed);
        }
      };
      xhr.ontimeout = function () {
        if (onError) onError(0, null);
      };
      xhr.onerror = function () {
        if (onError) onError(0, null);
      };

      xhr.send(body || null);
    } catch (e) {
      dbg("✗ xhr exception", e.message);
      if (onError) onError(0, null);
    }
  }

  function dbg() {
    if (!Lampa.Storage.field("lampac_sync_debug")) return;
    var args = ["[LampacSync]"];
    for (var i = 0; i < arguments.length; i++) args.push(arguments[i]);
    try {
      console.log.apply(console, args);
    } catch (e) {}
  }

  // -------------------------------------------------------------------------
  //  i18n
  // -------------------------------------------------------------------------

  function loadLang() {
    Lampa.Lang.add({
      lampac_sync_title: {
        ru: "Синхронизация (Worker)",
        en: "Worker Sync",
        uk: "Синхронізація (Worker)",
      },
      lampac_sync_host: {
        ru: "Адрес сервера",
        en: "Server URL",
        uk: "Адреса сервера",
      },
      lampac_sync_host_hint: {
        ru: "URL вашего Cloudflare Worker",
        en: "Your Cloudflare Worker URL",
        uk: "URL вашого Worker",
      },
      lampac_sync_email: {
        ru: "Email аккаунта",
        en: "Account email",
        uk: "Email акаунту",
      },
      lampac_sync_email_hint: {
        ru: "Должен совпадать с настройкой воркера",
        en: "Must match worker ALLOWED_EMAIL",
        uk: "Має збігатися з ALLOWED_EMAIL",
      },
      lampac_sync_timecodes: {
        ru: "Синхронизировать таймкоды",
        en: "Sync timecodes",
        uk: "Синхронізувати таймкоди",
      },
      lampac_sync_bookmarks: {
        ru: "Синхронизировать закладки",
        en: "Sync bookmarks",
        uk: "Синхронізувати закладки",
      },
      lampac_sync_debug: {
        ru: "Отладка в консоли",
        en: "Debug console logs",
        uk: "Відладка в консолі",
      },
      lampac_sync_pull_now: {
        ru: "Загрузить с сервера",
        en: "Pull from server",
        uk: "Завантажити з сервера",
      },
      lampac_sync_push_now: {
        ru: "Отправить на сервер",
        en: "Push to server",
        uk: "Відправити на сервер",
      },
      lampac_sync_status_ok: {
        ru: "Сервер доступен ✓",
        en: "Server OK ✓",
        uk: "Сервер доступний ✓",
      },
      lampac_sync_status_fail: {
        ru: "Ошибка соединения",
        en: "Connection error",
        uk: "Помилка з'єднання",
      },
      lampac_sync_status_nokey: {
        ru: "Email не задан",
        en: "Email not set",
        uk: "Email не вказано",
      },
      lampac_sync_pulled: {
        ru: "Данные загружены с сервера",
        en: "Data pulled from server",
        uk: "Дані завантажено",
      },
      lampac_sync_pushed: {
        ru: "Данные отправлены на сервер",
        en: "Data pushed to server",
        uk: "Дані відправлено",
      },
    });
  }

  function T(key) {
    return Lampa.Lang.translate(key);
  }

  // -------------------------------------------------------------------------
  //  Timecodes
  //  POST /timecode/add?card_id=...  body: id=hash&data={json}
  //  GET  /timecode/all?card_id=...  → { hash: "{json}", ... }
  // -------------------------------------------------------------------------

  var Timecodes = {
    bound: false,

    enabled: function () {
      var v = Lampa.Storage.field("lampac_sync_timecodes");
      return (
        v === undefined || v === null || v === true || v === "true" || v === 1
      );
    },

    cardID: function () {
      var act = Lampa.Storage.get("activity", "{}");
      var card = (act && (act.movie || act.card)) || { id: 0 };
      return (card.id || 0) + "_" + (card.name ? "tv" : "movie");
    },

    viewKey: function () {
      var acc = Lampa.Storage.get("account", "{}");
      return "file_view" + (acc && acc.profile ? "_" + acc.profile.id : "");
    },

    add: function (e) {
      if (!this.enabled() || !getEmail()) return;
      var id = e && e.data && e.data.hash;
      var payload = e && e.data && e.data.road;
      if (!id || !payload) return;

      var form =
        "id=" +
        encodeURIComponent(id) +
        "&data=" +
        encodeURIComponent(JSON.stringify(payload));
      var card_id = this.cardID();
      dbg("→ timecode/add", card_id, id);
      request(
        "POST",
        "/timecode/add",
        form,
        null,
        null,
        "card_id=" + encodeURIComponent(card_id),
      );
    },

    pullForCurrent: function () {
      if (!this.enabled() || !getEmail()) return;
      var self = this;
      var card_id = this.cardID();
      dbg("→ timecode/all", card_id);
      request(
        "GET",
        "/timecode/all",
        null,
        function (json) {
          if (!json || typeof json !== "object") return;
          var fname = self.viewKey();
          var viewed = Lampa.Storage.cache(fname, 10000, {});
          Object.keys(json).forEach(function (i) {
            try {
              var t = JSON.parse(json[i]);
              if (!t || typeof t !== "object") return;
              viewed[i] = t;
              if (typeof viewed[i].duration === "undefined")
                viewed[i].duration = 0;
              if (typeof viewed[i].time === "undefined") viewed[i].time = 0;
              if (typeof viewed[i].percent === "undefined")
                viewed[i].percent = 0;
              delete viewed[i].hash;
            } catch (e) {}
          });
          Lampa.Storage.set(fname, viewed, true);
          dbg("← timecode/all ok, keys=", Object.keys(json).length);
        },
        null,
        "card_id=" + encodeURIComponent(card_id),
      );
    },

    bind: function () {
      if (this.bound) return;
      this.bound = true;
      var self = this;

      if (Lampa.Timeline && Lampa.Timeline.listener) {
        Lampa.Timeline.listener.follow("update", function (e) {
          self.add(e);
        });
      }
      Lampa.Listener.follow("full", function (e) {
        if (e.type === "complite") self.pullForCurrent();
      });
    },
  };

  // -------------------------------------------------------------------------
  //  Bookmarks
  //  GET  /bookmark/list              → { like:[id,...], book:[...], ... }  или { dbInNotInitialization: true }
  //  POST /bookmark/set               body: JSON { like:[...], ... }
  //  POST /bookmark/add               body: JSON { where, card, card_id, id }
  //  POST /bookmark/added             body: JSON { where, card, card_id, id }
  //  POST /bookmark/remove            body: JSON { where, card_id, id }
  // -------------------------------------------------------------------------

  var Bookmarks = {
    bound: false,
    applying: false,
    pushTimer: 0,

    enabled: function () {
      var v = Lampa.Storage.field("lampac_sync_bookmarks");
      return (
        v === undefined || v === null || v === true || v === "true" || v === 1
      );
    },

    readLocal: function () {
      try {
        var f = Lampa.Storage.get("favorite", "{}");
        if (typeof f === "string") f = JSON.parse(f);
        return f && typeof f === "object" ? f : {};
      } catch (e) {
        return {};
      }
    },

    extractId: function (item) {
      if (item == null) return null;
      if (typeof item === "number" || typeof item === "string") return item;
      if (typeof item === "object" && item.id != null) return item.id;
      return null;
    },

    compactFav: function (fav) {
      var out = {};
      var SKIP_KEYS = ["card"];
      Object.keys(fav).forEach(function (k) {
        if (!Array.isArray(fav[k]) || SKIP_KEYS.indexOf(k) !== -1) return;
        var ids = [];
        fav[k].forEach(function (item) {
          var id = Bookmarks.extractId(item);
          if (id != null && ids.indexOf(id) === -1) ids.push(id);
        });
        out[k] = ids;
      });
      return out;
    },

    applyFromServer: function (data) {
      if (!data || typeof data !== "object") return;
      this.applying = true;
      try {
        var local = this.readLocal();

        // Обновляем только id-списки (не card-кэш)
        Object.keys(data).forEach(function (k) {
          if (k === "success" || k === "dbInNotInitialization" || k === "card")
            return;
          if (!Array.isArray(data[k])) return;
          local[k] = data[k]
            .map(function (item) {
              return Bookmarks.extractId(item);
            })
            .filter(function (id) {
              return id != null;
            });
        });

        Lampa.Storage.set("favorite", local, true);
        if (Lampa.Favorite && typeof Lampa.Favorite.read === "function") {
          Lampa.Favorite.read(true);
        } else if (
          Lampa.Favorite &&
          typeof Lampa.Favorite.init === "function"
        ) {
          Lampa.Favorite.init();
        }
        dbg("← bookmarks applied");
      } catch (e) {
        dbg("✗ applyFromServer", e.message);
      }
      this.applying = false;
    },

    pull: function () {
      if (!this.enabled() || !getEmail()) return;
      var self = this;
      dbg("→ bookmark/list");
      request(
        "GET",
        "/bookmark/list",
        null,
        function (json) {
          if (!json) return;
          if (json.dbInNotInitialization) {
            // База пуста — заливаем локальные данные
            dbg("← bookmark: db empty → pushing local");
            self.pushFull();
            return;
          }
          self.applyFromServer(json);
        },
        function (status) {
          dbg("✗ bookmark/list", status);
        },
      );
    },

    pushFull: function () {
      if (!this.enabled() || !getEmail() || this.applying) return;
      var body = JSON.stringify(this.compactFav(this.readLocal()));
      dbg("→ bookmark/set", body.length, "bytes");
      request(
        "POST",
        "/bookmark/set",
        body,
        function () {
          dbg("← bookmark/set ok");
        },
        function (status) {
          dbg("✗ bookmark/set", status);
        },
      );
    },

    schedulePush: function () {
      var self = this;
      if (self.pushTimer) clearTimeout(self.pushTimer);
      self.pushTimer = setTimeout(function () {
        self.pushFull();
      }, 1500);
    },

    sendEvent: function (path, event) {
      if (!this.enabled() || !getEmail()) return;
      var card = event && event.card;
      var id = card && card.id != null ? card.id : event && event.id;
      if (id == null) return;

      var payload = {
        where: event.where || "book",
        card_id: id,
        id: id,
      };
      if (card) {
        // Отправляем только базовые поля карточки (не весь объект)
        payload.card = {
          id: card.id,
          title: card.title,
          name: card.name,
          poster_path: card.poster_path,
        };
      }
      request("POST", path, JSON.stringify(payload));
    },

    bind: function () {
      if (this.bound) return;
      this.bound = true;
      var self = this;
      var fav = Lampa.Favorite;
      if (!fav || !fav.listener) return;

      fav.listener.follow("add", function (e) {
        if (self.applying || (e.card && e.card.received)) return;
        self.sendEvent("/bookmark/add", e);
        self.schedulePush();
      });
      fav.listener.follow("added", function (e) {
        if (self.applying || (e.card && e.card.received)) return;
        self.sendEvent("/bookmark/added", e);
      });
      fav.listener.follow("remove", function (e) {
        if (self.applying || (e.card && e.card.received)) return;
        self.sendEvent("/bookmark/remove", e);
        self.schedulePush();
      });

      // Обновляем при возврате в приложение
      document.addEventListener("visibilitychange", function () {
        if (!document.hidden && self.enabled()) self.pull();
      });
    },
  };

  // -------------------------------------------------------------------------
  //  Settings UI
  // -------------------------------------------------------------------------

  var SVG =
    '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" fill="white"/><path d="M12 6v6l4 2" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>';

  var statusEl = null;

  function checkServer(cb) {
    if (!getEmail()) {
      if (statusEl)
        statusEl
          .find(".settings-param__descr")
          .text(T("lampac_sync_status_nokey"));
      if (cb) cb(false);
      return;
    }
    request(
      "GET",
      "/timecode/all",
      null,
      function () {
        if (statusEl)
          statusEl
            .find(".settings-param__descr")
            .text(T("lampac_sync_status_ok"));
        if (cb) cb(true);
      },
      function () {
        if (statusEl)
          statusEl
            .find(".settings-param__descr")
            .text(T("lampac_sync_status_fail"));
        if (cb) cb(false);
      },
      "card_id=0_movie",
    );
  }

  function buildSettings() {
    Lampa.SettingsApi.addComponent({
      component: "lampac_sync",
      icon: SVG,
      name: T("lampac_sync_title"),
    });

    // Адрес воркера
    Lampa.SettingsApi.addParam({
      component: "lampac_sync",
      param: {
        name: "lampac_sync_host",
        type: "input",
        placeholder: DEFAULT_HOST,
        values: getHost(),
        default: DEFAULT_HOST,
      },
      field: {
        name: T("lampac_sync_host"),
        description: T("lampac_sync_host_hint"),
      },
      onChange: function (v) {
        Lampa.Storage.set("lampac_sync_host", v || DEFAULT_HOST);
        checkServer();
      },
    });

    // Email
    Lampa.SettingsApi.addParam({
      component: "lampac_sync",
      param: {
        name: "lampac_sync_email",
        type: "input",
        placeholder: "your@email.com",
        values: getEmail(),
        default: "",
      },
      field: {
        name: T("lampac_sync_email"),
        description: T("lampac_sync_email_hint"),
      },
      onChange: function (v) {
        Lampa.Storage.set("lampac_sync_email", v || "");
        checkServer();
      },
    });

    // Статус
    Lampa.SettingsApi.addParam({
      component: "lampac_sync",
      param: { type: "static" },
      field: {
        name: "Статус сервера",
        description: getEmail() ? "..." : T("lampac_sync_status_nokey"),
      },
      onRender: function (el) {
        statusEl = el;
        checkServer();
      },
    });

    // Таймкоды вкл/выкл
    Lampa.SettingsApi.addParam({
      component: "lampac_sync",
      param: { name: "lampac_sync_timecodes", type: "trigger", default: true },
      field: { name: T("lampac_sync_timecodes"), description: "" },
      onChange: function () {},
    });

    // Закладки вкл/выкл
    Lampa.SettingsApi.addParam({
      component: "lampac_sync",
      param: { name: "lampac_sync_bookmarks", type: "trigger", default: true },
      field: { name: T("lampac_sync_bookmarks"), description: "" },
      onChange: function () {},
    });

    // Загрузить сейчас
    Lampa.SettingsApi.addParam({
      component: "lampac_sync",
      param: { type: "button" },
      field: { name: T("lampac_sync_pull_now"), description: "" },
      onChange: function () {
        Timecodes.pullForCurrent();
        Bookmarks.pull();
        setTimeout(function () {
          Lampa.Noty.show(T("lampac_sync_pulled"));
        }, 800);
      },
    });

    // Отправить сейчас
    Lampa.SettingsApi.addParam({
      component: "lampac_sync",
      param: { type: "button" },
      field: { name: T("lampac_sync_push_now"), description: "" },
      onChange: function () {
        Bookmarks.pushFull();
        setTimeout(function () {
          Lampa.Noty.show(T("lampac_sync_pushed"));
        }, 800);
      },
    });

    // Отладка
    Lampa.SettingsApi.addParam({
      component: "lampac_sync",
      param: { name: "lampac_sync_debug", type: "trigger", default: false },
      field: { name: T("lampac_sync_debug"), description: "" },
      onChange: function () {},
    });
  }

  // -------------------------------------------------------------------------
  //  Boot
  // -------------------------------------------------------------------------

  function whenReady(cb) {
    if (typeof window === "undefined") return;
    if (
      window.Lampa &&
      Lampa.Storage &&
      Lampa.Favorite &&
      Lampa.SettingsApi &&
      Lampa.Listener &&
      Lampa.Lang
    ) {
      cb();
    } else {
      setTimeout(function () {
        whenReady(cb);
      }, 300);
    }
  }

  whenReady(function () {
    loadLang();
    buildSettings();
    Timecodes.bind();
    Bookmarks.bind();

    // Первичная синхронизация — немного задерживаем чтобы Lampa успела загрузиться
    setTimeout(function () {
      if (getEmail()) {
        dbg("initial pull...");
        Bookmarks.pull();
      }
    }, 2000);

    Lampa.Listener.follow("app", function (e) {
      if (e.type === "ready" && getEmail()) {
        Bookmarks.pull();
      }
    });

    console.log(
      "[" + PLUGIN_NAME + "] v" + PLUGIN_VER + " started →",
      getHost(),
    );
  });
})();
