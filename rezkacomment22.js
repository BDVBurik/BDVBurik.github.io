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

    const item = dom.querySelector(".b-content__inline_item");
    if (!item) return;

    namemovie =
      item.querySelector(".b-content__inline_item-link")?.innerText || "";
    comment_rezka(item.dataset.id);
  }

  // Функция для получения английского названия фильма или сериала
  async function getEnTitle(id, type) {
    Lampa.Loading.start();
    const url =
      kp_prox +
      tmdbApiUrl +
      (type === "movie" ? "movie/" : "tv/") +
      id +
      urlEndTMDB;

    let data;
    try {
      data = await fetch(url).then((r) => r.json());
    } catch (e) {
      console.error("TMDB error", e);
      Lampa.Loading.stop();
      return;
    }

    const enTitle = data.title || data.name;

    if (enTitle) {
      searchRezka(normalizeTitle(enTitle), year);
    }
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
    const q = (s) => item.querySelector(s);

    const avatar = q(".ava img")?.dataset.src || q(".ava img")?.src || "";

    const user = q(".name, .b-comment__user")?.innerText || "Без имени";
    const date = q(".date, .b-comment__time")?.innerText || "";
    const text = q(".message .text, .text")?.innerHTML || "";

    const wrapper = document.createElement("div");
    wrapper.className = "message";

    wrapper.innerHTML = `
        <div class="comment-wrap">
            <div class="avatar-column">
                <img src="${avatar}" class="avatar-img" alt="${user}">
            </div>

            <div class="comment-card">
                <div class="comment-header">
                    <span class="name">${user}</span>
                    <span class="date">${date}</span>
                </div>

                <div class="comment-text">
                    <div class="text">${text}</div>
                </div>
            </div>
        </div>
    `;

    return wrapper;
  }
  // Рекурсивно строит дерево
  function buildTree(root) {
    const fragment = document.createDocumentFragment();

    for (let li of root.children) {
      const indent = parseInt(li.dataset.indent || 0, 10);

      const wrapper = document.createElement("li");
      wrapper.className = "comments-tree-item";
      wrapper.style.marginLeft = `${indent ? indent * 20 : 0}px`;

      wrapper.appendChild(buildCommentNode(li));

      const children = li.querySelector(":scope > ol.comments-tree-list");
      if (children) {
        const ol = document.createElement("ol");
        ol.className = "comments-tree-list";
        ol.appendChild(buildTree(children));
        wrapper.appendChild(ol);
      }

      fragment.appendChild(wrapper);
    }

    return fragment;
  }

  // === Основная обработка комментариев Rezka ===
  async function comment_rezka(id) {
    try {
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
      Lampa.Loading.stop();
      // Берём корневой список
      let rootList = dom.querySelector(".comments-tree-list");

      // Строим новое дерево
      let newTree = buildTree(rootList);

      // Вставляем в модалку
      let modal = $(`
        <div>
            <div class="broadcast__text" style="text-align:left;">
                <div class="comment" ></div>
            </div>
        </div>
    `);

      modal.find(".comment").append(newTree);

      // Стили (из rezkacomment1.js)

      if (!document.getElementById("rezka-comment-style")) {
        const styleEl = document.createElement("style");
        styleEl.id = "rezka-comment-style";
        styleEl.textContent = `
    .comments-tree-list{list-style:none;margin:0;padding:0;}

.comments-tree-item{list-style:none;margin:0;padding:0;}


.comment-wrap{display:flex;margin-bottom:10px;}
.avatar-column{margin-right:10px;}
.avatar-img{width:48px;height:48px;border-radius:4px;}

.comment-card{background:#1b1b1b;padding:10px 12px;border-radius:6px;border:1px solid #2a2a2a;width:100%;}
.comment-header{display:flex;justify-content:space-between;margin-bottom:6px;}
.comment-header .name{font-weight:600;color:#fff;}
.comment-header .date{opacity:.7;font-size:11px;}
.comment-text .text{color:#ddd;line-height:1.45;}

.rc-children{margin-left:30px;border-left:1px solid #333;padding-left:14px;}

.title_spoiler{display:inline-flex;align-items:center;background:#2a2a2a;border-radius:6px;padding:1px 4px;margin:0 2px;font-size:13px;color:#e0e0e0;cursor:pointer;box-shadow:0 0 2px rgba(0,0,0,.4);}
.title_spoiler a{color:#e0e0e0!important;text-decoration:none!important;}
.title_spoiler img{height:14px;width:auto;vertical-align:middle;margin:0 2px;}
.title_spoiler .attention{height:14px;width:14px;margin-left:4px;vertical-align:middle;}

.modal-close-btn{background:#2a2a2a;border:1px solid #444;color:#ddd;border-radius:6px;font-size:18px;line-height:18px;cursor:pointer;transition:.15s;}
.modal-close-btn:hover{background:#3a3a3a;color:#fff;}

    `;
        document.head.appendChild(styleEl);
      }

      if (!window.rezkaSpoilerInit) {
        window.rezkaSpoilerInit = true;
        const Script = document.createElement("script");
        Script.textContent =
          "function ShowOrHide(id){var t=$('#'+id);t.prev('.title_spoiler').remove();t.css('display','inline');}";
        document.head.appendChild(Script);
      }

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

      document
        .querySelector(".modal__head")
        ?.insertAdjacentHTML(
          "afterend",
          `<button class="modal-close-btn selector" onclick="$('.modal--large').remove()">&times;</button>  ${namemovie}`
        );
    } finally {
    }
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
