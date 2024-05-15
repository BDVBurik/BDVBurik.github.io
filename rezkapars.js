///https://rezka.ag/franchises/page/${i}/

// {
//     "id": 155,
//     "original_name": "The Dark Knight",
//     "poster_path": "/dxWaYQtgpLbycqUpHzkqqYkT5I3.jpg",
//     "vote_average": 8.51,
//     "content_type": "фильм",
//     "title": "Тёмный рыцарь",
//     "release_date": 2008
// },
// { "hpu":"Amazon.json", 
//   "title":"Amazon", 
//  "type":"movie", 
//   "meta_title":"Топ фильмы вышедших на Netflix", 
//  "img":"img/amazon_prime.png" 
// }

var card = [];
var page;
if (object.sourc != 'pub') str = str.replace(/\n/g, '');
if (object.card && object.card.source == 'rezka' || object.sourc == 'rezka') {
    var h = $('.b-content__inline_item', str).length ? $('.b-content__inline_item', str) : $('.b-content__collections_item', str);
    total_pages = $('.b-navigation', str).find('a:last-child').length;
    page = $('.b-navigation', str).find('a:last-child').attr('href');
    $(h).each(function (i, html) {
        card.push({
            id: $('a', html).attr('href').split('-')[0].split('/').pop(),
            title: $('a:eq(1)', html).text().split(' / ').shift() || $('.title', html).text(),
            title_org: $('a:eq(1)', html).text().split(' / ').shift(),
            url: $('a', html).attr('href'),
            img: $('img', html).attr('src'),
            quantity: $('.num', html).text() + ' видео',
            year: $('div:eq(2)', html).text().split(' - ').shift()
        });
    });


    