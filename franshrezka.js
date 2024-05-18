(function () {
  //BDVBurik 2024
  ////rezkacomment без спойлеров
  ("use strict");
  const tmdbApiUrl = "https://api.themoviedb.org/3/";
  const kp_prox = "https://worker-patient-dream-26d7.bdvburik.workers.dev/";
  const urlEndTMDB = "?language=en-US&api_key=4ef0d7355d9ffb5151e987764708ce96";
  var namemovie;
  var www;

  var year;
  var url;
  reazkaParseHtmlDom = async function (url, name, year) {
    let fc = await fetch(
      kp_prox + url + (name ? name : "") + (year ? "+" + year : ""),
      {
        method: "GET",
        headers: {
          "Content-Type": "text/html",
        },
      }
    ).then((response) => response.text());

    return new DOMParser().parseFromString(fc, "text/html");
  };
  cleanTitle = function (str) {
    return str.replace(/[\s.,:;’'`!?]+/g, "%20").trim();
  };

  normalizeTitle = function (str) {
    return cleanTitle(
      str
        .toLowerCase()
        .replace(/[\-\u2010-\u2015\u2E3A\u2E3B\uFE58\uFE63\uFF0D]+/g, "-")
        .replace(/ё/g, "е")
    );
  };

  searchRezka = async function (name, year) {
    let dom = await reazkaParseHtmlDom(
      "https://hdrezka.ag/search/?do=search&subaction=search&q=",
      name,
      year
    );

    let arr = Array.from(
      dom.getElementsByClassName("b-content__inline_item-link")
    );
    url = arr[0].children[0].href;

    dom = await reazkaParseHtmlDom(url, "", "");
    arr = Array.from(dom.getElementsByClassName("b-post__partcontent_item"));
    // console.log("sech rezka arr", arr);
    collectRender(arr);
  };

  collectRender = async function (data) {
    www = "";

    // console.log("data", data);

    let wid;
    data.filter((el, index) => {
      el.className.includes("current") ? (wid = index) : "";
    });
    // console.log("цid", wid);
    data.forEach((el, index) => {
      // console.log("data", el);
      www += `<div id="stringhide" class="${el.className}`;
      //console.log(wid, index);
      if (wid + 2 >= index && index >= wid - 2) {
        www += " show";
      } else {
        www += " hide hdhd";
      }
      www += ` "><span  class="${el.children[0].className}">
      ${el.children[0].innerText}</span><span class="${el.children[1].className}">${el.children[1].innerText}
  </span><span class="${el.children[2].className}">${el.children[2].innerText}
  </span><span class="${el.children[3].className}" ><i class="hd-tooltip tooltipstered" >${el.children[3].innerText}</i> </span><span id="search${el.children[0].innerText}" class="selector searchfr "><svg width="6" height="5" viewBox="0 0 23 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="9.9964" cy="9.63489" r="8.43556" stroke="currentColor" stroke-width="2.4"></circle>
                    <path d="M20.7768 20.4334L18.2135 17.8701" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"></path>
                </svg></span>
</div><script>$('#search${el.children[0].innerText}').on('hover:enter',()=>{Lampa.Search.open({input:'${el.children[1].innerText}  ${el.children[2].innerText}'})});</script>`;

      // if (el.className.includes("current")) {
      //   wid = index;
      // }
    });

    // console.log("www", www);
    let collect = $(
      `<div id ="collect" class="collection selector collectionfocus" style='display: table;width: 100%;'>` +
        www +
        "</div>"
    );

    $(".collection").remove();
    $(".full-descr__text").after(collect);

    // html.find('.open--search').on('hover:enter',Search.open.bind(Search))
    let hide = 1;
    $(".collection").on("hover:enter", function () {
      // console.log("asdasdasd");
      $(".hdhd").removeClass("hide");

      $("#collect").removeClass("collectionfocus");
    });
  };

  getEnTitle = async function (id, type) {
    let url;

    if (type === "movie") {
      url = kp_prox + tmdbApiUrl + "movie/" + id + urlEndTMDB;
    } else {
      url = kp_prox + tmdbApiUrl + "tv/" + id + urlEndTMDB;
    }

    ennTitle(url);
  };
  ennTitle = async function (url) {
    let enTitle;
    await fetch(url)
      .then((response) => response.json())
      .then((e) => (enTitle = e.title || e.name));
    searchRezka(normalizeTitle(enTitle), year);
  };

  // Функция для начала работы плагина
  startPlugin = function () {
    window.rezkacoll_plugin = true;
    Lampa.Listener.follow("full", function (e) {
      if (e.type == "complite") {
        if (e.data.movie.release_date) {
          year = e.data.movie.release_date.slice(0, 4);
        } else if (e.data.movie.first_air) {
          year = e.data.movie.first_air.slice(0, 4);
        } else {
          year = "";
        }
        // console.log("startPlugin");
        // console.log(e, e.data, e.data.movie);

        namemovie = e.data.movie.title || e.data.movie.name;

        getEnTitle(e.data.movie.id, e.object.method);

        let styleEl = document.createElement("style");
        styleEl.setAttribute("type", "text/css");
        styleEl.innerHTML = `.searchfr{border-radius: 100%;}.searchfr.focus{background-color:#fff;color:#000}.td{display:table-cell;border-bottom:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.5);padding:0 10px}.collection{display:table;width:90%}.collectionfocus{}.collectionfocus.focus{outline:outset #FFF}.rating{text-align:center;width:4em}.year{width:8em;text-align:right}.title{text-align:left}.num{text-align:center;width:3em}.b-post__partcontent_item{display:table-row;width:90%}.current{background-color:#ffffff1f}.show{visibility:visible}.hide{visibility:hidden};`;

        document.head.appendChild(styleEl);
      }
    });
  };

  if (!window.rezkacoll_plugin) startPlugin();
})();
