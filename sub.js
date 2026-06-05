(function () {  
  //BDVBuriлk.github.io  
  //OST plugin for Lampa  
  //2026  
  const DEBUG = true; // Переменная дебаг - установите в false для отключения логов  
    
  function log(...args) {  
    if (DEBUG) console.log('[OST Plugin]', ...args);  
  }  
    
  const OSV3 = "https://opensubtitles-v3.strem.io/",  
    cache = {};  
      
  async function fetchSubs(imdb, season, episode) {  
    log('fetchSubs called:', { imdb, season, episode });  
    const key = `${imdb}_${season || 0}_${episode || 0}`;  
    if (cache[key]) {  
      log('Returning cached subtitles for key:', key);  
      return cache[key];  
    }  
    try {  
      const url =  
        season && episode  
          ? `${OSV3}subtitles/series/${imdb}:${season}:${episode}.json`  
          : `${OSV3}subtitles/movie/${imdb}.json`;  
      log('Fetching URL:', url);  
      const r = await fetch(url),  
        j = await r.json();  
      log('API response:', j);  
      const subs = j.subtitles || [];  
      log('Subtitles found:', subs.length);  
      return (cache[key] = subs);  
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
      
    const imdb = movie.imdb_id,  
      isSeries = !!movie.first_air_date,  
      season = isSeries ? playdata.season : undefined,  
      episode = isSeries ? playdata.episode : undefined;  
      
    log('Media info:', { imdb, isSeries, season, episode });  
      
    const osSubs = await fetchSubs(imdb, season, episode);  
    log('OS Subtitles received:', osSubs);  
      
    const filtered = osSubs  
      .filter((s) => (s.lang === "eng" || s.lang === "rus") && s.url)  
      .map((s) => ({  
        label: s.lang === "eng" ? "eng" : "rus",  
        url: s.url,  
        lang: s.lang,  
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
      
    const idx = all.findIndex((s) => s.lang === "eng");  
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
