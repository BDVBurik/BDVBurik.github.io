(function () {
  'use strict';

  function translate() {
    Lampa.Lang.add({
      lme_parser: {
        ru: 'Каталог парсеров',
        en: 'Parsers catalog'
      },
      lme_parser_description: {
        ru: 'Нажмите для выбора парсера из ',
        en: 'Click to select a parser from the '
      }
    });
  }

  var parsersInfo = [
    { base:'lampaUA', name:'Lampa.UA', settings:{url:'lampaua.mooo.com',key:'1',parser_torrent_type:'jackett'}}, 
    { base:'lampa_app', name:'Lampa.app', settings:{url:'lampa.app',key:'',parser_torrent_type:'jackett'}},
    { base:'jacred_xyz', name:'Jacred.xyz', settings:{url:'jacred.xyz',key:'',parser_torrent_type:'jackett'}},
    { base:'jr_maxvol_pro', name:'jr.maxvol.pro', settings:{url:'jr.maxvol.pro',key:'',parser_torrent_type:'jackett'}}
  ];

  // ===== СБРОС СТАТУСОВ =====
  parsersInfo.forEach((_,i)=>{
    Lampa.Storage.set(`FreeServ_${i}`, 'Offline');
  });

  // ===== ПРОВЕРКА JACRED =====
  async function pingServer(p,index){
    try{
      let r = await fetch(
        `https://${p.settings.url}/api/v2.0/indexers/all/results?apikey=${p.settings.key}&Query=test`,
        { cache:'no-store' }
      );

      if(!r.ok) throw 1;

      let t = await r.text();
      if(!t || t.length < 5) throw 1;

      Lampa.Storage.set(`FreeServ_${index}`, 'Online');
    }catch(e){
      Lampa.Storage.set(`FreeServ_${index}`, 'Offline');
    }
  }

  async function pollServers(){
    for(let i=0;i<parsersInfo.length;i++){
      await pingServer(parsersInfo[i], i);
    }
  }

  pollServers();

  // ===== ОБНОВЛЕНИЕ UI =====
  setInterval(()=>{
    $('.selectbox-item.selector > div').each(function(){

      let title = $(this).text().trim();

      parsersInfo.forEach((p,i)=>{
        if(title.indexOf(p.name) !== -1){

          let st = Lampa.Storage.get(`FreeServ_${i}`);

          let label = st === 'Online'
            ? '<span style="color:#00ff9c"> Online</span>'
            : '<span style="color:#ff5555"> Offline</span>';

          let clean = p.name;
          $(this).html(clean + label);

          $(this).css({
            opacity: st === 'Online' ? '1' : '0.5'
          });
        }
      });

    });
  },300);

  // ===== ЛОГИКА ВЫБОРА =====
  function changeParser() {
    var jackettUrlTwo = Lampa.Storage.get("lme_url_two");
    var selectedParser = parsersInfo.find(p => p.base === jackettUrlTwo);

    if (selectedParser) {
      var s = selectedParser.settings;
      Lampa.Storage.set("jackett_url", s.url);
      Lampa.Storage.set("jackett_key", s.key);
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
