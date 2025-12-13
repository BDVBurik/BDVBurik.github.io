(function () {
  //BDVBurik 2024
  //thanks Red Cat
  ("use strict");

  let www = ``;
  let year;
  let namemovie;
  const urlEndTMDB = "?language=ru-RU&api_key=4ef0d7355d9ffb5151e987764708ce96";

  const tmdbApiUrl = "https://api.themoviedb.org/3/";
  let kp_prox = "https://worker-patient-dream-26d7.bdvburik.workers.dev:8443/";
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

    let arr = Array.from(dom.getElementsByClassName("b-content__inline_item"));
    namemovie = arr[0].childNodes[3].innerText;
    console.log("rezkacomment", name, ye);
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

  // Функция для получения комментариев с сайта rezka// === Построение нового дерева комментариев ===

  // Создаёт один комментарий
  function buildCommentNode(item) {
    //console.log("item", item);
    const avatar = item.querySelector(".ava img")?.src || "";
    const user = item.querySelector(".name")?.innerText || "Без имени";
    const date = item.querySelector(".date")?.innerText || "";
    const text = item.querySelector(".message")?.innerHTML || "";

    const wrapper = document.createElement("div");
    wrapper.className = "rc-comment";

    wrapper.innerHTML = `
        <div class="rc-header">
            <div class="rc-avatar" style="background-image:url('${avatar}')"></div>
            <div class="rc-meta">
                <div class="rc-user">${user}</div>
                <div class="rc-date">${date}</div>
            </div>
        </div>

        <div class="rc-text">${text}</div>

        <div class="rc-children"></div>
    `;

    return wrapper;
  }

  // Рекурсивно строит дерево
  function buildTree(root) {
    const items = root.children;
    const fragment = document.createDocumentFragment();

    for (let li of items) {
      const comment = buildCommentNode(li);

      const childList = li.querySelector(":scope > ul.comments-tree-list");
      if (childList) {
        const childrenContainer = comment.querySelector(".rc-children");
        childrenContainer.appendChild(buildTree(childList));
      }

      fragment.appendChild(comment);
    }

    return fragment;
  }

  // === Основная обработка комментариев Rezka ===
  async function comment_rezka(id) {
    let fc = await fetch(
      kp_prox +
        url +
        (id ? id : "1") +
        "&cstart=1&type=0&comment_id=0&skin=hdrezka",
      { method: "GET", headers: { "Content-Type": "text/plain" } }
    )
      .then((response) => response.json())
      .then((qwe) => qwe);

    let dom = new DOMParser().parseFromString(fc.comments, "text/html");
    console.log("rezkacomment dom", dom);
    // Удаляем мусор Rezka
    dom
      .querySelectorAll(".actions, i, .share-link")
      .forEach((elem) => elem.remove());

    // Переносим message внутрь li
    dom.querySelectorAll(".message").forEach((e) => {
      var cct = e.closest(".comments-tree-item");
      var gp = e.parentNode.parentNode;
      cct.appendChild(e);
      // gp.remove();
    });

    // Чистим info
    dom.querySelectorAll(".info").forEach((e) => {
      e.childNodes[5]?.remove();
      e.classList.add("myinfo");
      e.classList.remove("info");
    });

    // Берём корневой список
    let rootList = dom.querySelector(".comments-tree-list");

    // Строим новое дерево
    let newTree = buildTree(rootList);

    // Вставляем в модалку
    let modal = $(`
        <div>
            <div class="broadcast__text" style="text-align:left;">
                <div class="comment" style="margin-left: -15px;"></div>
            </div>
        </div>
    `);

    modal.find(".comment").append(newTree);

    // Стили (из rezkacomment1.js)
    let styleEl = document.createElement("style");
    styleEl.innerHTML = `
        .rc-comment {
            padding: 12px 14px;
            margin: 8px 0;
            background: #1b1b1b;
            border-radius: 8px;
            border: 1px solid #2a2a2a;
        }
        .rc-header {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
        }
        .rc-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background-size: cover;
            background-position: center;
            margin-right: 10px;
            flex-shrink: 0;
        }
        .rc-meta {
            display: flex;
            flex-direction: column;
        }
        .rc-user {
            font-weight: 600;
            font-size: 15px;
            color: #fff;
        }
        .rc-date {
            font-size: 12px;
            color: #888;
            margin-top: 2px;
        }
        .rc-text {
            font-size: 15px;
            line-height: 1.45;
            color: #ddd;
            margin-bottom: 8px;
        }
        .rc-children {
            margin-left: 22px;
            border-left: 1px solid #333;
            padding-left: 14px;
        }
    `;
    document.head.appendChild(styleEl);

    // Открываем модалку
    var enabled = Lampa.Controller.enabled().name;

    Lampa.Modal.open({
      title: ``,
      html: modal,
      size: "large",
      style: "margin-top:10px;",
      mask: !0,
      onBack: function () {
        Lampa.Modal.close(), Lampa.Controller.toggle(enabled);
        $(".modal--large").remove();
      },
    });

    $(".modal__head").after(
      `${namemovie}<button class="rc-close selector" tabindex="0" style="float: right;" type="button" onclick="$('.modal--large').remove()">&times;</button>`
    );
  }

  // Функция для начала работы плагина
  function startPlugin() {
    window.comment_plugin = true;
    Lampa.Listener.follow("full", function (e) {
      if (e.type == "complite") {
        $(".button--comment").remove();
        $(".full-start-new__buttons").append(
          `<div class="full-start__button selector button--comment"><svg xmlns="http://www.w3.org/2000/svg" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" width="512" height="512" x="0" y="0" viewBox="0 0 356.484 356.484" style="enable-background:new 0 0 512 512" xml:space="preserve" class=""><g><path d="M293.984 7.23H62.5C28.037 7.23 0 35.268 0 69.731v142.78c0 34.463 28.037 62.5 62.5 62.5l147.443.001 70.581 70.58a12.492 12.492 0 0 0 13.622 2.709 12.496 12.496 0 0 0 7.717-11.547v-62.237c30.759-3.885 54.621-30.211 54.621-62.006V69.731c0-34.463-28.037-62.501-62.5-62.501zm37.5 205.282c0 20.678-16.822 37.5-37.5 37.5h-4.621c-6.903 0-12.5 5.598-12.5 12.5v44.064l-52.903-52.903a12.493 12.493 0 0 0-8.839-3.661H62.5c-20.678 0-37.5-16.822-37.5-37.5V69.732c0-20.678 16.822-37.5 37.5-37.5h231.484c20.678 0 37.5 16.822 37.5 37.5v142.78z" fill="currentcolor" opacity="1" data-original="currentcolor" class=""></path><path d="M270.242 95.743h-184c-6.903 0-12.5 5.596-12.5 12.5 0 6.903 5.597 12.5 12.5 12.5h184c6.903 0 12.5-5.597 12.5-12.5 0-6.904-5.596-12.5-12.5-12.5zM270.242 165.743h-184c-6.903 0-12.5 5.596-12.5 12.5s5.597 12.5 12.5 12.5h184c6.903 0 12.5-5.597 12.5-12.5s-5.596-12.5-12.5-12.5z" fill="currentcolor" opacity="1" data-original="currentcolor" class=""></path></g></svg><span>${Lampa.Lang.translate(
            "title_comments"
          )}</span></div>`
        );

        $(".button--comment").on("hover:enter", function (card) {
          //console.log("rcomment", e.data);
          year = 0;
          if (e.data.movie.release_date) {
            year = e.data.movie.release_date.slice(0, 4);
          } else if (e.data.movie.first_air_date) {
            year = e.data.movie.first_air_date.slice(0, 4);
          }
          getEnTitle(e.data.movie.id, e.object.method);
        });
      }
    });
  }

  if (!window.comment_plugin) startPlugin();
})();
