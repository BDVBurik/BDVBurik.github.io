(function () {
    'use strict';

    var Manifest = {api_host:'{localhost}',catalogs:{}};

    function account(url){url=url+'';if(url.indexOf('account_email=')==-1){var email=Lampa.Storage.get('account_email');if(email)url=Lampa.Utils.addUrlComponent(url,'account_email='+encodeURIComponent(email));}if(url.indexOf('uid=')==-1){var uid=Lampa.Storage.get('lampac_unic_id','');if(uid)url=Lampa.Utils.addUrlComponent(url,'uid='+encodeURIComponent(uid));}if(url.indexOf('token=')==-1){var token='{token}';if(token!='')url=Lampa.Utils.addUrlComponent(url,'token={token}');}return url;}var Utils = {account:account};

    var network=new Lampa.Reguest();/**
     * Формирование URL для запросов
     * @param {string} u - метод API
     * @param {object} params - параметры запроса
     * @returns {string} - полный URL
     */function url(u){var params=arguments.length>1&&arguments[1]!==undefined?arguments[1]:{};if(params.page)u=add(u,'page='+params.page);if(params.query)u=add(u,'query='+params.query);return Utils.account(u);}/**
     * Добавление параметра к URL
     * @param {string} u - URL
     * @param {string} params - параметры запроса
     * @returns {string} - URL с добавленным параметром
     */function add(u,params){return u+(/\?/.test(u)?'&':'?')+params;}/**
     * Запрос к API
     * @param {string} method - метод API
     * @param {object} params - параметры запроса
     * @param {function} oncomplite - функция успешного завершения
     * @param {function} onerror - функция ошибки
     */function get(method){var params=arguments.length>1&&arguments[1]!==undefined?arguments[1]:{};var oncomplite=arguments.length>2?arguments[2]:undefined;var onerror=arguments.length>3?arguments[3]:undefined;var u=url(method,params);network.silent(u,function(json){json.url=method;oncomplite(json);},onerror);}function getCatalog(){return Manifest.catalogs[Lampa.Storage.field('source')];}/**
     * Главная страница
     * @param {object} params - параметры запроса
     * @param {function} oncomplite - функция успешного завершения
     * @param {function} onerror - функция ошибки
     * @returns {function} - функция для загрузки следующей части
     */function main(){var params=arguments.length>0&&arguments[0]!==undefined?arguments[0]:{};var oncomplite=arguments.length>1?arguments[1]:undefined;var onerror=arguments.length>2?arguments[2]:undefined;var catalog=getCatalog();var parts_limit=6;var parts_data=[];if(catalog&&catalog.main){var addPart=function addPart(title,url){parts_data.push(function(call){get(url,params,function(json){json.title=title;call(json);},call);});};for(var i in catalog.main){addPart(i,Utils.account(catalog.main[i]));}}else return onerror();function loadPart(partLoaded,partEmpty){Lampa.Api.partNext(parts_data,parts_limit,partLoaded,partEmpty);}loadPart(oncomplite,onerror);return loadPart;}/**
     * Категория
     * @param {object} params - параметры запроса
     * @param {function} oncomplite - функция успешного завершения
     * @param {function} onerror - функция ошибки
     * @returns {function} - функция для загрузки следующей части
     */function category(){var params=arguments.length>0&&arguments[0]!==undefined?arguments[0]:{};var oncomplite=arguments.length>1?arguments[1]:undefined;var onerror=arguments.length>2?arguments[2]:undefined;var catalog=getCatalog();var parts_limit=6;var parts_data=[];if(catalog&&catalog[params.url]){var addPart=function addPart(title,url){parts_data.push(function(call){get(url,params,function(json){json.title=title;call(json);},call);});};for(var i in catalog[params.url]){addPart(i,Utils.account(catalog[params.url][i]));}}else return onerror();function loadPart(partLoaded,partEmpty){Lampa.Api.partNext(parts_data,parts_limit,partLoaded,partEmpty);}loadPart(oncomplite,onerror);return loadPart;}/**
     * Полный просмотр категории (фильмы, сериалы, аниме)
     * @param {object} params - параметры запроса
     * @param {function} oncomplite - функция успешного завершения
     * @param {function} onerror - функция ошибки
     */function list(){var params=arguments.length>0&&arguments[0]!==undefined?arguments[0]:{};var oncomplite=arguments.length>1?arguments[1]:undefined;var onerror=arguments.length>2?arguments[2]:undefined;var u=url(params.id||params.url,params);network.silent(u,oncomplite,onerror);}function full(params,oncomplite){var require=1;// Количество обязательных запросов
    var status=new Lampa.Status(require);status.onComplite=oncomplite;get(Utils.account(params.url),params,function(json){// Источник
    json.source=Lampa.Storage.field('source');// Результат
    status.append('movie',json);},function(){status.error();});}/**
     * Поиск
     * @param {object} params - параметры запроса
     * @param {function} oncomplite - функция успешного завершения
     * @returns {void}
     */function search(){var params=arguments.length>0&&arguments[0]!==undefined?arguments[0]:{};var oncomplite=arguments.length>1?arguments[1]:undefined;var u=Utils.account(getCatalog().search);if(!u)return oncomplite([]);get(u,params,function(json){json.title='Найдено';oncomplite([json]);},function(){oncomplite([]);});}/**
     * Добавить кнопку в поисковую строку
     * @returns {object} - объект кнопки
     */function discovery(catalog_name){return {title:catalog_name,search:search,params:{align_left:true,object:{source:catalog_name}},//onMore: (params)=>{
    //    // Переход из кнопки "Ещё"
    //    Lampa.Activity.push({
    //        url: 'search/' + params.data.type,
    //        title: Lampa.Lang.translate('search') + ' - ' + params.query,
    //        component: 'category_full',
    //        page: 2,
    //        query: encodeURIComponent(params.query),
    //        source: catalog_name
    //    })
    //},
    onCancel:network.clear.bind(network)};}/**
     * Получить список категорий для каталога в меню
     * @param {object} params - параметры запроса
     * @param {function} oncomplite - функция успешного завершения
     */function menu(params,oncomplite){var menu=[];var catalog=getCatalog();if(catalog){for(var i in catalog.menu){menu.push({title:i,id:catalog.menu[i]});}}oncomplite(menu);}function clear(){network.clear();}var Api = {main:main,menu:menu,full:full,list:list,category:category,clear:clear,discovery:discovery};

    function loadCatalogs(){var network=new Lampa.Reguest();network.silent(Utils.account(Manifest.api_host+'/catalog'),function(json){var keys=Object.keys(json);keys.forEach(function(key){Lampa.Params.values.source[key]=key;Object.defineProperty(Lampa.Api.sources,key,{get:function get(){return Api;}});Lampa.Search.addSource(Api.discovery(key));});Manifest.catalogs=json;});}function startPlugin(){window.plugin_catalog=true;if(window.appready)loadCatalogs();else {Lampa.Listener.follow('app',function(e){if(e.type=='ready')loadCatalogs();});}}if(!window.plugin_catalog)startPlugin();

})();
