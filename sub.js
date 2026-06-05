(function () {  
  const DEBUG = false;  
    
  function log(...args) {  
    if (DEBUG) console.log('[Wyzie Subs]', ...args);  
  }  
    
  const cache = {};  
  const API_KEY = "wyzie-9cy5uc876vzjt3cc9qh7kostpsanyn3w";  
    
  async function fetchSubs(tmdbId, season, episode, languages = ['en', 'ru']) {  
    log('fetchSubs called:', { tmdbId, season, episode, languages });  
    const key = `${tmdbId}_${season || 0}_${episode || 0}_${languages.join(',')}`;  
    if (cache[key]) {  
      log('Returning cached subtitles for key:', key);  
      return cache[key];  
    }  
      
    const allSubs = [];  
      
    for (const lang of languages) {  
      try {  
        const url = season && episode   
          ? `https://sub.wyzie.io/search?id=${tmdbId}&season=${season}&episode=${episode}&language=${lang}&key=${API_KEY}`  
          : `https://sub.wyzie.io/search?id=${tmdbId}&language=${lang}&key=${API_KEY}`;  
          
        log('Fetching URL:', url);  
        const r = await fetch(url);  
        const j = await r.json();  
        log('API response for', lang, ':', j);  
          
        const subs = Array.isArray(j) ? j : [];  
        log('Subtitles found for', lang, ':', subs.length);  
        allSubs.push(...subs);  
      } catch (e) {  
        log('Error fetching subtitles for', lang, ':', e);  
      }  
    }  
      
    return (cache[key] = allSubs);  
  }  
    
  async function setupSubs() {  
    log('setupSubs called');  
    const activity = Lampa.Activity.active?.(),  
      playdata = Lampa.Player.playdata?.(),  
      movie = activity?.movie;  
      
    log('Activity:', activity);  
    log('Playdata:', playdata);  
    log('Movie:', movie);  
      
    if (!activity || !playdata || !movie) {  
      log('Missing required data, aborting');  
      return;  
    }  
      
    const tmdbId = movie.id || movie.tmdb_id,  
      isSeries = !!movie.first_air_date,  
      season = isSeries ? playdata.season : undefined,  
      episode = isSeries ? playdata.episode : undefined;  
      
    log('Media info:', { tmdbId, isSeries, season, episode });  
      
    if (!tmdbId) {  
      log('No TMDB ID found, aborting');  
      return;  
    }  
      
    const osSubs = await fetchSubs(tmdbId, season, episode, ['en', 'ru']);  
    log('Wyzie Subtitles received:', osSubs);  
      
    const filtered = osSubs  
      .filter((s) => s.url && (s.language === 'en' || s.language === 'ru'))  
      .map((s) => ({  
        label: s.display || s.language,  
        url: s.url,  
        lang: s.language,  
      }));  
      
    log('Filtered subtitles:', filtered);  
      
    const current = (playdata.subtitles || []).map((s) => ({  
      label: s.label,  
      url: s.url,  
      lang: s.lang || "",  
    }));  
      
    log('Current subtitles:', current);  
      
    const all = [...current];  
    filtered.forEach((s) => {  
      if (!all.find((x) => x.url === s.url)) all.push(s);  
    });  
      
    log('All subtitles combined:', all);  
      
    if (!all.length) {  
      log('No subtitles available, aborting');  
      return;  
    }  
      
    const idx = all.findIndex((s) => s.lang === 'en');  
    log('Setting subtitles, index:', idx === -1 ? 0 : idx);  
      
    try {  
      Lampa.Player.subtitles(all, idx === -1 ? 0 : idx);  
      log('Subtitles set successfully');  
    } catch (e) {  
      log('Error setting subtitles:', e);  
    }  
  }  
  
  // Добавляем кнопку смещения субтитров в панель плеера  
  function addSubShiftButton() {  
    Lampa.PlayerPanel.listener.follow('render', () => {  
      const panel = $('.player-panel')  
        
      if (panel.find('.player-panel__subshift').length) return  
        
      const button = $(`  
        <div class="player-panel__subshift button selector">  
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">  
            <path d="M12 2L12 22M12 2L6 8M12 2L18 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>  
            <path d="M12 22L6 16M12 22L18 16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>  
          </svg>  
        </div>  
      `)  
        
      panel.find('.player-panel__center').append(button)  
        
      button.on('hover:enter', () => {  
        const shiftOptions = [-25,-24,-23,-22,-21,-20,-19,-18,-17,-16,-15,-14,-13,-12,-11,-10, -9,-8,-7,-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,14,15,16,17,18,19,20,21,22,23,24,25]  
          
        const items = shiftOptions.map(i => ({  
          title: (i > 0 ? '+' : '') + i + ' сек.',  
          value: i,  
          selected: Lampa.Storage.get('player_subs_shift_time', '0') == i  
        }))  
  
        Lampa.Select.show({  
          title: 'Смещение субтитров',  
          items: items,  
          onSelect: (b) => {  
            Lampa.Storage.set('player_subs_shift_time', b.value)  
            Lampa.PlayerVideo.applySubsSettings()  
            Lampa.Noty.show('Смещение: ' + b.value + ' сек.')  
          }  
        })  
      })  
    })  
  }  
  
  log('Plugin initialized, setting up listener');  
  try {  
    if (window.appready) {  
      addSubShiftButton()  
    } else {  
      Lampa.Listener.follow('app', function (e) {  
        if (e.type == 'ready') addSubShiftButton()  
      })  
    }  
  
    Lampa.Player.listener.follow("start", () => {  
      log('Player start event fired');  
      setTimeout(setupSubs, 500);  
    });  
    log('Listener attached successfully');  
  } catch (e) {  
    log('Error attaching listener:', e);  
  }  
})();
