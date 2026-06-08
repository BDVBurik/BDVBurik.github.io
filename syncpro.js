// SyncPro — sync for Lampa via Cloudflare Worker.
//
// Backend: https://syncpro-dev.bdvburik.workers.dev
// Auth: один общий ключ в настройках (X-SyncPro-Access-Token).
// Все устройства с одним ключом делят одно хранилище на сервере.

(function () {
'use strict';

if (window.lampac_syncpro_plugin) return;
window.lampac_syncpro_plugin = true;

var HOST = 'https://syncpro-dev.bdvburik.workers.dev';

// ----------------------------------------------------------------------
//  i18n
// ----------------------------------------------------------------------

function loadLang() {
    Lampa.Lang.add({
        syncpro_title:               { ru: 'Синхронизация', en: 'Sync', uk: 'Синхронізація' },
        syncpro_section_domains:     { ru: 'Что синхронизировать', en: 'What to sync', uk: 'Що синхронізувати' },
        syncpro_section_actions:     { ru: 'Действия', en: 'Actions', uk: 'Дії' },
        syncpro_section_status:      { ru: 'Статус', en: 'Status', uk: 'Статус' },

        syncpro_dom_bookmarks:       { ru: 'Закладки', en: 'Bookmarks', uk: 'Закладки' },
        syncpro_dom_timecodes:       { ru: 'Таймкоды', en: 'Timecodes', uk: 'Таймкоди' },
        syncpro_dom_history:         { ru: 'История просмотров', en: 'Watch history', uk: 'Історія перегляду' },
        syncpro_dom_torrents:        { ru: 'Торренты', en: 'Torrents', uk: 'Торенти' },
        syncpro_dom_search:          { ru: 'История поиска', en: 'Search history', uk: 'Історія пошуку' },
        syncpro_dom_plugins:         { ru: 'Список плагинов', en: 'Installed plugins', uk: 'Список плагінів' },

        syncpro_action_backup_save:  { ru: 'Создать бэкап на сервере', en: 'Save backup to server', uk: 'Створити бекап' },
        syncpro_action_backup_load:  { ru: 'Восстановить из бэкапа', en: 'Restore backup', uk: 'Відновити з бекапу' },
        syncpro_action_force_pull:   { ru: 'Подтянуть данные сейчас', en: 'Pull all data now', uk: 'Завантажити зараз' },
        syncpro_action_force_push:   { ru: 'Отправить данные на сервер', en: 'Push all data to server', uk: 'Відправити на сервер' },

        syncpro_open_domains:        { ru: 'Что синхронизировать', en: 'What to sync', uk: 'Що синхронізувати' },
        syncpro_open_actions:        { ru: 'Действия', en: 'Actions', uk: 'Дії' },
        syncpro_summary_domains:     { ru: 'Включено {n} из {total}', en: '{n} of {total} enabled', uk: 'Увімкнено {n} з {total}' },
        syncpro_back:                { ru: 'Назад', en: 'Back', uk: 'Назад' },

        syncpro_msg_pulled:          { ru: 'Данные подтянуты', en: 'Data pulled', uk: 'Дані завантажено' },
        syncpro_msg_pushed:          { ru: 'Данные отправлены на сервер', en: 'Data pushed to server', uk: 'Дані відправлено' },
        syncpro_msg_backup_ok:       { ru: 'Бэкап сохранён (+ синх-данные отправлены)', en: 'Backup saved (+ sync data pushed)', uk: 'Бекап збережено' },
        syncpro_msg_backup_restored: { ru: 'Бэкап восстановлен, перезагрузка…', en: 'Restored, reloading…', uk: 'Відновлено, перезавантаження…' },

        syncpro_err_generic:         { ru: 'Ошибка ({code})', en: 'Error ({code})', uk: 'Помилка ({code})' },
        syncpro_err_storage_disabled:{ ru: 'Хранилище на сервере отключено', en: 'Server storage is disabled', uk: 'Серверне сховище вимкнено' },
        syncpro_err_storage_max:     { ru: 'Слишком большой бэкап для сервера', en: 'Backup is larger than server limit', uk: 'Бекап більше за ліміт сервера' },
        syncpro_err_storage_path:    { ru: 'Ошибка доступа к хранилищу', en: 'Storage access error', uk: 'Помилка доступу до сховища' },
        syncpro_err_storage_lock:    { ru: 'Сервер не смог записать файл', en: 'Server failed to write file', uk: 'Помилка запису на сервері' },
        syncpro_err_network:         { ru: 'Нет соединения с сервером', en: 'No connection to the server', uk: 'Немає з\'єднання з сервером' },
        syncpro_err_backup_empty:    { ru: 'Бэкап ещё не создан', en: 'No backup saved yet', uk: 'Бекап ще не створено' },
        syncpro_err_backup_parse:    { ru: 'Бэкап повреждён, не удалось прочитать', en: 'Backup is corrupted', uk: 'Бекап пошкоджено' },
        syncpro_err_too_large_proxy: { ru: 'Бэкап слишком большой для сервера', en: 'Backup exceeds server limit', uk: 'Бекап більший за ліміт сервера' },

        syncpro_server_access_token: { ru: 'Ключ доступа к серверу', en: 'Server access key', uk: 'Ключ доступу до сервера' },
        syncpro_server_access_hint:  { ru: 'Общий секрет worker — один ключ на все ваши устройства', en: 'Shared worker secret — same key on all your devices', uk: 'Спільний секрет worker' },
        syncpro_status_no_key:       { ru: 'Ключ не задан', en: 'Access key not set', uk: 'Ключ не задано' },
        syncpro_status_ok:           { ru: 'Сервер доступен, синхронизация активна', en: 'Server OK, sync active', uk: 'Сервер доступний' },
        syncpro_status_fail:         { ru: 'Сервер недоступен или неверный ключ', en: 'Server unreachable or wrong key', uk: 'Помилка з\'єднання або ключ' },
        syncpro_status_checking:     { ru: 'Проверка…', en: 'Checking…', uk: 'Перевірка…' },
        syncpro_err_access_denied:   { ru: 'Неверный ключ доступа к серверу', en: 'Invalid server access key', uk: 'Невірний ключ доступу' },
        syncpro_err_access_missing:  { ru: 'Укажите ключ доступа в настройках SyncPro', en: 'Set the server access key in SyncPro settings', uk: 'Вкажіть ключ доступу в налаштуваннях SyncPro' },
    });
}

function errorMessageFromSlug(slug, code) {
    var map = {
        access_missing:      'syncpro_err_access_missing',
        access_denied:       'syncpro_err_access_denied',
        disabled:            'syncpro_err_storage_disabled',
        max_size:            'syncpro_err_storage_max',
        outFile:             'syncpro_err_storage_path',
        fileLock:            'syncpro_err_storage_lock',
        network:             'syncpro_err_network',
        nodata:              'syncpro_err_backup_empty',
        parse:               'syncpro_err_backup_parse',
        too_large_proxy:     'syncpro_err_too_large_proxy',
    };
    if (slug && map[slug]) return Lampa.Lang.translate(map[slug]);
    return Lampa.Lang.translate('syncpro_err_generic').replace('{code}', code || slug || '?');
}

// ----------------------------------------------------------------------
//  Settings storage helpers
// ----------------------------------------------------------------------
//
// Toggles use `syncpro_<domain>` keys in Lampa.Storage. Default to true so
// new installs sync everything; users opt out per domain.

function pref(domain, def) {
    var key = 'syncpro_' + domain;
    var v = Lampa.Storage.field(key);
    if (typeof v === 'undefined' || v === null || v === '') {
        if (typeof def !== 'undefined') return def;
        return true;
    }
    return v === true || v === 'true' || v === 1 || v === '1';
}

function url(path) {
    return HOST + path;
}

// ----------------------------------------------------------------------
//  Network primitives
// ----------------------------------------------------------------------
//
// We use raw XHR (not Lampa.Reguest) so we can inspect HTTP status codes
// and JSON error slugs. Lampa.Reguest swallows non-2xx into a generic error.

function getServerAccessToken() {
    try {
        var v = Lampa.Storage.field('syncpro_access_token');
        if (typeof v !== 'undefined' && v !== null && v !== '') return String(v);
        v = Lampa.Storage.get('syncpro_access_token', '');
        return v ? String(v) : '';
    } catch (e) { /* Storage not ready */ }
    return '';
}

// Временный дебаг — потом поставить false или удалить
var DEBUG = true;

function dbg() {
    if (!DEBUG) return;
    var args = ['[SyncPro]'];
    for (var i = 0; i < arguments.length; i++) args.push(arguments[i]);
    try { console.log.apply(console, args); } catch (e) { /* ignore */ }
}

function dbgResponse(method, path, xhr) {
    var body = xhr.responseText;
    try { body = body ? JSON.parse(body) : null; } catch (e) { /* raw text */ }
    dbg('←', method, path, xhr.status, body);
}

function applySyncAuthHeaders(xhr) {
    var access = getServerAccessToken();
    if (access) xhr.setRequestHeader('X-SyncPro-Access-Token', access);
}

function httpJSON(method, path, body, cb, errCb) {
    try {
        if (!getServerAccessToken()) {
            dbg('✗', method, path, 'no token');
            if (errCb) errCb({ error: 'access_missing' }, 0);
            return;
        }
        dbg('→', method, url(path), body || null);
        var xhr = new XMLHttpRequest();
        xhr.open(method, url(path), true);
        xhr.withCredentials = true;
        xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        applySyncAuthHeaders(xhr);
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            var parsed = null;
            try { parsed = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch (e) { /* ignore */ }
            dbgResponse(method, path, xhr);
            if (xhr.status >= 200 && xhr.status < 300) {
                if (cb) cb(parsed, xhr.status);
            } else {
                if (errCb) errCb(parsed, xhr.status);
            }
        };
        xhr.send(body ? JSON.stringify(body) : null);
    } catch (e) {
        dbg('✗', method, path, e);
        if (errCb) errCb(null, 0);
    }
}

// ----------------------------------------------------------------------
//  Sync status (access token + /health)
// ----------------------------------------------------------------------

var syncState = 'checking';
var syncStatusItem = null;

function syncStatusLine() {
    if (!getServerAccessToken()) return Lampa.Lang.translate('syncpro_status_no_key');
    if (syncState === 'ok') return Lampa.Lang.translate('syncpro_status_ok');
    if (syncState === 'fail') return Lampa.Lang.translate('syncpro_status_fail');
    return Lampa.Lang.translate('syncpro_status_checking');
}

function repaintSyncStatus() {
    if (!syncStatusItem) return;
    try {
        syncStatusItem.find('.settings-param__descr').text(syncStatusLine());
    } catch (e) { /* ignore */ }
}

function refreshSyncStatus(cb) {
    if (!getServerAccessToken()) {
        syncState = 'missing';
        repaintSyncStatus();
        if (cb) cb(syncState);
        return;
    }
    syncState = 'checking';
    repaintSyncStatus();
    httpJSON('GET', '/api/profile/me', null, function (j) {
        syncState = (j && j.authenticated) ? 'ok' : 'fail';
        repaintSyncStatus();
        if (cb) cb(syncState);
    }, function () {
        syncState = 'fail';
        repaintSyncStatus();
        if (cb) cb(syncState);
    });
}

// ----------------------------------------------------------------------
//  Per-domain sync modules
// ----------------------------------------------------------------------

// Bookmarks (replaces bookmark.js)
//
// На сервер уходят только id списков favorite — без дублирования карточек TMDB.
// При pull локальные полные карточки сохраняются, если уже есть.

function favoriteItemId(item) {
    if (item == null || item === '') return null;
    if (typeof item === 'number' && !isNaN(item)) return item;
    if (typeof item === 'string' && /^\d+$/.test(item)) return parseInt(item, 10);
    if (typeof item === 'object' && item.id != null) return item.id;
    return null;
}

function compactFavoriteForServer(fav) {
    if (!fav || typeof fav !== 'object') return {};
    var out = {};
    Object.keys(fav).forEach(function (k) {
        var v = fav[k];
        if (!Array.isArray(v)) return;
        var ids = [];
        v.forEach(function (item) {
            var id = favoriteItemId(item);
            if (id != null && ids.indexOf(id) === -1) ids.push(id);
        });
        out[k] = ids;
    });
    return out;
}

function mergeFavoriteFromServer(local, remote) {
    if (!remote || typeof remote !== 'object') return local;
    var fav = local && typeof local === 'object' ? local : {};
    Object.keys(remote).forEach(function (k) {
        if (k === 'success' || k === 'dbInNotInitialization') return;
        var remoteList = remote[k];
        if (!Array.isArray(remoteList)) return;
        var localMap = {};
        (Array.isArray(fav[k]) ? fav[k] : []).forEach(function (item) {
            var id = favoriteItemId(item);
            if (id != null) localMap[id] = item;
        });
        fav[k] = remoteList.map(function (item) {
            var id = favoriteItemId(item);
            if (id == null) return item;
            return localMap[id] || id;
        });
    });
    return fav;
}

var Bookmarks = {
    enabled: function () { return pref('bookmarks'); },
    bound: false,
    pushDebounce: 0,
    applying: false,

    readLocal: function () {
        var fav = {};
        try {
            fav = Lampa.Storage.get('favorite', '{}');
            if (typeof fav === 'string') fav = JSON.parse(fav);
        } catch (e) { fav = {}; }
        return fav && typeof fav === 'object' ? fav : {};
    },

    bind: function () {
        if (this.bound) return;
        this.bound = true;
        var self = this;
        var fav = Lampa.Favorite;
        if (!fav || !fav.listener) return;
        fav.listener.follow('add', function (e) {
            if (!self.enabled() || self.applying) return;
            if (e.card && e.card.received) return;
            self.schedulePush();
        });
        fav.listener.follow('added', function (e) {
            if (!self.enabled() || self.applying) return;
            if (e.card && e.card.received) return;
            self.schedulePush();
        });
        fav.listener.follow('remove', function (e) {
            if (!self.enabled() || self.applying) return;
            if (e.card && e.card.received) return;
            self.schedulePush();
        });
        Lampa.Listener.follow('lampac', function (e) {
            if (e.name === 'bookmark_pullFromServer' && self.enabled()) self.pull();
            else if (e.name === 'bookmark_set' && self.enabled()) {
                self.applyServerSet(e.value);
                httpJSON('POST', '/bookmark/set', compactFavoriteForServer(e.value));
            }
        });
        document.addEventListener('visibilitychange', function () {
            if (!document.hidden && self.enabled()) self.pull();
        });
    },

    schedulePush: function () {
        var self = this;
        if (self.pushDebounce) clearTimeout(self.pushDebounce);
        self.pushDebounce = setTimeout(function () { self.pushFull(); }, 1500);
    },

    pushFull: function () {
        if (!this.enabled() || this.applying) return;
        httpJSON('POST', '/bookmark/set', compactFavoriteForServer(this.readLocal()));
    },

    pull: function () {
        var self = this;
        httpJSON('GET', '/bookmark/list', null, function (json) {
            if (!json || json.dbInNotInitialization) {
                self.pushFull();
                return;
            }
            var hasData = Object.keys(json).some(function (k) {
                return k !== 'success' && k !== 'dbInNotInitialization' &&
                    Array.isArray(json[k]) && json[k].length;
            });
            if (hasData) self.applyServerSet(json);
            else self.pushFull();
        });
    },

    applyServerSet: function (data) {
        if (!data) return;
        var fav = mergeFavoriteFromServer(this.readLocal(), data);
        this.applying = true;
        try {
            Lampa.Storage.set('favorite', fav, true);
        } catch (e) {
            try { localStorage.setItem('favorite', JSON.stringify(fav)); } catch (e2) { /* quota */ }
        }
        this.applying = false;
        try {
            Lampa.Listener.send('state:changed', { target: 'favorite', reason: 'syncpro' });
        } catch (e) { /* ignore */ }
    },
};

// Timecodes (replaces timecode.js)
var Timecodes = {
    enabled: function () { return pref('timecodes'); },
    bound: false,
    bind: function () {
        if (this.bound) return;
        this.bound = true;
        var self = this;
        if (!Lampa.Timeline || !Lampa.Timeline.listener) return;
        Lampa.Timeline.listener.follow('update', function (e) {
            if (!self.enabled()) return;
            self.add(e);
        });
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite' && self.enabled()) self.pullForCurrent();
        });
        Lampa.Listener.follow('lampac', function (e) {
            if (e.type === 'timecode_pullFromServer' && self.enabled()) self.pullForCurrent();
        });
    },
    cardID: function () {
        var act = Lampa.Storage.get('activity', '{}');
        var card = (act && (act.movie || act.card)) || { id: 0 };
        return (card.id || 0) + '_' + (card.name ? 'tv' : 'movie');
    },
    add: function (e) {
        var id = e && e.data && e.data.hash;
        var payload = e && e.data && e.data.road;
        if (!id || !payload) return;
        var u = '/timecode/add?card_id=' + encodeURIComponent(this.cardID());
        var form = 'id=' + encodeURIComponent(id) + '&data=' + encodeURIComponent(JSON.stringify(payload));
        dbg('→', 'POST', url(u), form);
        var xhr = new XMLHttpRequest();
        xhr.open('POST', url(u), true);
        xhr.withCredentials = true;
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        applySyncAuthHeaders(xhr);
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            dbgResponse('POST', u, xhr);
        };
        xhr.send(form);
    },
    pullForCurrent: function () {
        var u = '/timecode/all?card_id=' + encodeURIComponent(this.cardID());
        httpJSON('GET', u, null, function (json) {
            if (!json) return;
            var account = Lampa.Storage.get('account', '{}');
            var fname = 'file_view' + (account.profile ? '_' + account.profile.id : '');
            var viewed = Lampa.Storage.cache(fname, 10000, {});
            Object.keys(json).forEach(function (i) {
                try {
                    var t = JSON.parse(json[i]);
                    if (!t || typeof t !== 'object') return;
                    viewed[i] = t;
                    if (typeof viewed[i].duration === 'undefined') viewed[i].duration = 0;
                    if (typeof viewed[i].time === 'undefined') viewed[i].time = 0;
                    if (typeof viewed[i].percent === 'undefined') viewed[i].percent = 0;
                    delete viewed[i].hash;
                } catch (e) { /* corrupt entry — ignore */ }
            });
            Lampa.Storage.set(fname, viewed, true);
        });
    },
};

// Generic localStorage-blob sync — for view history, torrents, search history,
// installed plugins. Each blob is one /storage/{set,get} path. We push on
// localStorage change events (Lampa.Storage.listener) and pull on app load.
function makeBlobSync(domainPref, storagePath, lsKeys, label) {
    return {
        enabled: function () { return pref(domainPref); },
        bound: false,
        debounce: 0,
        logName: label || storagePath,
        bind: function () {
            if (this.bound) return;
            this.bound = true;
            var self = this;
            if (Lampa.Storage.listener && Lampa.Storage.listener.follow) {
                Lampa.Storage.listener.follow('change', function (e) {
                    if (!self.enabled()) return;
                    if (lsKeys.indexOf(e.name) === -1) return;
                    self.scheduleFlush();
                });
            }
        },
        scheduleFlush: function () {
            var self = this;
            if (self.debounce) clearTimeout(self.debounce);
            self.debounce = setTimeout(function () { self.flush(); }, 1500);
        },
        flush: function () {
            var self = this;
            if (!self.enabled()) return;
            var bundle = {};
            lsKeys.forEach(function (k) {
                try {
                    var v = null;
                    if (Lampa.Storage && Lampa.Storage.get) {
                        var got = Lampa.Storage.get(k, null);
                        if (got !== null && typeof got !== 'undefined') {
                            v = typeof got === 'string' ? got : JSON.stringify(got);
                        }
                    }
                    if (v === null) v = localStorage.getItem(k);
                    if (v !== null) bundle[k] = v;
                } catch (e) { /* ignore */ }
            });
            if (!Object.keys(bundle).length) {
                dbg('push skip', self.logName, 'local empty');
                return;
            }
            var body = JSON.stringify(bundle);
            dbg('→', 'POST', '/storage/set?path=' + storagePath, self.logName, body.length + ' bytes');
            var xhr = new XMLHttpRequest();
            xhr.open('POST', url('/storage/set?path=' + storagePath), true);
            xhr.withCredentials = true;
            applySyncAuthHeaders(xhr);
            xhr.onreadystatechange = function () {
                if (xhr.readyState !== 4) return;
                dbgResponse('POST', '/storage/set?path=' + storagePath, xhr);
            };
            xhr.send(body);
        },
        pull: function () {
            var self = this;
            if (!self.enabled()) {
                dbg('pull skip', self.logName, 'disabled');
                return;
            }
            dbg('pull', self.logName, 'GET /storage/get?path=' + storagePath);
            httpJSON('GET', '/storage/get?path=' + storagePath, null, function (j) {
                if (!j || !j.data) {
                    dbg('pull', self.logName, 'server empty → push local');
                    self.flush();
                    return;
                }
                try {
                    var bundle = JSON.parse(j.data);
                    var applied = 0;
                    Object.keys(bundle).forEach(function (k) {
                        if (lsKeys.indexOf(k) === -1) return;
                        var raw = bundle[k];
                        if (typeof raw !== 'string') return;
                        var parsed = raw;
                        try {
                            var c = raw.charAt(0);
                            if (c === '[' || c === '{') parsed = JSON.parse(raw);
                            else if (raw === 'true' || raw === 'false') parsed = (raw === 'true');
                        } catch (e) { /* not JSON — write as string */ }
                        try {
                            if (Lampa && Lampa.Storage && typeof Lampa.Storage.set === 'function') {
                                Lampa.Storage.set(k, parsed, true);
                            } else {
                                localStorage.setItem(k, raw);
                            }
                            applied++;
                        } catch (e) { /* quota or strange Lampa shape */ }
                    });
                    dbg('pull', self.logName, 'ok, keys=' + applied);
                } catch (e) {
                    dbg('pull', self.logName, 'parse error', e);
                }
            }, function (parsed, status) {
                dbg('pull', self.logName, 'fail', status, parsed);
            });
        },
    };
}

var ViewHistory = makeBlobSync('history', 'sync_view', [
    'online_view', 'online_last_balanser', 'online_watched_last',
    'recomends_list', 'recomends_list_history',
], 'history');
var Torrents = makeBlobSync('torrents', 'sync_torrents', [
    'torrents_view', 'torrents_filter_data',
], 'torrents');
var SearchHistory = makeBlobSync('search', 'search_history', [
    'search_recent', 'search_history',
], 'search');
var PluginsList = makeBlobSync('plugins', 'sync_plugins', [
    'plugins',
], 'plugins');

// Full backup: dump/restore the entire localStorage. Manual, not on a timer.
var FullBackup = {
    save: function (onDone, onFail) {
        var dump = {};
        try {
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (!k) continue;
                // Skip our own session cookie shadows and ephemeral keys.
                if (k.indexOf('lampac_psync_') === 0) continue;
                dump[k] = localStorage.getItem(k);
            }
        } catch (e) { /* ignore */ }
        var body = JSON.stringify(dump);
        dbg('→', 'POST', url('/storage/set?path=backup'), body.length + ' bytes');
        var xhr = new XMLHttpRequest();
        xhr.open('POST', url('/storage/set?path=backup'), true);
        xhr.withCredentials = true;
        applySyncAuthHeaders(xhr);
        // No Content-Type — storage handler reads body as raw bytes and a
        // JSON content-type would mislead intermediaries (some hosts
        // intercept JSON bodies for inspection and choke on long dumps).
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            dbgResponse('POST', '/storage/set?path=backup', xhr);
            // Storage handler returns 200 even on logical errors (with
            // {"success":false, "msg":"<slug>"}). Distinguish the cases so
            // the toast can show *what* went wrong instead of the
            // un-actionable "Error (200)".
            var slug = '';
            var ok = false;
            try {
                var j = JSON.parse(xhr.responseText || '{}');
                ok = !!j.success;
                if (!ok) slug = j.msg || j.error || '';
            } catch (e) { /* response not JSON */ }
            if (ok) { if (onDone) onDone(); return; }
            // 413 Payload Too Large doesn't reach our handler — it's
            // emitted by the reverse proxy (nginx default
            // client_max_body_size is 1m). Surface a *specific* slug so
            // the toast can tell the admin to bump the limit instead of
            // showing "Error (413)".
            if (xhr.status === 413) {
                if (onFail) onFail('too_large_proxy');
                return;
            }
            if (onFail) {
                // Report the storage-layer reason if we have one; otherwise
                // fall back to the HTTP status. xhr.status==0 ⇒ network
                // error (offline, CORS preflight rejected, …).
                onFail(slug || xhr.status || 'network');
            }
        };
        xhr.send(body);
    },
    restore: function (onDone, onFail) {
        httpJSON('GET', '/storage/get?path=backup', null, function (j) {
            if (!j || !j.data) { if (onFail) onFail('nodata'); return; }
            try {
                var data = JSON.parse(j.data);
                Object.keys(data).forEach(function (k) {
                    try { localStorage.setItem(k, data[k]); } catch (e) { /* quota */ }
                });
                if (onDone) onDone();
            } catch (e) {
                if (onFail) onFail('parse');
            }
        }, function (_, status) { if (onFail) onFail(status); });
    },
};

// ----------------------------------------------------------------------
//  Pull everything that's enabled — used on app load / manual "Pull now"
// ----------------------------------------------------------------------

var periodicPullTimer = null;

function startPeriodicPull() {
    if (periodicPullTimer) return;
    periodicPullTimer = setInterval(function () {
        if (!getServerAccessToken()) return;
        pullAll();
    }, 45000);
}

function pullAll() {
    dbg('pullAll');
    if (Bookmarks.enabled()) Bookmarks.pull();
    if (Timecodes.enabled()) Timecodes.pullForCurrent();
    if (ViewHistory.enabled()) ViewHistory.pull();
    else dbg('pull skip', 'history', 'disabled');
    if (Torrents.enabled()) Torrents.pull();
    if (SearchHistory.enabled()) SearchHistory.pull();
    if (PluginsList.enabled()) PluginsList.pull();
}

function pushAll() {
    dbg('pushAll');
    if (Bookmarks.enabled()) Bookmarks.pushFull();
    else dbg('push skip', 'bookmarks', 'disabled');
    if (ViewHistory.enabled()) ViewHistory.flush();
    else dbg('push skip', 'history', 'disabled');
    if (Torrents.enabled()) Torrents.flush();
    if (SearchHistory.enabled()) SearchHistory.flush();
    if (PluginsList.enabled()) PluginsList.flush();
}

function runInitialSync() {
    if (!getServerAccessToken()) {
        dbg('pullAll skip', 'no token');
        return;
    }
    pullAll();
}

// ----------------------------------------------------------------------
//  Settings UI
// ----------------------------------------------------------------------

var SVG_ICON = '<svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-9-9 9 9 0 0 1 9-9c2.7 0 5.1 1.2 6.8 3" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/><polyline points="21 4 21 9 16 9" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function addToggle(domain, label) {
    Lampa.SettingsApi.addParam({
        component: 'syncpro',
        param: { name: 'syncpro_' + domain, type: 'trigger', default: true },
        field: { name: label, description: '' },
        onChange: function () {
            // No-op — readers consult pref() at event time.
        },
    });
}

function addButton(name, onClick) {
    Lampa.SettingsApi.addParam({
        component: 'syncpro',
        param: { type: 'button' },
        field: { name: name },
        onChange: onClick,
    });
}

// Lampa setting sheets — open a contextual Lampa.Select. Action handlers
// run on item.onSelect; the sheet auto-closes. We always pass an onBack
// that returns control to settings_component so the focus chain doesn't
// dead-end.
function openSheet(title, items) {
    Lampa.Select.show({
        title: title,
        items: items,
        onBack: function () { Lampa.Controller.toggle('settings_component'); },
        onSelect: function (a) {
            if (a && typeof a.action === 'function') a.action();
        },
    });
}

// Domain toggle sheet — each tap flips the storage flag and re-shows the
// sheet so the user sees the new state without leaving.
var DOMAIN_DEFS = [
    { key: 'bookmarks', label: 'syncpro_dom_bookmarks' },
    { key: 'timecodes', label: 'syncpro_dom_timecodes' },
    { key: 'history',   label: 'syncpro_dom_history' },
    { key: 'torrents',  label: 'syncpro_dom_torrents' },
    { key: 'search',    label: 'syncpro_dom_search' },
    { key: 'plugins',   label: 'syncpro_dom_plugins' },
];

function domainsSummary() {
    var on = 0;
    DOMAIN_DEFS.forEach(function (d) { if (pref(d.key, true)) on++; });
    return Lampa.Lang.translate('syncpro_summary_domains')
        .replace('{n}', on).replace('{total}', DOMAIN_DEFS.length);
}

function openDomainsSheet() {
    var items = DOMAIN_DEFS.map(function (d) {
        var on = pref(d.key, true);
        return {
            title: (on ? '✓ ' : '✗ ') + Lampa.Lang.translate(d.label),
            action: function () {
                Lampa.Storage.set('syncpro_' + d.key, !on);
                // Re-open so the user sees the new check state immediately.
                openDomainsSheet();
            },
        };
    });
    openSheet(Lampa.Lang.translate('syncpro_open_domains'), items);
}

function openActionsSheet() {
    var items = [
        {
            title: Lampa.Lang.translate('syncpro_action_force_push'),
            action: function () {
                Lampa.Loading.start();
                pushAll();
                setTimeout(function () {
                    Lampa.Loading.stop();
                    Lampa.Noty.show(Lampa.Lang.translate('syncpro_msg_pushed'));
                }, 1500);
            },
        },
        {
            title: Lampa.Lang.translate('syncpro_action_force_pull'),
            action: function () {
                Lampa.Loading.start();
                pullAll();
                setTimeout(function () {
                    Lampa.Loading.stop();
                    Lampa.Noty.show(Lampa.Lang.translate('syncpro_msg_pulled'));
                }, 1500);
            },
        },
        {
            title: Lampa.Lang.translate('syncpro_action_backup_save'),
            action: function () {
                Lampa.Loading.start();
                FullBackup.save(
                    function () {
                        pushAll();
                        Lampa.Loading.stop();
                        Lampa.Noty.show(Lampa.Lang.translate('syncpro_msg_backup_ok'));
                    },
                    function (status) {
                        Lampa.Loading.stop();
                        Lampa.Noty.show(Lampa.Lang.translate('syncpro_err_generic').replace('{code}', status || '?'));
                    }
                );
            },
        },
        {
            title: Lampa.Lang.translate('syncpro_action_backup_load'),
            action: function () {
                // Confirmation step — restore overwrites the whole local
                // store, which is too destructive to do on one tap.
                Lampa.Select.show({
                    title: Lampa.Lang.translate('sure'),
                    nomark: true,
                    items: [
                        { title: Lampa.Lang.translate('confirm'), confirm: true, selected: true },
                        { title: Lampa.Lang.translate('cancel') },
                    ],
                    onSelect: function (a) {
                        if (!a.confirm) { openActionsSheet(); return; }
                        Lampa.Loading.start();
                        FullBackup.restore(
                            function () {
                                Lampa.Loading.stop();
                                Lampa.Noty.show(Lampa.Lang.translate('syncpro_msg_backup_restored'));
                                setTimeout(function () { window.location.reload(); }, 2500);
                            },
                            function (status) {
                                Lampa.Loading.stop();
                                Lampa.Noty.show(Lampa.Lang.translate('syncpro_err_generic').replace('{code}', status || '?'));
                            }
                        );
                    },
                    onBack: function () { openActionsSheet(); },
                });
            },
        },
    ];
    openSheet(Lampa.Lang.translate('syncpro_open_actions'), items);
}

// Build the compact Settings → Sync page:
//   1. Access key (input)
//   2. Status (static, live-updated)
//   3. What to sync (X of N)     (opens Lampa.Select with toggles)
//   4. Actions                   (opens Lampa.Select with pull/backup)
function buildSettings() {
    Lampa.SettingsApi.addComponent({
        component: 'syncpro',
        icon: SVG_ICON,
        name: Lampa.Lang.translate('syncpro_title'),
    });

    Lampa.SettingsApi.addParam({
        component: 'syncpro',
        param: {
            name: 'syncpro_access_token',
            type: 'input',
            placeholder: '••••••••',
            values: getServerAccessToken(),
            default: '',
            password: true,
        },
        field: {
            name: Lampa.Lang.translate('syncpro_server_access_token'),
            description: Lampa.Lang.translate('syncpro_server_access_hint'),
        },
        onChange: function (value) {
            Lampa.Storage.set('syncpro_access_token', value || '');
            Lampa.Settings.update();
            refreshSyncStatus(function () {
                if (getServerAccessToken()) pullAll();
            });
        },
    });

    Lampa.SettingsApi.addParam({
        component: 'syncpro',
        param: { type: 'static' },
        field: {
            name: Lampa.Lang.translate('syncpro_section_status'),
            description: syncStatusLine(),
        },
        onRender: function (item) {
            syncStatusItem = item;
            refreshSyncStatus();
        },
    });

    // -- what to sync (live summary in description) --
    Lampa.SettingsApi.addParam({
        component: 'syncpro',
        param: { type: 'button' },
        field: {
            name: Lampa.Lang.translate('syncpro_open_domains'),
            description: domainsSummary(),
        },
        onRender: function (item) {
            // Refresh "X of N enabled" on every render so the user sees
            // changes immediately after closing the toggle sheet.
            try { item.find('.settings-param__descr').text(domainsSummary()); } catch (e) { /* ignore */ }
        },
        onChange: openDomainsSheet,
    });

    // -- actions (pull / backup) --
    Lampa.SettingsApi.addParam({
        component: 'syncpro',
        param: { type: 'button' },
        field: {
            name: Lampa.Lang.translate('syncpro_open_actions'),
            description: '',
        },
        onChange: openActionsSheet,
    });
}

// ----------------------------------------------------------------------
//  Boot
// ----------------------------------------------------------------------

function whenReady(callback) {
    if (typeof window === 'undefined') return;
    if (window.Lampa && Lampa.Favorite && Lampa.Storage && Lampa.SettingsApi && Lampa.Listener && Lampa.Utils) {
        callback();
    } else {
        setTimeout(function () { whenReady(callback); }, 500);
    }
}

function start() {
    loadLang();
    buildSettings();

    Bookmarks.bind();
    Timecodes.bind();
    ViewHistory.bind();
    Torrents.bind();
    SearchHistory.bind();
    PluginsList.bind();

    startPeriodicPull();

    refreshSyncStatus(function () {
        runInitialSync();
    });

    Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') runInitialSync();
    });
}

whenReady(start);

})();
