(function () {
    'use strict';

    // --- Захист від повторного запуску плагіна ---
    // Перевіряємо, чи плагін вже був ініціалізований
    if (window.SeasonBadgePlugin && window.SeasonBadgePlugin.__initialized) return;
    
    // Ініціалізуємо глобальний об'єкт плагіна
    window.SeasonBadgePlugin = window.SeasonBadgePlugin || {};
    window.SeasonBadgePlugin.__initialized = true;

    // === НАЛАШТУВАННЯ ПЛАГІНА ===
    var CONFIG = {
        tmdbApiKey: '1ad1fd4b4938e876aa6c96d0cded9395',   // API ключ для доступу до TMDB
        cacheTime: 12 * 60 * 60 * 1000,                   // Час зберігання кешу (12 години)
        enabled: true,                                    // Активувати/деактивувати плагін
        language: 'uk'                                    // Мова для запитів до TMDB
    };

    // === СТИЛІ ДЛЯ МІТОК СЕЗОНУ ===
    var style = document.createElement('style');
    style.textContent = `
    /* Стиль для ЗАВЕРШЕНИХ сезонів (зелена мітка) */
    .card--season-complete {
        position: absolute;
        left: 0;
        margin-left: -0.65em; //ВІДСТУП за лівий край 
        bottom: 0.50em;
        background-color: rgba(61, 161, 141, 0.9);  /* Зелений колір, стандартна прозорість фону 0.8 (1 - фон не прозорий) */
        z-index: 12;
        width: fit-content;
        max-width: calc(100% - 1em);
        border-radius: 0.3em 0.3em 0.3em 0.3em;
        overflow: hidden;
        opacity: 0;
        transition: opacity 0.22s ease-in-out;
    }
    
    /* Стиль для НЕЗАВЕРШЕНИХ сезонів (жовта мітка з прогресом) */
    .card--season-progress {
        position: absolute;
        left: 0;
        margin-left: -0.65em; //ВІДСТУП за лівий край 
        bottom: 0.50em;
        background-color: rgba(255, 66, 66, 1);   /* Жовтий колір, rgba(255, 193, 7, 0.9) стандартна прозорість фону 0.8 (1 - фон не прозорий)  //колір як в стандартної мітки TV -> rgba(255, 66, 66, 1)*/
        z-index: 12;
        width: fit-content;
        max-width: calc(100% - 1em);
        border-radius: 0.3em 0.3em 0.3em 0.3em;
        overflow: hidden;
        opacity: 0;
        transition: opacity 0.22s ease-in-out;
    }
    
    /* Загальні стилі для тексту в мітках - ОДИНАКОВІ ДЛЯ ОБОХ ТИПІВ */
    .card--season-complete div,
    .card--season-progress div {
        text-transform: uppercase;
        font-family: 'Roboto Condensed', 'Arial Narrow', Arial, sans-serif;  
        font-weight: 700;                                                    /* жирний шрифт */
        font-size: 1.0 em;                                                   /* розмір */
        padding: 0.39em 0.39em;                                              /* відступ */
        white-space: nowrap;                                                 /* перенос */
        display: flex;                                                       /* flex */
        align-items: center;                                                 /* вирівнювання */
        gap: 4px;                                                            /* проміжок */
        text-shadow: 0.5px 0.5px 1px rgba(0,0,0,0.3);
    }
    
    /* Колір тексту для завершених сезонів (білий на зеленому) */
    .card--season-complete div {
        color: #ffffff;  /* Білий текст для кращої видимості на зеленому фоні */
    }
    
    /* Колір тексту для незавершених сезонів (білий) */
    .card--season-progress div {
        color: #ffffff;  /*  Або чорний  color: #000000 текст для кращої видимості на фоні */
    }
    
    /* Клас для плавного показу мітки */
    .card--season-complete.show,
    .card--season-progress.show {
        opacity: 1;  /* Повна видимість при показі */
    }
    
    /* Адаптація для мобільних пристроїв */
    @media (max-width: 768px) {
        .card--season-complete div,
        .card--season-progress div {
            font-size: 0.95em;  /* Трохи менший розмір шрифту на мобільних */
            padding: 0.35em 0.40em; /* додано МЕНШІ ВІДСТУПИ НА МОБІЛЬНИХ */
        }
    }
    `;
    // Додаємо стилі до головної частини документа
    document.head.appendChild(style);

    // === ДОПОМІЖНІ ФУНКЦІЇ ===

    /**
     * Визначає тип медіа на основі даних картки
     * @param {Object} cardData - дані картки
     * @returns {string} - тип медіа ('tv', 'movie', 'unknown')
     */
    function getMediaType(cardData) {
        // Якщо дані відсутні - повертаємо 'unknown'
        if (!cardData) return 'unknown';
        
        // Перевірка на серіал (наявність назви або дати першого ефіру)
        if (cardData.name || cardData.first_air_date) return 'tv';
        
        // Перевірка на фільм (наявність назви або дати релізу)
        if (cardData.title || cardData.release_date) return 'movie';
        
        // Якщо тип не визначено
        return 'unknown';
    }

    // Ініціалізація кешу з localStorage
    // Використовуємо localStorage для зберігання кешованих даних
    var cache = JSON.parse(localStorage.getItem('seasonBadgeCache') || '{}');

    /**
     * Завантажує дані серіалу з TMDB API з використанням кешу
     * @param {number} tmdbId - ID серіалу в базі TMDB
     * @returns {Promise} - проміс з даними серіалу
     */
    function fetchSeriesData(tmdbId) {
        return new Promise(function(resolve, reject) {
            // Перевірка кешу: якщо дані є і не прострочені - використовуємо їх
            if (cache[tmdbId] && (Date.now() - cache[tmdbId].timestamp < CONFIG.cacheTime)) {
                return resolve(cache[tmdbId].data);
            }

            // Перевірка коректності API ключа
            if (!CONFIG.tmdbApiKey || CONFIG.tmdbApiKey === 'ваш_tmdb_api_key_тут') {
                return reject(new Error('Будь ласка, вставте коректний TMDB API ключ'));
            }

            // Формування URL для запиту до TMDB API
            var url = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${CONFIG.tmdbApiKey}&language=${CONFIG.language}`;
            
            // Виконання HTTP запиту до TMDB API
            fetch(url)
                .then(response => response.json())  // Перетворюємо відповідь в JSON
                .then(function(data) {
                    // Перевірка на помилку від API
                    if (data.success === false) throw new Error(data.status_message);

                    // Збереження даних в кеш з поточною міткою часу
                    cache[tmdbId] = { 
                        data: data, 
                        timestamp: Date.now() 
                    };
                    // Зберігаємо оновлений кеш в localStorage
                    localStorage.setItem('seasonBadgeCache', JSON.stringify(cache));

                    // Повертаємо отримані дані
                    resolve(data);
                })
                .catch(reject);  // Передаємо помилку далі
        });
    }

    /**
     * Перевіряє стан сезону та повертає інформацію про прогрес
     * @param {Object} tmdbData - дані серіалу з TMDB
     * @returns {Object|boolean} - інформація про прогрес або false
     */
    function getSeasonProgress(tmdbData) {
        // Перевірка наявності необхідних даних
        if (!tmdbData || !tmdbData.seasons || !tmdbData.last_episode_to_air) return false;
        
        // Останній випущений епізод
        var lastEpisode = tmdbData.last_episode_to_air;
        
        // Пошук поточного сезону (сезони з номером > 0, щоб виключити спеціальні сезони)
        var currentSeason = tmdbData.seasons.find(s => 
            s.season_number === lastEpisode.season_number && s.season_number > 0
        );
        
        // Якщо сезон не знайдено
        if (!currentSeason) return false;
        
        // Загальна кількість епізодів в сезоні
        var totalEpisodes = currentSeason.episode_count || 0;
        
        // Кількість випущених епізодів
        var airedEpisodes = lastEpisode.episode_number || 0;
        
        // Повертаємо об'єкт з детальною інформацією про прогрес
        return {
            seasonNumber: lastEpisode.season_number,  // Номер поточного сезону
            airedEpisodes: airedEpisodes,             // Кількість випущених епізодів
            totalEpisodes: totalEpisodes,             // Загальна кількість епізодів
            isComplete: airedEpisodes >= totalEpisodes  // Чи завершений сезон
        };
    }

    /**
     * Створює DOM-елемент мітки сезону
     * @param {string} content - текстовий вміст мітки
     * @param {boolean} isComplete - чи є сезон завершеним
     * @param {boolean} loading - чи є це тимчасовою міткою завантаження
     * @returns {HTMLElement} - створений елемент мітки
     */
    function createBadge(content, isComplete, loading) {
        // Створюємо новий div елемент для мітки
        var badge = document.createElement('div');
        
        // Вибираємо CSS клас в залежності від стану сезону
        var badgeClass = isComplete ? 'card--season-complete' : 'card--season-progress';
        
        // Встановлюємо клас елемента (додаємо 'loading' якщо це тимчасова мітка)
        badge.className = badgeClass + (loading ? ' loading' : '');
        
        // Встановлюємо HTML вміст мітки
        badge.innerHTML = `<div>${content}</div>`;
        
        // Повертаємо створений елемент
        return badge;
    }

    /**
     * Вирівнює мітку сезону відносно мітки якості
     * @param {HTMLElement} cardEl - елемент картки
     * @param {HTMLElement} badge - елемент мітки сезону
     */
    function adjustBadgePosition(cardEl, badge) {
        // Знаходимо мітку якості відео в картці
        let quality = cardEl.querySelector('.card__quality');
        
        if (quality && badge) {
            // ВИПАДОК 1: Є мітка якості - розміщуємо мітку сезону вище неї
            
            // Отримуємо фактичну висоту мітки якості
            let qHeight = quality.offsetHeight; 
            
            // Отримуємо значення нижнього відступу мітки якості з CSS
            let qBottom = parseFloat(getComputedStyle(quality).bottom) || 0; 
            
            // Встановлюємо позицію мітки сезону (вище мітки якості)
            badge.style.bottom = (qHeight + qBottom) + 'px';
        } else if (badge) {
            // ВИПАДОК 2: Мітки якості немає - розміщуємо мітку сезону в стандартному положенні
            badge.style.bottom = '0.50em'; // Стандартний нижній відступ
        }
    }

    // === ДОДАТКОВІ ФУНКЦІЇ ДЛЯ РОБОТИ З МІТКАМИ ЯКОСТІ ===
    
    /**
     * Оновлює позиції всіх міток сезону при змінах в картці
     * Використовується при додаванні/видаленні міток якості
     * @param {HTMLElement} cardEl - елемент картки
     */
    function updateBadgePositions(cardEl) {
        // Знаходимо всі мітки сезону в картці (обох типів)
        var badges = cardEl.querySelectorAll('.card--season-complete, .card--season-progress');
        
        // Для кожної знайденої мітки оновлюємо позицію
        badges.forEach(function(badge) {
            adjustBadgePosition(cardEl, badge);
        });
    }

    // === СПОСТЕРЕЖЕННЯ ЗА ЗМІНАМИ МІТОК ЯКОСТІ ===
    // Створюємо спостерігач для відстеження додавання/видалення міток якості
    var qualityObserver = new MutationObserver(function(mutations) {
        // Перебираємо всі знайдені зміни
        mutations.forEach(function(mutation) {
            
            // Перевіряємо додані вузли (нові мітки якості)
            mutation.addedNodes?.forEach(function(node) {
                // Перевіряємо, чи додано мітку якості
                if (node.classList && node.classList.contains('card__quality')) {
                    // Знаходимо батьківську картку для цієї мітки якості
                    var cardEl = node.closest('.card');
                    if (cardEl) {
                        // Оновлюємо позицію мітки сезону при додаванні мітки якості
                        // Використовуємо затримку для гарантії що DOM оновився
                        setTimeout(() => {
                            updateBadgePositions(cardEl);
                        }, 100);
                    }
                }
            });
            
            // Перевіряємо видалені вузли (видалені мітки якості)
            mutation.removedNodes?.forEach(function(node) {
                if (node.classList && node.classList.contains('card__quality')) {
                    // Знаходимо батьківську картку для видаленої мітки якості
                    var cardEl = node.closest('.card');
                    if (cardEl) {
                        // Оновлюємо позицію мітки сезону при видаленні мітки якості
                        setTimeout(() => {
                            updateBadgePositions(cardEl);
                        }, 100);
                    }
                }
            });
        });
    });

    /**
     * Додає мітку статусу сезону до картки серіалу
     * @param {HTMLElement} cardEl - елемент картки
     */
    function addSeasonBadge(cardEl) {
        // Перевірка: чи картка вже оброблена або відсутня
        if (!cardEl || cardEl.hasAttribute('data-season-processed')) return;

        // Перевірка: чи готові дані картки (якщо ні - відкладаємо обробку)
        if (!cardEl.card_data) {
            // Викликаємо функцію знову через requestAnimationFrame
            requestAnimationFrame(() => addSeasonBadge(cardEl));
            return;
        }

        // Отримуємо дані картки
        var data = cardEl.card_data;

        // Перевірка: чи є це серіал (тільки для серіалів показуємо мітку)
        if (getMediaType(data) !== 'tv') return;

        // Знаходження контейнера для міток (елемент .card__view)
        var view = cardEl.querySelector('.card__view');
        if (!view) return;

        // Видалення попередніх міток обох типів (якщо вони існують)
        var oldBadges = view.querySelectorAll('.card--season-complete, .card--season-progress');
        oldBadges.forEach(function(badge) {
            badge.remove();
        });

        // Створення тимчасової мітки завантаження (по дефолту - для незавершених сезонів)
        var badge = createBadge('...', false, true);
        
        // Додавання мітки до DOM
        view.appendChild(badge);
        
        // ВИКЛИК 1: Перше вирівнювання одразу після додавання в DOM
        adjustBadgePosition(cardEl, badge);

        // === СПОСТЕРЕЖЕННЯ ЗА МІТКОЮ ЯКОСТІ В ЦІЙ КАРТЦІ ===
        // Підключаємо спостерігач для відстеження змін міток якості
        try {
            qualityObserver.observe(view, {
                childList: true,    // Спостереження за додаванням/видаленням дочірніх елементів
                subtree: true       // Спостереження за всіма вкладеними елементами
            });
        } catch (e) {
            // Обробка можливих помилок при спостереженні
            console.log('Помилка спостереження за мітками якості:', e);
        }

        // Позначення картки як обробленої (статус: завантаження)
        cardEl.setAttribute('data-season-processed', 'loading');

        // Завантаження даних серіалу з TMDB
        fetchSeriesData(data.id)
            .then(function(tmdbData) {
                // Отримуємо інформацію про прогрес сезону
                var progressInfo = getSeasonProgress(tmdbData);
                
                // Перевіряємо, чи вдалося отримати інформацію
                if (progressInfo) {
                    var content = '';
                    var isComplete = progressInfo.isComplete;
                    
                    if (isComplete) {
                        // ДЛЯ ЗАВЕРШЕНИХ СЕЗОНІВ: "S1 ✓" (зелена мітка)
                        content = `S${progressInfo.seasonNumber}`;
                    } else {
                        // ДЛЯ НЕЗАВЕРШЕНИХ СЕЗОНІВ: "S1 5/10" (жовта мітка з прогресом)
                        content = `S${progressInfo.seasonNumber} ${progressInfo.airedEpisodes}/${progressInfo.totalEpisodes}`;
                    }
                    
                    // Оновлюємо мітку з правильним класом та вмістом
                    badge.className = isComplete ? 'card--season-complete' : 'card--season-progress';
                    badge.innerHTML = `<div>${content}</div>`;
                    
                    // ВИКЛИК 2: Вирівнювання після оновлення вмісту мітки
                    adjustBadgePosition(cardEl, badge);

                    // Затримка для плавного показу мітки
                    setTimeout(() => {
                        // Додаємо клас для плавного показу
                        badge.classList.add('show');
                        
                        // ВИКЛИК 3: Фінальне вирівнювання після показу
                        adjustBadgePosition(cardEl, badge);
                    }, 50);

                    // Позначення картки як обробленої (статус: завершено або в процесі)
                    cardEl.setAttribute('data-season-processed', isComplete ? 'complete' : 'in-progress');
                } else {
                    // Якщо не вдалося отримати інформацію про сезон - видаляємо мітку
                    badge.remove();
                    cardEl.setAttribute('data-season-processed', 'error');
                }
            })
            .catch(function(error) {
                // Обробка помилок завантаження даних
                console.log('SeasonBadgePlugin помилка:', error.message);
                badge.remove();
                cardEl.setAttribute('data-season-processed', 'error');
            });
    }

    // === СИСТЕМА СПОСТЕРЕЖЕННЯ ЗА НОВИМИ КАРТКАМИ ===
    // Створюємо спостерігач за змінами в DOM
    var observer = new MutationObserver(function(mutations) {
        // Перебираємо всі знайдені зміни
        mutations.forEach(function(mutation) {
            // Перебираємо всі додані вузли
            mutation.addedNodes?.forEach(function(node) {
                // Перевірка, що це HTML-елемент (не текстовий вузол)
                if (node.nodeType !== 1) return;

                // Якщо доданий елемент є карткою - обробляємо його
                if (node.classList && node.classList.contains('card')) {
                    addSeasonBadge(node);
                }

                // Якщо доданий контейнер містить картки - обробляємо всі внутрішні картки
                if (node.querySelectorAll) {
                    node.querySelectorAll('.card').forEach(addSeasonBadge);
                }
            });
        });
    });

    // === ОБРОБНИК ЗМІНИ РОЗМІРУ ВІКНА ===
    // Додаємо обробник події зміни розміру вікна
    window.addEventListener('resize', function() {
        // Оновлюємо позиції всіх міток при зміні розміру вікна
        var allBadges = document.querySelectorAll('.card--season-complete, .card--season-progress');
        allBadges.forEach(function(badge) {
            var cardEl = badge.closest('.card');
            if (cardEl) {
                adjustBadgePosition(cardEl, badge);
            }
        });
    });

    /**
     * Основна функція ініціалізації плагіна
     */
    function initPlugin() {
        // Перевірка активності плагіна
        if (!CONFIG.enabled) return;

        // Список контейнерів, де можуть знаходитись картки
        var containers = document.querySelectorAll('.cards, .card-list, .content, .main, .cards-list, .preview__list');

        if (containers.length > 0) {
            // Підключення спостерігача до кожного знайденого контейнера
            containers.forEach(container => {
                try {
                    observer.observe(container, {
                        childList: true,    // Спостереження за додаванням/видаленням дітей
                        subtree: true      // Спостереження за всіма нащадками
                    });
                } catch (e) {
                    console.log('Помилка спостереження за контейнером:', e);
                }
            });
        } else {
            // Якщо контейнери не знайдені - спостерігаємо за всім документом
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        // Обробка вже існуючих карток на сторінці
        document.querySelectorAll('.card:not([data-season-processed])').forEach((card, index) => {
            // Затримка для уникнення одночасного завантаження великої кількості карток
            setTimeout(() => addSeasonBadge(card), index * 300);
        });
    }

    // === СИСТЕМА ЗАПУСКУ ПЛАГІНА ===

    // ВАРІАНТ 1: Якщо додаток вже готовий (стандартний випадок)
    if (window.appready) {
        initPlugin();
    } 
    // ВАРІАНТ 2: Для Lampa Framework (чекаємо подію готовності)
    else if (window.Lampa && Lampa.Listener) {
        Lampa.Listener.follow('app', function(e) {
            if (e.type === 'ready') initPlugin();
        });
    } 
    // ВАРІАНТ 3: Резервний варіант (запуск через 2 секунди)
    else {
        setTimeout(initPlugin, 2000);
    }

})();