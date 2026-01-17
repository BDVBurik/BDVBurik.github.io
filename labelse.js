
(function () {
    'use strict';

    // --- Р—Р°С…РёСЃС‚ РІС–Рґ РїРѕРІС‚РѕСЂРЅРѕРіРѕ Р·Р°РїСѓСЃРєСѓ РїР»Р°РіС–РЅР° ---
    // РџРµСЂРµРІС–СЂСЏС”РјРѕ, С‡Рё РїР»Р°РіС–РЅ РІР¶Рµ Р±СѓРІ С–РЅС–С†С–Р°Р»С–Р·РѕРІР°РЅРёР№
    if (window.SeasonBadgePlugin && window.SeasonBadgePlugin.__initialized) return;
    
    // Р†РЅС–С†С–Р°Р»С–Р·СѓС”РјРѕ РіР»РѕР±Р°Р»СЊРЅРёР№ РѕР±'С”РєС‚ РїР»Р°РіС–РЅР°
    window.SeasonBadgePlugin = window.SeasonBadgePlugin || {};
    window.SeasonBadgePlugin.__initialized = true;

    // === РќРђР›РђРЁРўРЈР’РђРќРќРЇ РџР›РђР“Р†РќРђ ===
    var CONFIG = {
        tmdbApiKey: '4ef0d7355d9ffb5151e987764708ce96',   // API РєР»СЋС‡ РґР»СЏ РґРѕСЃС‚СѓРїСѓ РґРѕ TMDB
        cacheTime: 24 * 60 * 60 * 1000,                   // Р§Р°СЃ Р·Р±РµСЂС–РіР°РЅРЅСЏ РєРµС€Сѓ (24 РіРѕРґРёРЅРё)
        enabled: true,                                    // РђРєС‚РёРІСѓРІР°С‚Рё/РґРµР°РєС‚РёРІСѓРІР°С‚Рё РїР»Р°РіС–РЅ
        language: 'uk'                                    // РњРѕРІР° РґР»СЏ Р·Р°РїРёС‚С–РІ РґРѕ TMDB
    };

    // === РЎРўРР›Р† Р”Р›РЇ РњР†РўРћРљ РЎР•Р—РћРќРЈ ===
    var style = document.createElement('style');
    style.textContent = `
    /* РЎС‚РёР»СЊ РґР»СЏ Р—РђР’Р•Р РЁР•РќРРҐ СЃРµР·РѕРЅС–РІ (Р·РµР»РµРЅР° РјС–С‚РєР°) */
    .card--season-complete {
        position: absolute;
        left: 0;
        bottom: 0.50em;
        background-color: rgba(61, 161, 141, 0.8);  /* Р—РµР»РµРЅРёР№ РєРѕР»С–СЂ */
        z-index: 12;
        width: fit-content;
        max-width: calc(100% - 1em);
        border-radius: 0 0.8em 0.8em 0em;
        overflow: hidden;
        opacity: 0;
        transition: opacity 0.22s ease-in-out;
    }
    
    /* РЎС‚РёР»СЊ РґР»СЏ РќР•Р—РђР’Р•Р РЁР•РќРРҐ СЃРµР·РѕРЅС–РІ (Р¶РѕРІС‚Р° РјС–С‚РєР° Р· РїСЂРѕРіСЂРµСЃРѕРј) */
    .card--season-progress {
        position: absolute;
        left: 0;
        bottom: 0.50em;
        background-color: rgba(255, 193, 7, 0.8);   /* Р–РѕРІС‚РёР№ РєРѕР»С–СЂ */
        z-index: 12;
        width: fit-content;
        max-width: calc(100% - 1em);
        border-radius: 0 0.8em 0.8em 0em;
        overflow: hidden;
        opacity: 0;
        transition: opacity 0.22s ease-in-out;
    }
    
    /* Р—Р°РіР°Р»СЊРЅС– СЃС‚РёР»С– РґР»СЏ С‚РµРєСЃС‚Сѓ РІ РјС–С‚РєР°С… - РћР”РРќРђРљРћР’Р† Р”Р›РЇ РћР‘РћРҐ РўРРџР†Р’ */
    .card--season-complete div,
    .card--season-progress div {
        text-transform: uppercase;
        font-family: 'Roboto Condensed', 'Arial Narrow', Arial, sans-serif;  /* РўРѕР№ СЃР°РјРёР№ С€СЂРёС„С‚ */
        font-weight: 700;                                                    /* РўРѕР№ СЃР°РјРёР№ Р¶РёСЂРЅРёР№ С€СЂРёС„С‚ */
        font-size: 1.05em;                                                   /* РўРѕР№ СЃР°РјРёР№ СЂРѕР·РјС–СЂ */
        padding: 0.3em 0.4em;                                                /* РўРѕР№ СЃР°РјРёР№ РІС–РґСЃС‚СѓРї */
        white-space: nowrap;                                                 /* РўРѕР№ СЃР°РјРёР№ РїРµСЂРµРЅРѕСЃ */
        display: flex;                                                       /* РўРѕР№ СЃР°РјРёР№ flex */
        align-items: center;                                                 /* РўРѕР№ СЃР°РјРёР№ РІРёСЂС–РІРЅСЋРІР°РЅРЅСЏ */
        gap: 4px;                                                            /* РўРѕР№ СЃР°РјРёР№ РїСЂРѕРјС–Р¶РѕРє */
        text-shadow: 0.5px 0.5px 1px rgba(0,0,0,0.3);
    }
    
    /* РљРѕР»С–СЂ С‚РµРєСЃС‚Сѓ РґР»СЏ Р·Р°РІРµСЂС€РµРЅРёС… СЃРµР·РѕРЅС–РІ (Р±С–Р»РёР№ РЅР° Р·РµР»РµРЅРѕРјСѓ) */
    .card--season-complete div {
        color: #ffffff;  /* Р‘С–Р»РёР№ С‚РµРєСЃС‚ РґР»СЏ РєСЂР°С‰РѕС— РІРёРґРёРјРѕСЃС‚С– РЅР° Р·РµР»РµРЅРѕРјСѓ С„РѕРЅС– */
    }
    
    /* РљРѕР»С–СЂ С‚РµРєСЃС‚Сѓ РґР»СЏ РЅРµР·Р°РІРµСЂС€РµРЅРёС… СЃРµР·РѕРЅС–РІ (С‡РѕСЂРЅРёР№ РЅР° Р¶РѕРІС‚РѕРјСѓ) */
    .card--season-progress div {
        color: #000000;  /* Р§РѕСЂРЅРёР№ С‚РµРєСЃС‚ РґР»СЏ РєСЂР°С‰РѕС— РІРёРґРёРјРѕСЃС‚С– РЅР° Р¶РѕРІС‚РѕРјСѓ С„РѕРЅС– */
    }
    
    /* РљР»Р°СЃ РґР»СЏ РїР»Р°РІРЅРѕРіРѕ РїРѕРєР°Р·Сѓ РјС–С‚РєРё */
    .card--season-complete.show,
    .card--season-progress.show {
        opacity: 1;  /* РџРѕРІРЅР° РІРёРґРёРјС–СЃС‚СЊ РїСЂРё РїРѕРєР°Р·С– */
    }
    
    /* РђРґР°РїС‚Р°С†С–СЏ РґР»СЏ РјРѕР±С–Р»СЊРЅРёС… РїСЂРёСЃС‚СЂРѕС—РІ */
    @media (max-width: 768px) {
        .card--season-complete div,
        .card--season-progress div {
            font-size: 0.95em;  /* РўСЂРѕС…Рё РјРµРЅС€РёР№ СЂРѕР·РјС–СЂ С€СЂРёС„С‚Сѓ РЅР° РјРѕР±С–Р»СЊРЅРёС… */
            padding: 0.22em 0.5em; /* РґРѕРґР°РЅРѕ РњР•РќРЁР† Р’Р†Р”РЎРўРЈРџР РќРђ РњРћР‘Р†Р›Р¬РќРРҐ */
        }
    }
    `;
    // Р”РѕРґР°С”РјРѕ СЃС‚РёР»С– РґРѕ РіРѕР»РѕРІРЅРѕС— С‡Р°СЃС‚РёРЅРё РґРѕРєСѓРјРµРЅС‚Р°
    document.head.appendChild(style);

    // === Р”РћРџРћРњР†Р–РќР† Р¤РЈРќРљР¦Р†Р‡ ===

    /**
     * Р’РёР·РЅР°С‡Р°С” С‚РёРї РјРµРґС–Р° РЅР° РѕСЃРЅРѕРІС– РґР°РЅРёС… РєР°СЂС‚РєРё
     * @param {Object} cardData - РґР°РЅС– РєР°СЂС‚РєРё
     * @returns {string} - С‚РёРї РјРµРґС–Р° ('tv', 'movie', 'unknown')
     */
    function getMediaType(cardData) {
        // РЇРєС‰Рѕ РґР°РЅС– РІС–РґСЃСѓС‚РЅС– - РїРѕРІРµСЂС‚Р°С”РјРѕ 'unknown'
        if (!cardData) return 'unknown';
        
        // РџРµСЂРµРІС–СЂРєР° РЅР° СЃРµСЂС–Р°Р» (РЅР°СЏРІРЅС–СЃС‚СЊ РЅР°Р·РІРё Р°Р±Рѕ РґР°С‚Рё РїРµСЂС€РѕРіРѕ РµС„С–СЂСѓ)
        if (cardData.name || cardData.first_air_date) return 'tv';
        
        // РџРµСЂРµРІС–СЂРєР° РЅР° С„С–Р»СЊРј (РЅР°СЏРІРЅС–СЃС‚СЊ РЅР°Р·РІРё Р°Р±Рѕ РґР°С‚Рё СЂРµР»С–Р·Сѓ)
        if (cardData.title || cardData.release_date) return 'movie';
        
        // РЇРєС‰Рѕ С‚РёРї РЅРµ РІРёР·РЅР°С‡РµРЅРѕ
        return 'unknown';
    }

    // Р†РЅС–С†С–Р°Р»С–Р·Р°С†С–СЏ РєРµС€Сѓ Р· localStorage
    // Р’РёРєРѕСЂРёСЃС‚РѕРІСѓС”РјРѕ localStorage РґР»СЏ Р·Р±РµСЂС–РіР°РЅРЅСЏ РєРµС€РѕРІР°РЅРёС… РґР°РЅРёС…
    var cache = JSON.parse(localStorage.getItem('seasonBadgeCache') || '{}');

    /**
     * Р—Р°РІР°РЅС‚Р°Р¶СѓС” РґР°РЅС– СЃРµСЂС–Р°Р»Сѓ Р· TMDB API Р· РІРёРєРѕСЂРёСЃС‚Р°РЅРЅСЏРј РєРµС€Сѓ
     * @param {number} tmdbId - ID СЃРµСЂС–Р°Р»Сѓ РІ Р±Р°Р·С– TMDB
     * @returns {Promise} - РїСЂРѕРјС–СЃ Р· РґР°РЅРёРјРё СЃРµСЂС–Р°Р»Сѓ
     */
    function fetchSeriesData(tmdbId) {
        return new Promise(function(resolve, reject) {
            // РџРµСЂРµРІС–СЂРєР° РєРµС€Сѓ: СЏРєС‰Рѕ РґР°РЅС– С” С– РЅРµ РїСЂРѕСЃС‚СЂРѕС‡РµРЅС– - РІРёРєРѕСЂРёСЃС‚РѕРІСѓС”РјРѕ С—С…
            if (cache[tmdbId] && (Date.now() - cache[tmdbId].timestamp < CONFIG.cacheTime)) {
                return resolve(cache[tmdbId].data);
            }

            // РџРµСЂРµРІС–СЂРєР° РєРѕСЂРµРєС‚РЅРѕСЃС‚С– API РєР»СЋС‡Р°
            if (!CONFIG.tmdbApiKey || CONFIG.tmdbApiKey === 'РІР°С€_tmdb_api_key_С‚СѓС‚') {
                return reject(new Error('Р‘СѓРґСЊ Р»Р°СЃРєР°, РІСЃС‚Р°РІС‚Рµ РєРѕСЂРµРєС‚РЅРёР№ TMDB API РєР»СЋС‡'));
            }

            // Р¤РѕСЂРјСѓРІР°РЅРЅСЏ URL РґР»СЏ Р·Р°РїРёС‚Сѓ РґРѕ TMDB API
            var url = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${CONFIG.tmdbApiKey}&language=${CONFIG.language}`;
            
            // Р’РёРєРѕРЅР°РЅРЅСЏ HTTP Р·Р°РїРёС‚Сѓ РґРѕ TMDB API
            fetch(url)
                .then(response => response.json())  // РџРµСЂРµС‚РІРѕСЂСЋС”РјРѕ РІС–РґРїРѕРІС–РґСЊ РІ JSON
                .then(function(data) {
                    // РџРµСЂРµРІС–СЂРєР° РЅР° РїРѕРјРёР»РєСѓ РІС–Рґ API
                    if (data.success === false) throw new Error(data.status_message);

                    // Р—Р±РµСЂРµР¶РµРЅРЅСЏ РґР°РЅРёС… РІ РєРµС€ Р· РїРѕС‚РѕС‡РЅРѕСЋ РјС–С‚РєРѕСЋ С‡Р°СЃСѓ
                    cache[tmdbId] = { 
                        data: data, 
                        timestamp: Date.now() 
                    };
                    // Р—Р±РµСЂС–РіР°С”РјРѕ РѕРЅРѕРІР»РµРЅРёР№ РєРµС€ РІ localStorage
                    localStorage.setItem('seasonBadgeCache', JSON.stringify(cache));

                    // РџРѕРІРµСЂС‚Р°С”РјРѕ РѕС‚СЂРёРјР°РЅС– РґР°РЅС–
                    resolve(data);
                })
                .catch(reject);  // РџРµСЂРµРґР°С”РјРѕ РїРѕРјРёР»РєСѓ РґР°Р»С–
        });
    }

    /**
     * РџРµСЂРµРІС–СЂСЏС” СЃС‚Р°РЅ СЃРµР·РѕРЅСѓ С‚Р° РїРѕРІРµСЂС‚Р°С” С–РЅС„РѕСЂРјР°С†С–СЋ РїСЂРѕ РїСЂРѕРіСЂРµСЃ
     * @param {Object} tmdbData - РґР°РЅС– СЃРµСЂС–Р°Р»Сѓ Р· TMDB
     * @returns {Object|boolean} - С–РЅС„РѕСЂРјР°С†С–СЏ РїСЂРѕ РїСЂРѕРіСЂРµСЃ Р°Р±Рѕ false
     */
    function getSeasonProgress(tmdbData) {
        // РџРµСЂРµРІС–СЂРєР° РЅР°СЏРІРЅРѕСЃС‚С– РЅРµРѕР±С…С–РґРЅРёС… РґР°РЅРёС…
        if (!tmdbData || !tmdbData.seasons || !tmdbData.last_episode_to_air) return false;
        
        // РћСЃС‚Р°РЅРЅС–Р№ РІРёРїСѓС‰РµРЅРёР№ РµРїС–Р·РѕРґ
        var lastEpisode = tmdbData.last_episode_to_air;
        
        // РџРѕС€СѓРє РїРѕС‚РѕС‡РЅРѕРіРѕ СЃРµР·РѕРЅСѓ (СЃРµР·РѕРЅРё Р· РЅРѕРјРµСЂРѕРј > 0, С‰РѕР± РІРёРєР»СЋС‡РёС‚Рё СЃРїРµС†С–Р°Р»СЊРЅС– СЃРµР·РѕРЅРё)
        var currentSeason = tmdbData.seasons.find(s => 
            s.season_number === lastEpisode.season_number && s.season_number > 0
        );
        
        // РЇРєС‰Рѕ СЃРµР·РѕРЅ РЅРµ Р·РЅР°Р№РґРµРЅРѕ
        if (!currentSeason) return false;
        
        // Р—Р°РіР°Р»СЊРЅР° РєС–Р»СЊРєС–СЃС‚СЊ РµРїС–Р·РѕРґС–РІ РІ СЃРµР·РѕРЅС–
        var totalEpisodes = currentSeason.episode_count || 0;
        
        // РљС–Р»СЊРєС–СЃС‚СЊ РІРёРїСѓС‰РµРЅРёС… РµРїС–Р·РѕРґС–РІ
        var airedEpisodes = lastEpisode.episode_number || 0;
        
        // РџРѕРІРµСЂС‚Р°С”РјРѕ РѕР±'С”РєС‚ Р· РґРµС‚Р°Р»СЊРЅРѕСЋ С–РЅС„РѕСЂРјР°С†С–С”СЋ РїСЂРѕ РїСЂРѕРіСЂРµСЃ
        return {
            seasonNumber: lastEpisode.season_number,  // РќРѕРјРµСЂ РїРѕС‚РѕС‡РЅРѕРіРѕ СЃРµР·РѕРЅСѓ
            airedEpisodes: airedEpisodes,             // РљС–Р»СЊРєС–СЃС‚СЊ РІРёРїСѓС‰РµРЅРёС… РµРїС–Р·РѕРґС–РІ
            totalEpisodes: totalEpisodes,             // Р—Р°РіР°Р»СЊРЅР° РєС–Р»СЊРєС–СЃС‚СЊ РµРїС–Р·РѕРґС–РІ
            isComplete: airedEpisodes >= totalEpisodes  // Р§Рё Р·Р°РІРµСЂС€РµРЅРёР№ СЃРµР·РѕРЅ
        };
    }

    /**
     * РЎС‚РІРѕСЂСЋС” DOM-РµР»РµРјРµРЅС‚ РјС–С‚РєРё СЃРµР·РѕРЅСѓ
     * @param {string} content - С‚РµРєСЃС‚РѕРІРёР№ РІРјС–СЃС‚ РјС–С‚РєРё
     * @param {boolean} isComplete - С‡Рё С” СЃРµР·РѕРЅ Р·Р°РІРµСЂС€РµРЅРёРј
     * @param {boolean} loading - С‡Рё С” С†Рµ С‚РёРјС‡Р°СЃРѕРІРѕСЋ РјС–С‚РєРѕСЋ Р·Р°РІР°РЅС‚Р°Р¶РµРЅРЅСЏ
     * @returns {HTMLElement} - СЃС‚РІРѕСЂРµРЅРёР№ РµР»РµРјРµРЅС‚ РјС–С‚РєРё
     */
    function createBadge(content, isComplete, loading) {
        // РЎС‚РІРѕСЂСЋС”РјРѕ РЅРѕРІРёР№ div РµР»РµРјРµРЅС‚ РґР»СЏ РјС–С‚РєРё
        var badge = document.createElement('div');
        
        // Р’РёР±РёСЂР°С”РјРѕ CSS РєР»Р°СЃ РІ Р·Р°Р»РµР¶РЅРѕСЃС‚С– РІС–Рґ СЃС‚Р°РЅСѓ СЃРµР·РѕРЅСѓ
        var badgeClass = isComplete ? 'card--season-complete' : 'card--season-progress';
        
        // Р’СЃС‚Р°РЅРѕРІР»СЋС”РјРѕ РєР»Р°СЃ РµР»РµРјРµРЅС‚Р° (РґРѕРґР°С”РјРѕ 'loading' СЏРєС‰Рѕ С†Рµ С‚РёРјС‡Р°СЃРѕРІР° РјС–С‚РєР°)
        badge.className = badgeClass + (loading ? ' loading' : '');
        
        // Р’СЃС‚Р°РЅРѕРІР»СЋС”РјРѕ HTML РІРјС–СЃС‚ РјС–С‚РєРё
        badge.innerHTML = `<div>${content}</div>`;
        
        // РџРѕРІРµСЂС‚Р°С”РјРѕ СЃС‚РІРѕСЂРµРЅРёР№ РµР»РµРјРµРЅС‚
        return badge;
    }

    /**
     * Р’РёСЂС–РІРЅСЋС” РјС–С‚РєСѓ СЃРµР·РѕРЅСѓ РІС–РґРЅРѕСЃРЅРѕ РјС–С‚РєРё СЏРєРѕСЃС‚С–
     * @param {HTMLElement} cardEl - РµР»РµРјРµРЅС‚ РєР°СЂС‚РєРё
     * @param {HTMLElement} badge - РµР»РµРјРµРЅС‚ РјС–С‚РєРё СЃРµР·РѕРЅСѓ
     */
    function adjustBadgePosition(cardEl, badge) {
        // Р—РЅР°С…РѕРґРёРјРѕ РјС–С‚РєСѓ СЏРєРѕСЃС‚С– РІС–РґРµРѕ РІ РєР°СЂС‚С†С–
        let quality = cardEl.querySelector('.card__quality');
        
        if (quality && badge) {
            // Р’РРџРђР”РћРљ 1: Р„ РјС–С‚РєР° СЏРєРѕСЃС‚С– - СЂРѕР·РјС–С‰СѓС”РјРѕ РјС–С‚РєСѓ СЃРµР·РѕРЅСѓ РІРёС‰Рµ РЅРµС—
            
            // РћС‚СЂРёРјСѓС”РјРѕ С„Р°РєС‚РёС‡РЅСѓ РІРёСЃРѕС‚Сѓ РјС–С‚РєРё СЏРєРѕСЃС‚С–
            let qHeight = quality.offsetHeight; 
            
            // РћС‚СЂРёРјСѓС”РјРѕ Р·РЅР°С‡РµРЅРЅСЏ РЅРёР¶РЅСЊРѕРіРѕ РІС–РґСЃС‚СѓРїСѓ РјС–С‚РєРё СЏРєРѕСЃС‚С– Р· CSS
            let qBottom = parseFloat(getComputedStyle(quality).bottom) || 0; 
            
            // Р’СЃС‚Р°РЅРѕРІР»СЋС”РјРѕ РїРѕР·РёС†С–СЋ РјС–С‚РєРё СЃРµР·РѕРЅСѓ (РІРёС‰Рµ РјС–С‚РєРё СЏРєРѕСЃС‚С–)
            badge.style.bottom = (qHeight + qBottom) + 'px';
        } else if (badge) {
            // Р’РРџРђР”РћРљ 2: РњС–С‚РєРё СЏРєРѕСЃС‚С– РЅРµРјР°С” - СЂРѕР·РјС–С‰СѓС”РјРѕ РјС–С‚РєСѓ СЃРµР·РѕРЅСѓ РІ СЃС‚Р°РЅРґР°СЂС‚РЅРѕРјСѓ РїРѕР»РѕР¶РµРЅРЅС–
            badge.style.bottom = '0.50em'; // РЎС‚Р°РЅРґР°СЂС‚РЅРёР№ РЅРёР¶РЅС–Р№ РІС–РґСЃС‚СѓРї
        }
    }

    // === Р”РћР”РђРўРљРћР’Р† Р¤РЈРќРљР¦Р†Р‡ Р”Р›РЇ Р РћР‘РћРўР Р— РњР†РўРљРђРњР РЇРљРћРЎРўР† ===
    
    /**
     * РћРЅРѕРІР»СЋС” РїРѕР·РёС†С–С— РІСЃС–С… РјС–С‚РѕРє СЃРµР·РѕРЅСѓ РїСЂРё Р·РјС–РЅР°С… РІ РєР°СЂС‚С†С–
     * Р’РёРєРѕСЂРёСЃС‚РѕРІСѓС”С‚СЊСЃСЏ РїСЂРё РґРѕРґР°РІР°РЅРЅС–/РІРёРґР°Р»РµРЅРЅС– РјС–С‚РѕРє СЏРєРѕСЃС‚С–
     * @param {HTMLElement} cardEl - РµР»РµРјРµРЅС‚ РєР°СЂС‚РєРё
     */
    function updateBadgePositions(cardEl) {
        // Р—РЅР°С…РѕРґРёРјРѕ РІСЃС– РјС–С‚РєРё СЃРµР·РѕРЅСѓ РІ РєР°СЂС‚С†С– (РѕР±РѕС… С‚РёРїС–РІ)
        var badges = cardEl.querySelectorAll('.card--season-complete, .card--season-progress');
        
        // Р”Р»СЏ РєРѕР¶РЅРѕС— Р·РЅР°Р№РґРµРЅРѕС— РјС–С‚РєРё РѕРЅРѕРІР»СЋС”РјРѕ РїРѕР·РёС†С–СЋ
        badges.forEach(function(badge) {
            adjustBadgePosition(cardEl, badge);
        });
    }

    // === РЎРџРћРЎРўР•Р Р•Р–Р•РќРќРЇ Р—Рђ Р—РњР†РќРђРњР РњР†РўРћРљ РЇРљРћРЎРўР† ===
    // РЎС‚РІРѕСЂСЋС”РјРѕ СЃРїРѕСЃС‚РµСЂС–РіР°С‡ РґР»СЏ РІС–РґСЃС‚РµР¶РµРЅРЅСЏ РґРѕРґР°РІР°РЅРЅСЏ/РІРёРґР°Р»РµРЅРЅСЏ РјС–С‚РѕРє СЏРєРѕСЃС‚С–
    var qualityObserver = new MutationObserver(function(mutations) {
        // РџРµСЂРµР±РёСЂР°С”РјРѕ РІСЃС– Р·РЅР°Р№РґРµРЅС– Р·РјС–РЅРё
        mutations.forEach(function(mutation) {
            
            // РџРµСЂРµРІС–СЂСЏС”РјРѕ РґРѕРґР°РЅС– РІСѓР·Р»Рё (РЅРѕРІС– РјС–С‚РєРё СЏРєРѕСЃС‚С–)
            mutation.addedNodes?.forEach(function(node) {
                // РџРµСЂРµРІС–СЂСЏС”РјРѕ, С‡Рё РґРѕРґР°РЅРѕ РјС–С‚РєСѓ СЏРєРѕСЃС‚С–
                if (node.classList && node.classList.contains('card__quality')) {
                    // Р—РЅР°С…РѕРґРёРјРѕ Р±Р°С‚СЊРєС–РІСЃСЊРєСѓ РєР°СЂС‚РєСѓ РґР»СЏ С†С–С”С— РјС–С‚РєРё СЏРєРѕСЃС‚С–
                    var cardEl = node.closest('.card');
                    if (cardEl) {
                        // РћРЅРѕРІР»СЋС”РјРѕ РїРѕР·РёС†С–СЋ РјС–С‚РєРё СЃРµР·РѕРЅСѓ РїСЂРё РґРѕРґР°РІР°РЅРЅС– РјС–С‚РєРё СЏРєРѕСЃС‚С–
                        // Р’РёРєРѕСЂРёСЃС‚РѕРІСѓС”РјРѕ Р·Р°С‚СЂРёРјРєСѓ РґР»СЏ РіР°СЂР°РЅС‚С–С— С‰Рѕ DOM РѕРЅРѕРІРёРІСЃСЏ
                        setTimeout(() => {
                            updateBadgePositions(cardEl);
                        }, 100);
                    }
                }
            });
            
            // РџРµСЂРµРІС–СЂСЏС”РјРѕ РІРёРґР°Р»РµРЅС– РІСѓР·Р»Рё (РІРёРґР°Р»РµРЅС– РјС–С‚РєРё СЏРєРѕСЃС‚С–)
            mutation.removedNodes?.forEach(function(node) {
                if (node.classList && node.classList.contains('card__quality')) {
                    // Р—РЅР°С…РѕРґРёРјРѕ Р±Р°С‚СЊРєС–РІСЃСЊРєСѓ РєР°СЂС‚РєСѓ РґР»СЏ РІРёРґР°Р»РµРЅРѕС— РјС–С‚РєРё СЏРєРѕСЃС‚С–
                    var cardEl = node.closest('.card');
                    if (cardEl) {
                        // РћРЅРѕРІР»СЋС”РјРѕ РїРѕР·РёС†С–СЋ РјС–С‚РєРё СЃРµР·РѕРЅСѓ РїСЂРё РІРёРґР°Р»РµРЅРЅС– РјС–С‚РєРё СЏРєРѕСЃС‚С–
                        setTimeout(() => {
                            updateBadgePositions(cardEl);
                        }, 100);
                    }
                }
            });
        });
    });

    /**
     * Р”РѕРґР°С” РјС–С‚РєСѓ СЃС‚Р°С‚СѓСЃСѓ СЃРµР·РѕРЅСѓ РґРѕ РєР°СЂС‚РєРё СЃРµСЂС–Р°Р»Сѓ
     * @param {HTMLElement} cardEl - РµР»РµРјРµРЅС‚ РєР°СЂС‚РєРё
     */
    function addSeasonBadge(cardEl) {
        // РџРµСЂРµРІС–СЂРєР°: С‡Рё РєР°СЂС‚РєР° РІР¶Рµ РѕР±СЂРѕР±Р»РµРЅР° Р°Р±Рѕ РІС–РґСЃСѓС‚РЅСЏ
        if (!cardEl || cardEl.hasAttribute('data-season-processed')) return;

        // РџРµСЂРµРІС–СЂРєР°: С‡Рё РіРѕС‚РѕРІС– РґР°РЅС– РєР°СЂС‚РєРё (СЏРєС‰Рѕ РЅС– - РІС–РґРєР»Р°РґР°С”РјРѕ РѕР±СЂРѕР±РєСѓ)
        if (!cardEl.card_data) {
            // Р’РёРєР»РёРєР°С”РјРѕ С„СѓРЅРєС†С–СЋ Р·РЅРѕРІСѓ С‡РµСЂРµР· requestAnimationFrame
            requestAnimationFrame(() => addSeasonBadge(cardEl));
            return;
        }

        // РћС‚СЂРёРјСѓС”РјРѕ РґР°РЅС– РєР°СЂС‚РєРё
        var data = cardEl.card_data;

        // РџРµСЂРµРІС–СЂРєР°: С‡Рё С” С†Рµ СЃРµСЂС–Р°Р» (С‚С–Р»СЊРєРё РґР»СЏ СЃРµСЂС–Р°Р»С–РІ РїРѕРєР°Р·СѓС”РјРѕ РјС–С‚РєСѓ)
        if (getMediaType(data) !== 'tv') return;

        // Р—РЅР°С…РѕРґР¶РµРЅРЅСЏ РєРѕРЅС‚РµР№РЅРµСЂР° РґР»СЏ РјС–С‚РѕРє (РµР»РµРјРµРЅС‚ .card__view)
        var view = cardEl.querySelector('.card__view');
        if (!view) return;

        // Р’РёРґР°Р»РµРЅРЅСЏ РїРѕРїРµСЂРµРґРЅС–С… РјС–С‚РѕРє РѕР±РѕС… С‚РёРїС–РІ (СЏРєС‰Рѕ РІРѕРЅРё С–СЃРЅСѓСЋС‚СЊ)
        var oldBadges = view.querySelectorAll('.card--season-complete, .card--season-progress');
        oldBadges.forEach(function(badge) {
            badge.remove();
        });

        // РЎС‚РІРѕСЂРµРЅРЅСЏ С‚РёРјС‡Р°СЃРѕРІРѕС— РјС–С‚РєРё Р·Р°РІР°РЅС‚Р°Р¶РµРЅРЅСЏ (РїРѕ РґРµС„РѕР»С‚Сѓ - РґР»СЏ РЅРµР·Р°РІРµСЂС€РµРЅРёС… СЃРµР·РѕРЅС–РІ)
        var badge = createBadge('...', false, true);
        
        // Р”РѕРґР°РІР°РЅРЅСЏ РјС–С‚РєРё РґРѕ DOM
        view.appendChild(badge);
        
        // Р’РРљР›РРљ 1: РџРµСЂС€Рµ РІРёСЂС–РІРЅСЋРІР°РЅРЅСЏ РѕРґСЂР°Р·Сѓ РїС–СЃР»СЏ РґРѕРґР°РІР°РЅРЅСЏ РІ DOM
        adjustBadgePosition(cardEl, badge);

        // === РЎРџРћРЎРўР•Р Р•Р–Р•РќРќРЇ Р—Рђ РњР†РўРљРћР® РЇРљРћРЎРўР† Р’ Р¦Р†Р™ РљРђР РўР¦Р† ===
        // РџС–РґРєР»СЋС‡Р°С”РјРѕ СЃРїРѕСЃС‚РµСЂС–РіР°С‡ РґР»СЏ РІС–РґСЃС‚РµР¶РµРЅРЅСЏ Р·РјС–РЅ РјС–С‚РѕРє СЏРєРѕСЃС‚С–
        try {
            qualityObserver.observe(view, {
                childList: true,    // РЎРїРѕСЃС‚РµСЂРµР¶РµРЅРЅСЏ Р·Р° РґРѕРґР°РІР°РЅРЅСЏРј/РІРёРґР°Р»РµРЅРЅСЏРј РґРѕС‡С–СЂРЅС–С… РµР»РµРјРµРЅС‚С–РІ
                subtree: true       // РЎРїРѕСЃС‚РµСЂРµР¶РµРЅРЅСЏ Р·Р° РІСЃС–РјР° РІРєР»Р°РґРµРЅРёРјРё РµР»РµРјРµРЅС‚Р°РјРё
            });
        } catch (e) {
            // РћР±СЂРѕР±РєР° РјРѕР¶Р»РёРІРёС… РїРѕРјРёР»РѕРє РїСЂРё СЃРїРѕСЃС‚РµСЂРµР¶РµРЅРЅС–
            console.log('РџРѕРјРёР»РєР° СЃРїРѕСЃС‚РµСЂРµР¶РµРЅРЅСЏ Р·Р° РјС–С‚РєР°РјРё СЏРєРѕСЃС‚С–:', e);
        }

        // РџРѕР·РЅР°С‡РµРЅРЅСЏ РєР°СЂС‚РєРё СЏРє РѕР±СЂРѕР±Р»РµРЅРѕС— (СЃС‚Р°С‚СѓСЃ: Р·Р°РІР°РЅС‚Р°Р¶РµРЅРЅСЏ)
        cardEl.setAttribute('data-season-processed', 'loading');

        // Р—Р°РІР°РЅС‚Р°Р¶РµРЅРЅСЏ РґР°РЅРёС… СЃРµСЂС–Р°Р»Сѓ Р· TMDB
        fetchSeriesData(data.id)
            .then(function(tmdbData) {
                // РћС‚СЂРёРјСѓС”РјРѕ С–РЅС„РѕСЂРјР°С†С–СЋ РїСЂРѕ РїСЂРѕРіСЂРµСЃ СЃРµР·РѕРЅСѓ
                var progressInfo = getSeasonProgress(tmdbData);
                
                // РџРµСЂРµРІС–СЂСЏС”РјРѕ, С‡Рё РІРґР°Р»РѕСЃСЏ РѕС‚СЂРёРјР°С‚Рё С–РЅС„РѕСЂРјР°С†С–СЋ
                if (progressInfo) {
                    var content = '';
                    var isComplete = progressInfo.isComplete;
                    
                    if (isComplete) {
                        // Р”Р›РЇ Р—РђР’Р•Р РЁР•РќРРҐ РЎР•Р—РћРќР†Р’: "S1 вњ“" (Р·РµР»РµРЅР° РјС–С‚РєР°)
                        content = `S${progressInfo.seasonNumber} вњ“`;
                    } else {
                        // Р”Р›РЇ РќР•Р—РђР’Р•Р РЁР•РќРРҐ РЎР•Р—РћРќР†Р’: "S1 5/10" (Р¶РѕРІС‚Р° РјС–С‚РєР° Р· РїСЂРѕРіСЂРµСЃРѕРј)
                        content = `S${progressInfo.seasonNumber} ${progressInfo.airedEpisodes}/${progressInfo.totalEpisodes}`;
                    }
                    
                    // РћРЅРѕРІР»СЋС”РјРѕ РјС–С‚РєСѓ Р· РїСЂР°РІРёР»СЊРЅРёРј РєР»Р°СЃРѕРј С‚Р° РІРјС–СЃС‚РѕРј
                    badge.className = isComplete ? 'card--season-complete' : 'card--season-progress';
                    badge.innerHTML = `<div>${content}</div>`;
                    
                    // Р’РРљР›РРљ 2: Р’РёСЂС–РІРЅСЋРІР°РЅРЅСЏ РїС–СЃР»СЏ РѕРЅРѕРІР»РµРЅРЅСЏ РІРјС–СЃС‚Сѓ РјС–С‚РєРё
                    adjustBadgePosition(cardEl, badge);

                    // Р—Р°С‚СЂРёРјРєР° РґР»СЏ РїР»Р°РІРЅРѕРіРѕ РїРѕРєР°Р·Сѓ РјС–С‚РєРё
                    setTimeout(() => {
                        // Р”РѕРґР°С”РјРѕ РєР»Р°СЃ РґР»СЏ РїР»Р°РІРЅРѕРіРѕ РїРѕРєР°Р·Сѓ
                        badge.classList.add('show');
                        
                        // Р’РРљР›РРљ 3: Р¤С–РЅР°Р»СЊРЅРµ РІРёСЂС–РІРЅСЋРІР°РЅРЅСЏ РїС–СЃР»СЏ РїРѕРєР°Р·Сѓ
                        adjustBadgePosition(cardEl, badge);
                    }, 50);

                    // РџРѕР·РЅР°С‡РµРЅРЅСЏ РєР°СЂС‚РєРё СЏРє РѕР±СЂРѕР±Р»РµРЅРѕС— (СЃС‚Р°С‚СѓСЃ: Р·Р°РІРµСЂС€РµРЅРѕ Р°Р±Рѕ РІ РїСЂРѕС†РµСЃС–)
                    cardEl.setAttribute('data-season-processed', isComplete ? 'complete' : 'in-progress');
                } else {
                    // РЇРєС‰Рѕ РЅРµ РІРґР°Р»РѕСЃСЏ РѕС‚СЂРёРјР°С‚Рё С–РЅС„РѕСЂРјР°С†С–СЋ РїСЂРѕ СЃРµР·РѕРЅ - РІРёРґР°Р»СЏС”РјРѕ РјС–С‚РєСѓ
                    badge.remove();
                    cardEl.setAttribute('data-season-processed', 'error');
                }
            })
            .catch(function(error) {
                // РћР±СЂРѕР±РєР° РїРѕРјРёР»РѕРє Р·Р°РІР°РЅС‚Р°Р¶РµРЅРЅСЏ РґР°РЅРёС…
                console.log('SeasonBadgePlugin РїРѕРјРёР»РєР°:', error.message);
                badge.remove();
                cardEl.setAttribute('data-season-processed', 'error');
            });
    }

    // === РЎРРЎРўР•РњРђ РЎРџРћРЎРўР•Р Р•Р–Р•РќРќРЇ Р—Рђ РќРћР’РРњР РљРђР РўРљРђРњР ===
    // РЎС‚РІРѕСЂСЋС”РјРѕ СЃРїРѕСЃС‚РµСЂС–РіР°С‡ Р·Р° Р·РјС–РЅР°РјРё РІ DOM
    var observer = new MutationObserver(function(mutations) {
        // РџРµСЂРµР±РёСЂР°С”РјРѕ РІСЃС– Р·РЅР°Р№РґРµРЅС– Р·РјС–РЅРё
        mutations.forEach(function(mutation) {
            // РџРµСЂРµР±РёСЂР°С”РјРѕ РІСЃС– РґРѕРґР°РЅС– РІСѓР·Р»Рё
            mutation.addedNodes?.forEach(function(node) {
                // РџРµСЂРµРІС–СЂРєР°, С‰Рѕ С†Рµ HTML-РµР»РµРјРµРЅС‚ (РЅРµ С‚РµРєСЃС‚РѕРІРёР№ РІСѓР·РѕР»)
                if (node.nodeType !== 1) return;

                // РЇРєС‰Рѕ РґРѕРґР°РЅРёР№ РµР»РµРјРµРЅС‚ С” РєР°СЂС‚РєРѕСЋ - РѕР±СЂРѕР±Р»СЏС”РјРѕ Р№РѕРіРѕ
                if (node.classList && node.classList.contains('card')) {
                    addSeasonBadge(node);
                }

                // РЇРєС‰Рѕ РґРѕРґР°РЅРёР№ РєРѕРЅС‚РµР№РЅРµСЂ РјС–СЃС‚РёС‚СЊ РєР°СЂС‚РєРё - РѕР±СЂРѕР±Р»СЏС”РјРѕ РІСЃС– РІРЅСѓС‚СЂС–С€РЅС– РєР°СЂС‚РєРё
                if (node.querySelectorAll) {
                    node.querySelectorAll('.card').forEach(addSeasonBadge);
                }
            });
        });
    });

    // === РћР‘Р РћР‘РќРРљ Р—РњР†РќР Р РћР—РњР†Р РЈ Р’Р†РљРќРђ ===
    // Р”РѕРґР°С”РјРѕ РѕР±СЂРѕР±РЅРёРє РїРѕРґС–С— Р·РјС–РЅРё СЂРѕР·РјС–СЂСѓ РІС–РєРЅР°
    window.addEventListener('resize', function() {
        // РћРЅРѕРІР»СЋС”РјРѕ РїРѕР·РёС†С–С— РІСЃС–С… РјС–С‚РѕРє РїСЂРё Р·РјС–РЅС– СЂРѕР·РјС–СЂСѓ РІС–РєРЅР°
        var allBadges = document.querySelectorAll('.card--season-complete, .card--season-progress');
        allBadges.forEach(function(badge) {
            var cardEl = badge.closest('.card');
            if (cardEl) {
                adjustBadgePosition(cardEl, badge);
            }
        });
    });

    /**
     * РћСЃРЅРѕРІРЅР° С„СѓРЅРєС†С–СЏ С–РЅС–С†С–Р°Р»С–Р·Р°С†С–С— РїР»Р°РіС–РЅР°
     */
    function initPlugin() {
        // РџРµСЂРµРІС–СЂРєР° Р°РєС‚РёРІРЅРѕСЃС‚С– РїР»Р°РіС–РЅР°
        if (!CONFIG.enabled) return;

        // РЎРїРёСЃРѕРє РєРѕРЅС‚РµР№РЅРµСЂС–РІ, РґРµ РјРѕР¶СѓС‚СЊ Р·РЅР°С…РѕРґРёС‚РёСЃСЊ РєР°СЂС‚РєРё
        var containers = document.querySelectorAll('.cards, .card-list, .content, .main, .cards-list, .preview__list');

        if (containers.length > 0) {
            // РџС–РґРєР»СЋС‡РµРЅРЅСЏ СЃРїРѕСЃС‚РµСЂС–РіР°С‡Р° РґРѕ РєРѕР¶РЅРѕРіРѕ Р·РЅР°Р№РґРµРЅРѕРіРѕ РєРѕРЅС‚РµР№РЅРµСЂР°
            containers.forEach(container => {
                try {
                    observer.observe(container, {
                        childList: true,    // РЎРїРѕСЃС‚РµСЂРµР¶РµРЅРЅСЏ Р·Р° РґРѕРґР°РІР°РЅРЅСЏРј/РІРёРґР°Р»РµРЅРЅСЏРј РґС–С‚РµР№
                        subtree: true      // РЎРїРѕСЃС‚РµСЂРµР¶РµРЅРЅСЏ Р·Р° РІСЃС–РјР° РЅР°С‰Р°РґРєР°РјРё
                    });
                } catch (e) {
                    console.log('РџРѕРјРёР»РєР° СЃРїРѕСЃС‚РµСЂРµР¶РµРЅРЅСЏ Р·Р° РєРѕРЅС‚РµР№РЅРµСЂРѕРј:', e);
                }
            });
        } else {
            // РЇРєС‰Рѕ РєРѕРЅС‚РµР№РЅРµСЂРё РЅРµ Р·РЅР°Р№РґРµРЅС– - СЃРїРѕСЃС‚РµСЂС–РіР°С”РјРѕ Р·Р° РІСЃС–Рј РґРѕРєСѓРјРµРЅС‚РѕРј
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        // РћР±СЂРѕР±РєР° РІР¶Рµ С–СЃРЅСѓСЋС‡РёС… РєР°СЂС‚РѕРє РЅР° СЃС‚РѕСЂС–РЅС†С–
        document.querySelectorAll('.card:not([data-season-processed])').forEach((card, index) => {
            // Р—Р°С‚СЂРёРјРєР° РґР»СЏ СѓРЅРёРєРЅРµРЅРЅСЏ РѕРґРЅРѕС‡Р°СЃРЅРѕРіРѕ Р·Р°РІР°РЅС‚Р°Р¶РµРЅРЅСЏ РІРµР»РёРєРѕС— РєС–Р»СЊРєРѕСЃС‚С– РєР°СЂС‚РѕРє
            setTimeout(() => addSeasonBadge(card), index * 300);
        });
    }

    // === РЎРРЎРўР•РњРђ Р—РђРџРЈРЎРљРЈ РџР›РђР“Р†РќРђ ===

    // Р’РђР Р†РђРќРў 1: РЇРєС‰Рѕ РґРѕРґР°С‚РѕРє РІР¶Рµ РіРѕС‚РѕРІРёР№ (СЃС‚Р°РЅРґР°СЂС‚РЅРёР№ РІРёРїР°РґРѕРє)
    if (window.appready) {
        initPlugin();
    } 
    // Р’РђР Р†РђРќРў 2: Р”Р»СЏ Lampa Framework (С‡РµРєР°С”РјРѕ РїРѕРґС–СЋ РіРѕС‚РѕРІРЅРѕСЃС‚С–)
    else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'ready') initPlugin();
        });
    } 
    // Р’РђР Р†РђРќРў 3: Р РµР·РµСЂРІРЅРёР№ РІР°СЂС–Р°РЅС‚ (Р·Р°РїСѓСЃРє С‡РµСЂРµР· 2 СЃРµРєСѓРЅРґРё)
    else {
        setTimeout(initPlugin, 2000);
    }

})();
