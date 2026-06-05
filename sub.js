(function () {  
  //BDVBuriлk.github.io  
  //Wyzie Subtitles plugin for Lampa  
  //2026  
  const DEBUG = true; // Переменная дебаг - установите в false для отключения логов  
  const API_KEY = "wyzie-9cy5uc876vzjt3cc9qh7kostpsanyn3w";  
    
  function log(...args) {  
    if (DEBUG) console.log('[Wyzie Subs]', ...args);  
  }  
    
  const cache = {};  
      
  async function fetchSubs(tmdbId, season, episode) {  
    log('fetchSubs called:', { tmdbId, season, episode });  
    const key = `${tmdbId}_${season || 0}_${episode || 0}`;  
    if (cache[key]) {  
      log('Returning cached subtitles for key:', key);  
      return cache[key];  
    }  
    try {  
      // Для сериалов добавляем season и episode в запрос  
      const url = season && episode   
        ? `https://sub.wyzie.io/search?id=${tmdbId}&season=${season}&episode=${episode}&language=en&key=${API_KEY}`  
        : `https://sub.wyzie.io/search?id=${tmdbId}&language=en&key=${API_KEY}`;  
        
      log('Fetching URL:', url);  
      const r = await fetch(url);  
      const j = await r.json();  
      log('API response:', j);  
        
      // Адаптируем под структуру ответа Wyzie API  
      const subs = j.subtitles || j || [];  
      log('Subtitles found:', Array.isArray(subs) ? subs.length : 1);  
      return (cache[key] = Array.isArray(subs) ? subs : [subs]);  
    } catch (e) {  
      log('Error fetching subtitles:', e);  
      return [];  
    }  
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
      
    // Используем tmdb_id вместо imdb_id  
    const tmdbId = movie.id || movie.tmdb_id,  
      isSeries = !!movie.first_air_date,  
      season = isSeries ? playdata.season : undefined,  
      episode = isSeries ? playdata.episode : undefined;  
      
    log('Media info:', { tmdbId, isSeries, season, episode });  
      
    if (!tmdbId) {  
      log('No TMDB ID found, aborting');  
      return;  
    }  
      
    const osSubs = await fetchSubs(tmdbId, season, episode);  
    log('Wyzie Subtitles received:', osSubs);  
      
    // Фильтруем и адаптируем под формат Lampa  
    const filtered = osSubs  
      .filter((s) => s.url)  
      .map((s) => ({  
        label: s.lang || s.language || 'en',  
        url: s.url,  
        lang: s.lang || s.language || 'en',  
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
    
  log('Plugin initialized, setting up listener');  
  try {  
    Lampa.Player.listener.follow("start", () => {  
      log('Player start event fired');  
      setTimeout(setupSubs, 500);  
    });  
    log('Listener attached successfully');  
  } catch (e) {  
    log('Error attaching listener:', e);  
  }  
})();
