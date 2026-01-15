(function () {
    'use strict';

    function translate() {
      Lampa.Lang.add({
        lme_parser: {
          ru: 'Каталог парсеров',
          en: 'Parsers catalog',
          uk: 'Каталог парсерів',
          zh: '解析器目录'
        },
        lme_parser_description: {
          ru: 'Нажмите для выбора парсера из ',
          en: 'Click to select a parser from the ',
          uk: 'Натисніть для вибору парсера з ',
          zh: '单击以从可用的 '
        },
        lme_pubtorr: {
          ru: 'Каталог TorrServer',
          en: 'TorrServer catalog',
          uk: 'Каталог TorrServer',
          zh: '解析器目录'
        },
        lme_pubtorr_description: {
          ru: 'Бесплатные серверы от проекта LME',
          en: 'Free servers from the LME project',
          uk: 'Безкоштовні сервери від проєкту LME',
          zh: '来自 LME 项目的免费服务器 '
        }
      });
    }

    var parsersInfo = [
      { base:'lampa_app', name:'Lampa.app', settings:{url:'lampa.app',key:'',parser_torrent_type:'jackett'}},
      { base:'jacred_viewbox_dev', name:'Viewbox', settings:{url:'jacred.viewbox.dev',key:'viewbox',parser_torrent_type:'jackett'}},
      { base:'unknown', name:'Unknown', settings:{url:'188.119.113.252:9117',key:'1',parser_torrent_type:'jackett'}},
      { base:'trs_my_to', name:'Trs.my.to', settings:{url:'trs.my.to:9118',key:'',parser_torrent_type:'jackett'}},
      { base:'jacred_my_to', name:'Jacred.my.to', settings:{url:'jacred.my.to',key:'',parser_torrent_type:'jackett'}},
      { base:'jacred_xyz', name:'Jacred.xyz', settings:{url:'jacred.xyz',key:'',parser_torrent_type:'jackett'}},
      { base:'jac_red_ru', name:'jac-red.ru', settings:{url:'jac-red.ru',key:'',parser_torrent_type:'jackett'}}
    ];

    // ================= ПРОВЕРКА СЕРВЕРОВ =================

    var servers = parsersInfo.map(p => p.settings.url);

    // сбрасываем статусы
    servers.forEach((_, i) => {
      Lampa.Storage.set(`FreeServ_${i+1}`, 'NotFound');
    });

    async function pingServer(url, index){
      try{
        await fetch(`http://${url}/echo`, {mode:'no-cors'});
        Lampa.Storage.set(`FreeServ_${index+1}`, url);
      }catch(e){
        Lampa.Storage.set(`FreeServ_${index+1}`, 'NotFound');
      }
    }

    async function pollServers(){
      for(let i=0;i<servers.length;i++){
        await pingServer(servers[i], i);
      }
    }

    // скрываем NotFound в селектах
    setInterval(() => {
      const el = $('.selectbox-item.selector > div:contains("NotFound")');
      if(el.length) el.parent('div').hide();
    }, 100);

    pollServers();

    // ====================================================

    function changeParser() {
      var jackettUrlTwo = Lampa.Storage.get("lme_url_two");

      var selectedParser = parsersInfo.find(p => p.base === jackettUrlTwo);

      if (selectedParser) {
        var s = selectedParser.settings;
        Lampa.Storage.set(
          s.parser_torrent_type === 'prowlarr' ? "prowlarr_url" : "jackett_url",
          s.url
        );
        Lampa.Storage.set(
          s.parser_torrent_type === 'prowlarr' ? "prowlarr_key" : "jackett_key",
          s.key
        );
        Lampa.Storage.set("parser_torrent_type", s.parser_torrent_type);
      }
    }

    var s_values = parsersInfo.reduce(function(prev, p){
      prev[p.base] = p.name;
      return prev;
    },{ no_parser:'Не выбран' });

    function parserSetting() {
      Lampa.SettingsApi.addParam({
        component:'parser',
        param:{
          name:'lme_url_two',
          type:'select',
          values:s_values,
          "default":'no_parser'
        },
        field:{
          name:`<div class="settings-folder" style="padding:0!important">
                 <div style="font-size:1.0em">${Lampa.Lang.translate('lme_parser')}</div></div>`,
          description:`${Lampa.Lang.translate('lme_parser_description')} ${parsersInfo.length}`
        },
        onChange:function(){
          changeParser();
          Lampa.Settings.update();
        },
        onRender:function(item){
          changeParser();
          setTimeout(function(){
            if(Lampa.Storage.field('parser_use')){
              item.show();
              $('.settings-param__name', item).css('color','f3d900');
              $('div[data-name="lme_url_two"]').insertAfter('div[data-children="parser"]');
            } else item.hide();
          });
        }
      });
    }

    Lampa.Platform.tv();

    function add(){
      translate();
      parserSetting();
    }

    function startPlugin(){
      window.plugin_lmepublictorr_ready = true;
      if(window.appready) add();
      else {
        Lampa.Listener.follow('app', function(e){
          if(e.type==='ready') add();
        });
      }
    }

    if(!window.plugin_lmepublictorr_ready) startPlugin();

})();
