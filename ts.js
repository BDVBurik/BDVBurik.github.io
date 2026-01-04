(async function () {
  'use strict';

  Lampa.Platform.tv();

  const servers = [
    { key: 'FreeServ_1', url: 'trs.my.to:8595' },
    { key: 'FreeServ_2', url: 'tr.my.to:8595' },
    { key: 'FreeServ_3', url: '176.124.198.209:8595' },
    { key: 'FreeServ_4', url: 'Trs.ix.tc:8595' },
    { key: 'FreeServ_5', url: 'Jaos.ix.tc:8595' },
    {  url: 'ts.ozerki.org:8090' }
  ];

  // Обнуляем статусы при запуске
  servers.forEach(s => Lampa.Storage.set(s.key, 'NotFound'));

  // Хелпер задержки
  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  // Опрос сервера
  async function pingServer(server) {
    try {
      await fetch(`http://${server.url}/echo`);
      Lampa.Storage.set(server.key?server.key||server.url, server.url);
    } catch (e) {
      Lampa.Storage.set(server.key, 'NotFound');
    }
  }

  // Опрос всех серверов c шагом 4-5 сек (как у тебя)
  async function pollServers() {
    for (let i = 0; i < servers.length; i++) {
      await delay(4000);   // можно менять интервал
      pingServer(servers[i]);
    }
  }

  // Прячем NotFound-строки
  setInterval(() => {
    const el = $('.selectbox-item.selector > div:contains("NotFound")');
    if (el.length > 0) el.parent('div').hide();
  }, 100);

  // Запускаем опрос
  pollServers();

  // Формируем меню после опроса
  setTimeout(() => {
    Lampa.SettingsApi.addParam({
      component: 'server',
      param: {
        name: 'freetorrserv',
        type: 'select',
        values: servers.reduce((acc, s, i) => {
          acc[i + 1] = Lampa.Storage.get(s.key) + '';
          return acc;
        }, {}),
        default: 0
      },
      field: {
        name: 'Бесплатный TorrServer #free',
        description: 'Нажмите для выбора сервера из списка найденных'
      },
      onChange: function (value) {
        if (value === '0') {
          Lampa.Storage.set('torrserver_url_two', '');
        } else {
          const idx = Number(value) - 1;
          Lampa.Storage.set('torrserver_url_two', servers[idx].url);
        }

        Lampa.Storage.set('torrserver_use_link', 'two');
        Lampa.Settings.update();
      },
      onRender: function (item) {
        setTimeout(function () {
          if ($('div[data-name="freetorrserv"]').length > 1) item.hide();
          $('.settings-param__name', item).css('color', 'f3d900');
          $('div[data-name="freetorrserv"]').insertAfter('div[data-name="torrserver_use_link"]');
        }, 0);
      }
    });
  }, 5000);

})();
