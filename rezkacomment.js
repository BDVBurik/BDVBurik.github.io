(function () {
  //BDVBurik 2024
  ("use strict");

  let www = "<hr>";
  let year;
  let namemovie;
  const urlEndTMDB = "?language=en-US&api_key=4ef0d7355d9ffb5151e987764708ce96";

  const tmdbApiUrl = "https://api.themoviedb.org/3/";
  let kp_prox = "https://worker-patient-dream-26d7.bdvburik.workers.dev/";
  let url = "https://rezka.ag/ajax/get_comments/?t=1714093694732&news_id=";

  // Функция для поиска на сайте hdrezka
  async function searchRezka(name, ye) {
    let fc = await fetch(
      kp_prox +
        "https://hdrezka.ag/search/?do=search&subaction=search&q=" +
        name +
        (ye ? "+" + ye : ""),
      {
        method: "GET",
        headers: {
          "Content-Type": "text/html",
        },
      }
    ).then((response) => response.text());

    let dom = new DOMParser().parseFromString(fc, "text/html");

    let arr = Array.from(dom.getElementsByClassName("trailer show-trailer"));
    comment_rezka(arr[0].dataset.id);
  }

  // Функция для получения английского названия фильма или сериала
  async function getEnTitle(id, type) {
    let url;

    if (type === "movie") {
      url = kp_prox + tmdbApiUrl + "movie/" + id + urlEndTMDB;
    } else {
      url = kp_prox + tmdbApiUrl + "tv/" + id + urlEndTMDB;
    }

    ennTitle(url);
  }
  async function ennTitle(url) {
    let enTitle;
    await fetch(url)
      .then((response) => response.json())
      .then((e) => (enTitle = e.title || e.name));
    searchRezka(normalizeTitle(enTitle), year);
  }

  // Функция для очистки заголовка от лишних символов
  function cleanTitle(str) {
    return str.replace(/[\s.,:;’'`!?]+/g, " ").trim();
  }

  // Функция для нормализации заголовка
  function normalizeTitle(str) {
    return cleanTitle(
      str
        .toLowerCase()
        .replace(/[\-\u2010-\u2015\u2E3A\u2E3B\uFE58\uFE63\uFF0D]+/g, "-")
        .replace(/ё/g, "е")
    );
  }

  // Функция для получения комментариев с сайта rezka
  async function comment_rezka(id) {
    console.log(
      kp_prox +
        url +
        (id ? id : "1") +
        "&cstart=1&type=0&comment_id=0&skin=hdrezka"
    );
    let fc = await fetch(
      kp_prox +
        url +
        (id ? id : "1") +
        "&cstart=1&type=0&comment_id=0&skin=hdrezka",
      {
        method: "GET",
        headers: { "Content-Type": "text/plain" },
      }
    )
      .then((response) => response.json())
      .then((qwe) => qwe);

    let dom = new DOMParser().parseFromString(fc.comments, "text/html");

    let arr = Array.from(dom.getElementsByClassName("message"));
    console.log("arr", arr);
    www = "<hr>";
    arr
      .map((er) => er)
      .forEach((q) => {
        let text = q.childNodes[3].innerText;
        //console.log(text.length, text);
        www +=
          "<div><div style = 'display: flex; justify-content: space-between; font-size: 0.6em; color:#cfc9be '><span>" +
          q.childNodes[1].children[1].innerText +
          "</span> <span >" +
          q.childNodes[1].children[2].innerText +
          "</span></div> <div style='padding-left:1.2em'>" +
          q.childNodes[3].innerHTML +
          "</div></div><hr color:#cfc9be>  ";
      });
    let Script = document.createElement("Script");
    Script.innerHTML = `function ShowOrHide(id) {var text = $("#" + id);text.prev(".title_spoiler").remove();text.css("display", "inline");}`;
    document.head.appendChild(Script);
    var modal = $(
      `<div> <div class="broadcast__text" style="text-align:left"><div class="comment">` +
        www +
        "</div></div></div>"
    );
    let styleEl = document.createElement("style");
    styleEl.setAttribute("type", "text/css");
    styleEl.innerHTML = `.title_spoiler a {
    border-radius: 8px;
    background-color: #ccc;
    color: #fff;
    padding: 0 2px 0 5px;
    position: relative;
    text-decoration: none;
}
`;
    document.head.appendChild(styleEl);

    var enabled = Lampa.Controller.enabled().name;
    Lampa.Modal.open({
      title: "",
      html: modal,
      size: "large",
      style: "",
      mask: !0,
      onBack: function () {
        Lampa.Modal.close(), Lampa.Controller.toggle(enabled);
        $(".modal--large").remove();
      },
      onSelect: function () {},
    });
    $(".modal__head").after(
      `${namemovie}<button class="selector "  tabindex="0" style = "float: right;" type="button"  onclick="$('.modal--large').remove()"  data-dismiss="modal">&times;</button>`
    );
  }

  // Функция для начала работы плагина
  function startPlugin() {
    window.comment_plugin = true;
    Lampa.Listener.follow("full", function (e) {
      if (e.type == "complite") {
        $(".full-start-new__buttons").append(
          `<div class="full-start__button selector button--comment"><svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="512" height="512" x="0" y="0" viewBox="0 0 356.484 356.484" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="M293.984 7.23H62.5C28.037 7.23 0 35.268 0 69.731v142.78c0 34.463 28.037 62.5 62.5 62.5l147.443.001 70.581 70.58a12.492 12.492 0 0 0 13.622 2.709 12.496 12.496 0 0 0 7.717-11.547v-62.237c30.759-3.885 54.621-30.211 54.621-62.006V69.731c0-34.463-28.037-62.501-62.5-62.501zm37.5 205.282c0 20.678-16.822 37.5-37.5 37.5h-4.621c-6.903 0-12.5 5.598-12.5 12.5v44.064l-52.903-52.903a12.493 12.493 0 0 0-8.839-3.661H62.5c-20.678 0-37.5-16.822-37.5-37.5V69.732c0-20.678 16.822-37.5 37.5-37.5h231.484c20.678 0 37.5 16.822 37.5 37.5v142.78z" fill="currentcolor" opacity="1" data-original="currentcolor" class=""></path><path d="M270.242 95.743h-184c-6.903 0-12.5 5.596-12.5 12.5 0 6.903 5.597 12.5 12.5 12.5h184c6.903 0 12.5-5.597 12.5-12.5 0-6.904-5.596-12.5-12.5-12.5zM270.242 165.743h-184c-6.903 0-12.5 5.596-12.5 12.5s5.597 12.5 12.5 12.5h184c6.903 0 12.5-5.597 12.5-12.5s-5.596-12.5-12.5-12.5z" fill="currentcolor" opacity="1" data-original="currentcolor" class=""></path></g></svg><span>${Lampa.Lang.translate('title_comments')}</span></div>`
        );

        $(".button--comment").on("hover:enter", function (card) {
          if (e.data.movie.release_date) {
            year = e.data.movie.release_date.slice(0, 4);
          }
          namemovie = e.data.movie.title || e.data.movie.name;
          getEnTitle(e.data.movie.id, e.object.method);
        });
      }
    });
  }

  if (!window.comment_plugin) startPlugin();
})();
