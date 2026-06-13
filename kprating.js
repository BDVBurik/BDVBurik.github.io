(function () {
	'use strict';

	var colored_ratings = true;
	var voteColorsObserverStarted = false;
	var api_keys = window.kinopoisk_api_keys || [];
	var current_key_index = 0;

	if (api_keys.length) {
		if (typeof window.getKinopoiskKey === "function") {
			var startKey = window.getKinopoiskKey();
			var startIndex = api_keys.indexOf(startKey);
			current_key_index = startIndex >= 0 ? startIndex : 0;
		} else {
			current_key_index = Math.floor(Math.random() * api_keys.length);
		}
	}

	var ratingSelectors = '.card__vote, .full-start__rate, .full-start-new__rate, .info__rate, .card__imdb-rate, .card__kinopoisk-rate, .rate--kp, .rate--imdb';

	function applyColorByRating(element) {
		var voteText = $(element).text().trim();
		var match = voteText.match(/(\d+(\.\d+)?)/);
		if (!match) return;

		var vote = parseFloat(match[0]);

		if (vote >= 0 && vote <= 3) {
			$(element).css('color', 'red');
		} else if (vote > 3 && vote < 6) {
			$(element).css('color', 'orange');
		} else if (vote >= 6 && vote < 8) {
			$(element).css('color', 'cornflowerblue');
		} else if (vote >= 8 && vote <= 10) {
			$(element).css('color', 'lawngreen');
		}
	}

	function updateVoteColors() {
		if (!colored_ratings) return;

		$(ratingSelectors).each(function () {
			applyColorByRating(this);
		});
	}

	function setupVoteColorsObserver() {
		if (!colored_ratings || voteColorsObserverStarted) return;

		voteColorsObserverStarted = true;
		setTimeout(updateVoteColors, 500);

		var observer = new MutationObserver(function () {
			setTimeout(updateVoteColors, 100);
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true
		});
	}

	function resetVoteColors() {
		$(ratingSelectors).css('color', '');
	}

	function getHeaders() {
		return {
			'X-API-KEY': api_keys[current_key_index]
		};
	}

	function switchKey() {
		current_key_index++;
		if (current_key_index >= api_keys.length) {
			current_key_index = 0;
		}
	}

	function requestWithRotation(network, url, success, fail) {
		var attempts = 0;

		function tryRequest() {
			network.clear();
			network.timeout(15000);

			network.silent(url, success, function (a, c) {
				var error = network.errorDecode(a, c) || '';

				if (
					(c == 402 || c == 429 || error.indexOf('exceeded') !== -1) &&
					attempts < api_keys.length
				) {
					attempts++;
					switchKey();

					console.log('Switch API KEY →', current_key_index);

					tryRequest();
				} else {
					fail(a, c);
				}
			}, false, {
				headers: getHeaders()
			});
		}

		tryRequest();
	}

	function rating_kp_imdb(card) {
		var network = new Lampa.Reguest();

		var clean_title = kpCleanTitle(card.title);
		var search_date = card.release_date || card.first_air_date || card.last_air_date || '0000';
		var search_year = parseInt((search_date + '').slice(0, 4));
		var orig = card.original_title || card.original_name;

		var kp_prox = 'https://worker-patient-dream-26d8.bdvburik.workers.dev:8443/';

		var params = {
			id: card.id,
			url: kp_prox + 'https://kinopoiskapiunofficial.tech/',
			rating_url: kp_prox + 'https://rating.kinopoisk.ru/',
			cache_time: 1000 * 60 * 60 * 24 * 7 // 7 дней
		};

		getRating();

		function getRating() {
			var movieRating = _getCache(params.id);
			if (movieRating) {
				return _showRating(movieRating[params.id]);
			} else {
				searchFilm();
			}
		}

		function searchFilm() {
			var url = params.url;

			// 🔥 приоритет imdb (экономит лимиты)
			if (card.imdb_id) {
				url = Lampa.Utils.addUrlComponent(url + 'api/v2.2/films', 'imdbId=' + encodeURIComponent(card.imdb_id));

				requestWithRotation(network, url, function (json) {
					if (json.items && json.items.length) chooseFilm(json.items);
					else chooseFilm([]);
				}, function (a, c) {
					showError(network.errorDecode(a, c));
				});

				return;
			}

			// fallback search
			var url_by_title = Lampa.Utils.addUrlComponent(
				url + 'api/v2.1/films/search-by-keyword',
				'keyword=' + encodeURIComponent(clean_title)
			);

			requestWithRotation(network, url_by_title, function (json) {
				if (json.items && json.items.length) chooseFilm(json.items);
				else if (json.films && json.films.length) chooseFilm(json.films);
				else chooseFilm([]);
			}, function (a, c) {
				showError(network.errorDecode(a, c));
			});
		}

		function chooseFilm(items) {
			if (!items || !items.length) {
				return saveEmpty();
			}

			items.forEach(function (c) {
				var year = c.start_date || c.year || '0000';
				c.tmp_year = parseInt((year + '').slice(0, 4));
			});

			var cards = items;

			if (card.imdb_id) {
				var tmp = cards.filter(function (e) {
					return (e.imdb_id || e.imdbId) == card.imdb_id;
				});
				if (tmp.length) cards = tmp;
			}

			if (cards.length > 1 && search_year) {
				var tmp = cards.filter(function (c) {
					return c.tmp_year == search_year;
				});
				if (tmp.length) cards = tmp;
			}

			if (cards.length !== 1) {
				return saveEmpty();
			}

			var id = cards[0].kinopoiskId || cards[0].filmId;

			requestWithRotation(network, params.url + 'api/v2.2/films/' + id, function (data) {
				var movieRating = _setCache(params.id, {
					kp: data.ratingKinopoisk,
					imdb: data.ratingImdb,
					timestamp: new Date().getTime()
				});
				return _showRating(movieRating);
			}, function (a, c) {
				showError(network.errorDecode(a, c));
			});
		}

		function saveEmpty() {
			var movieRating = _setCache(params.id, {
				kp: 0,
				imdb: 0,
				timestamp: new Date().getTime()
			});
			return _showRating(movieRating);
		}

		function cleanTitle(str) {
			return str.replace(/[\s.,:;’'`!?]+/g, ' ').trim();
		}

		function kpCleanTitle(str) {
			return cleanTitle(str)
				.replace(/^[ \/\\]+/, '')
				.replace(/[ \/\\]+$/, '')
				.replace(/( *[\/\\]+ *)+/g, '+');
		}

		function showError(error) {
			console.log('KP error:', error);
		}

		function _getCache(movie) {
			var timestamp = new Date().getTime();
			var cache = Lampa.Storage.cache('kp_rating', 500, {});

			if (cache[movie]) {
				if ((timestamp - cache[movie].timestamp) > params.cache_time) {
					delete cache[movie];
					Lampa.Storage.set('kp_rating', cache);
					return false;
				}
			} else return false;

			return cache;
		}

		function _setCache(movie, data) {
			var cache = Lampa.Storage.cache('kp_rating', 500, {});
			cache[movie] = data;
			Lampa.Storage.set('kp_rating', cache);
			return data;
		}

		function _showRating(data) {
			if (!data) return;

			var kp_rating = !isNaN(data.kp) ? parseFloat(data.kp).toFixed(1) : '0.0';
			var imdb_rating = !isNaN(data.imdb) ? parseFloat(data.imdb).toFixed(1) : '0.0';

			var render = Lampa.Activity.active().activity.render();

			$('.wait_rating', render).remove();

			$('.rate--imdb', render).removeClass('hide')
				.find('> div').eq(0).text(imdb_rating);

			$('.rate--kp', render).removeClass('hide')
				.find('> div').eq(0).text(kp_rating);

			setTimeout(updateVoteColors, 100);
		}
	}

	function startPlugin() {
		window.rating_plugin = true;

		colored_ratings = Lampa.Storage.get('colored_ratings', true);

		Lampa.SettingsApi.addComponent({
			component: 'kp_rating',
			name: 'Рейтинги КП/IMDB',
			icon: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/></svg>'
		});

		Lampa.SettingsApi.addParam({
			component: 'kp_rating',
			param: {
				name: 'colored_ratings',
				type: 'trigger',
				default: true
			},
			field: {
				name: 'Цветные рейтинги',
				description: 'Изменять цвет рейтинга в зависимости от оценки'
			},
			onChange: function (value) {
				var activeElement = document.activeElement;

				colored_ratings = value;
				Lampa.Settings.update();

				setTimeout(function () {
					if (value) {
						setupVoteColorsObserver();
						updateVoteColors();
					} else {
						resetVoteColors();
					}

					if (activeElement && document.body.contains(activeElement)) {
						activeElement.focus();
					}
				}, 0);
			}
		});

		Lampa.Listener.follow('full', function (e) {
			if (e.type == 'complite') {
				var render = e.object.activity.render();

				if (
					$('.rate--kp', render).hasClass('hide') &&
					!$('.wait_rating', render).length
				) {
					$('.info__rate', render).after(
						'<div class="wait_rating"><div class="broadcast__scan"><div></div></div></div>'
					);

					rating_kp_imdb(e.data.movie);
				}

				setTimeout(updateVoteColors, 100);
			}
		});

		if (colored_ratings) {
			setupVoteColorsObserver();
		}
	}
	if (!window.rating_plugin) {
		if (window.appready) {
			startPlugin();
		} else {
			Lampa.Listener.follow('app', function (event) {
				if (event.type === 'ready') {
					startPlugin();
				}
			});
		}
	}

})();
