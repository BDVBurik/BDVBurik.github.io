(function () {
    'use strict';

    if (window.SeasonSeriaPlugin && window.SeasonSeriaPlugin.__initialized) return;
    window.SeasonSeriaPlugin = window.SeasonSeriaPlugin || {};
    window.SeasonSeriaPlugin.__initialized = true;

    Lampa.Lang.add({
        season_seria_setting: {
            en: "Show series status (season/episode)",
            uk: "Відображення стану серіалу (сезон/серія)",
            ru: "Отображение статуса сериала (сезон/эпизод)"
        },
        season_seria_active: {
            en: "Season {season}\nEpisodes {current}/{total}",
            uk: "Сезон {season}\nЕпізодів {current}/{total}",
            ru: "Сезон {season}\nЭпизодов {current}/{total}"
        },
        season_seria_season_completed: {
            en: "Season {season} / Episodes {episodes}\nIn Production",
            uk: "Сезон {season} / Епізодів {episodes}\nЗнімається",
            ru: "Сезон {season} / Эпизодов {episodes}\nСнимается"
        },
        season_seria_series_ended: {
            en: "Seasons {seasons} / Episodes {episodes}\nEnded",
            uk: "Сезонів {seasons} / Епізодів {episodes}\nЗавершено",
            ru: "Сезонов {seasons} / Эпизодов {episodes}\nЗавершено"
        },
        season_seria_series_canceled: {
            en: "Seasons {seasons} / Episodes {episodes}\nCanceled",
            uk: "Сезонів {seasons} / Епізодів {episodes}\nСкасовано",
            ru: "Сезонов {seasons} / Эпизодов {episodes}\nОтменено"
        },
        season_seria_series_planned: {
            en: "Season {season}\nPlanned {date}",
            uk: "Сезон {season}\nЗаплановано {date}",
            ru: "Сезон {season}\nЗапланировано {date}"
        },
        season_seria_series_announced: {
            en: "Season {season}\nAnnounced",
            uk: "Сезон {season}\nАнонсовано",
            ru: "Сезон {season}\nАнонсировано"
        },
        season_seria_returning_series: {
            en: "Season {season}\nReturning Series",
            uk: "Сезон {season}\nПродовжується",
            ru: "Сезон {season}\nПродолжается"
        },
        season_seria_pilot: {
            en: "Pilot\nIn Production",
            uk: "Пілот\nЗнімається",
            ru: "Пилот\nСнимается"
        },
        season_seria_no_episodes: {
            en: "Season {season}\nEpisodes 0/{total}",
            uk: "Сезон {season}\nЕпізодів 0/{total}",
            ru: "Сезон {season}\nЭпизодов 0/{total}"
        },
        season_seria_unknown_status: {
            en: "Season {season}\nStatus unknown",
            uk: "Сезон {season}\nСтатус невідомий",
            ru: "Сезон {season}\nСтатус неизвестен"
        }
    });

    Lampa.SettingsApi.addParam({
        component: 'interface',
        param: {
            name: 'season_and_seria',
            type: 'trigger',
            default: true
        },
        field: {
            name: Lampa.Lang.translate('season_seria_setting')
        }
    });

    function isSeasonSeriaEnabled() {
        return Lampa.Storage.get('season_and_seria', true) === true;
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        var date = new Date(dateString);
        // Формат DD.MM.YY
        var day = date.getDate().toString().padStart(2, '0');
        var month = (date.getMonth() + 1).toString().padStart(2, '0');
        var year = date.getFullYear().toString().slice(-2);
        return day + '.' + month + '.' + year;
    }

    function initPlugin() {
        if (!isSeasonSeriaEnabled()) return;

var style = $('<style>' +
    '.full-start__poster, .full-start-new__poster { position: relative; width: 100%; }' +
    '.card--new_seria { position: absolute; top: 3%; right: 0; width: auto; max-width: 90%; font-size: 1.1em; padding: 0.25em 0.75em; border-radius: 0.75em 0 0 0.75em; z-index: 12; background: rgba(0,0,0,0.5); color: #fff; text-align: center; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; font-weight: 500; line-height: 1.3; backdrop-filter: blur(0.5em); }' +
    '.card--new_seria span { display: block; white-space: pre; }' +
    '.card--new_seria span:first-child { font-weight: 600; }' +
    '.card--new_seria span:last-child { font-size: 0.7em; opacity: 0.9; margin-top: 0.15em; }' +
    '@media (max-width: 768px) { .card--new_seria { top: 2.5em; } }' +
    '</style>');
$('head').append(style);
        
       /* var style = $('<style>' +
            '.full-start__poster, .full-start-new__poster { position: relative; width: 100%; }' +
            '.card--new_seria { position: absolute; top: 2.0em; right: 0; width: auto; max-width: 100%; font-size: 12px; padding: 4px 12px; border-radius: 12px 0 0 12px; z-index: 11; background: rgba(0,0,0,0.5); color: #fff; text-align: center; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; font-weight: 500; line-height: 1.3; backdrop-filter: blur(8px); }' +
            '.card--new_seria span { display: block; white-space: pre; }' +
            '.card--new_seria span:first-child { font-weight: 600; }' +
            '.card--new_seria span:last-child { font-size: 11px; opacity: 0.9; margin-top: 2px; }' +
            '</style>');
        $('head').append(style);*/

        Lampa.Listener.follow('full', function (event) {
            if (event.type !== 'complite' || Lampa.Activity.active().component !== 'full') return;

            var data = Lampa.Activity.active().card;
            if (!data || data.source !== 'tmdb' || !data.seasons || !isSeasonSeriaEnabled()) return;

            var activityRender = Lampa.Activity.active().activity.render();
            var cardContainer = $('.full-start__poster, .full-start-new__poster', activityRender);
            if ($('.card--new_seria', activityRender).length || !cardContainer.length) return;

            var status = data.status || '';
            var seasons = data.seasons || [];
            var lastEpisode = data.last_episode_to_air;
            var nextEpisode = data.next_episode_to_air;
            
            // Фільтруємо тільки реальні сезони (виключаємо спеціальні сезони з номером 0)
            var realSeasons = seasons.filter(function(season) {
                return season.season_number > 0;
            });

            // Сортуємо сезони по номеру
            realSeasons.sort(function(a, b) {
                return a.season_number - b.season_number;
            });

            // Підраховуємо загальну кількість епізодів
            var totalEpisodes = realSeasons.reduce(function(total, season) {
                return total + (season.episode_count || 0);
            }, 0);

            var labelText = '';

            // Для серіалів, які ще не почалися (немає епізодів)
            if (!lastEpisode && realSeasons.length > 0) {
                var firstSeason = realSeasons[0];
                var episodeCount = firstSeason.episode_count || 0;
                
                if (episodeCount > 0) {
                    // Відомо кількість серій - показуємо 0/8
                    labelText = Lampa.Lang.translate('season_seria_no_episodes')
                        .replace('{season}', 1)
                        .replace('{total}', episodeCount);
                } 
                else if (firstSeason.air_date) {
                    // Є дата виходу
                    var formattedDate = formatDate(firstSeason.air_date);
                    labelText = Lampa.Lang.translate('season_seria_series_planned')
                        .replace('{season}', 1)
                        .replace('{date}', formattedDate);
                } 
                else if (status === 'Planned' || status === 'In Production') {
                    // Заплановано або в процесі зйомок
                    labelText = Lampa.Lang.translate('season_seria_series_planned')
                        .replace('{season}', 1)
                        .replace('{date}', '');
                } 
                else {
                    // Просто анонсовано
                    labelText = Lampa.Lang.translate('season_seria_series_announced')
                        .replace('{season}', 1);
                }
            }
            // Для завершених серіалів
            else if (status === 'Ended') {
                labelText = Lampa.Lang.translate('season_seria_series_ended')
                    .replace('{seasons}', realSeasons.length)
                    .replace('{episodes}', totalEpisodes);
            } 
            // Для скасованих серіалів
            else if (status === 'Canceled') {
                labelText = Lampa.Lang.translate('season_seria_series_canceled')
                    .replace('{seasons}', realSeasons.length)
                    .replace('{episodes}', totalEpisodes);
            }
            // Для серіалів, які продовжуються
            else if (status === 'Returning Series' && lastEpisode) {
                var currentSeason = realSeasons.find(function(season) {
                    return season.season_number === lastEpisode.season_number;
                });
                
                if (currentSeason && lastEpisode.episode_number === currentSeason.episode_count) {
                    // Сезон завершено, знімається наступний
                    labelText = Lampa.Lang.translate('season_seria_season_completed')
                        .replace('{season}', lastEpisode.season_number)
                        .replace('{episodes}', currentSeason.episode_count);
                } else {
                    // Сезон ще триває
                    labelText = Lampa.Lang.translate('season_seria_active')
                        .replace('{season}', lastEpisode.season_number)
                        .replace('{current}', lastEpisode.episode_number)
                        .replace('{total}', currentSeason ? currentSeason.episode_count : 0);
                }
            }
            // Для серіалів в процесі зйомок
            else if (lastEpisode) {
                var currentSeasonNumber = lastEpisode.season_number;
                var currentEpisodeNumber = lastEpisode.episode_number;
                
                var currentSeason = realSeasons.find(function(season) {
                    return season.season_number === currentSeasonNumber;
                });
                
                var episodeCount = currentSeason ? currentSeason.episode_count : 0;
                
                if (currentSeason && currentEpisodeNumber === episodeCount) {
                    // Сезон завершено
                    labelText = Lampa.Lang.translate('season_seria_season_completed')
                        .replace('{season}', currentSeasonNumber)
                        .replace('{episodes}', episodeCount);
                } else {
                    // Сезон ще триває
                    labelText = Lampa.Lang.translate('season_seria_active')
                        .replace('{season}', currentSeasonNumber)
                        .replace('{current}', currentEpisodeNumber)
                        .replace('{total}', episodeCount);
                }
            }
            // Пілотний епізод
            else if (realSeasons.length === 0 && seasons.find(function(s) { return s.season_number === 0; })) {
                labelText = Lampa.Lang.translate('season_seria_pilot');
            }
            // Серіал без епізодів
            else if (totalEpisodes === 0) {
                labelText = Lampa.Lang.translate('season_seria_no_episodes')
                    .replace('{season}', 1)
                    .replace('{total}', 0);
            }
            // Невідомий статус
            else {
                labelText = Lampa.Lang.translate('season_seria_unknown_status')
                    .replace('{season}', 1);
            }

            var newSeriaTag = '<div class="card--new_seria"><span>' + labelText + '</span></div>';
            cardContainer.append(newSeriaTag);
        });
    }

    if (window.appready) {
        initPlugin();
    } else {
        Lampa.Listener.follow('app', function (event) {
            if (event.type === 'ready') initPlugin();
        });
    }
})();
