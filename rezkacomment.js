(function () {
  //BDVBuriлk.github.io
  //2025
  ("use strict");

  let year;
  let namemovie;

  let kp_prox = "https://worker-patient-dream-26d7.bdvburik.workers.dev:8443/";
  let url = "https://rezka.ag/ajax/get_comments/?t=1714093694732&news_id=";

  // Функция для поиска на сайте hdrezka
  async function searchRezka(name, ye) {
    let fc = await fetch(
      kp_prox +
        "https://hdrezka.ag/search/?do=search&subaction=search&q=" +
        name +
        (ye ? "+" + ye : ""),
      { method: "GET", headers: { "Content-Type": "text/html" } }
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
    try {
      const data = await new Promise((res, rej) =>
        Lampa.Api.sources.tmdb.get(
          `${
            type === "movie" ? "movie" : "tv"
          }/${id}?append_to_response=translations`,
          {},
          res,
          rej
        )
      );

      const tr = data.translations?.translations;
      const enTitle =
        tr.find((t) => t.iso_3166_1 === "US" || t.iso_639_1 === "en")?.data
          ?.title ||
        tr.find((t) => t.iso_3166_1 === "US" || t.iso_639_1 === "en")?.data
          ?.name ||
        data.original_title ||
        data.original_name;
      if (enTitle) {
        searchRezka(normalizeTitle(enTitle), year);
      }
    } catch (e) {
      console.error("TMDB error", e);
      Lampa.Loading.stop();
      return;
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
      wrapper.style.marginLeft = indent > 0 ? "20px" : "0";
      wrapper.appendChild(buildCommentNode(li));

      const childrenList = li.querySelector("ol.comments-tree-list");
      if (childrenList) wrapper.appendChild(buildTree(childrenList));

      fragment.appendChild(wrapper);
    }

    return fragment;
  }

  // === Основная обработка комментариев Rezka с storage на сутки ===
  async function comment_rezka(id) {
    const storageKey = "rezkaComments_" + id;
    const storageTimeKey = storageKey + "_time";
    const oneDay = 24 * 60 * 60 * 1000;
    const now = Date.now();

    // 1. Показываем из storage сразу
    let savedHTML = localStorage.getItem(storageKey);
    let savedTime = parseInt(localStorage.getItem(storageTimeKey) || "0", 10);
    if (savedHTML && now - savedTime < oneDay) {
      const container = document.createElement("div");
      container.innerHTML = savedHTML;
      openModal(container); // показываем сразу
    }

    // 2. Обновляем в фоне
    (async () => {
      try {
        let fc = await fetch(
          kp_prox +
            url +
            (id ? id : "1") +
            "&cstart=1&type=0&comment_id=0&skin=hdrezka",
          {
            method: "GET",
            headers: { "Content-Type": "text/plain" },
          }
        ).then((r) => r.json());

        let dom = new DOMParser().parseFromString(fc.comments, "text/html");
        dom
          .querySelectorAll(".actions, i, .share-link")
          .forEach((elem) => elem.remove());
        let rootList = dom.querySelector(".comments-tree-list");
        let newTree = buildTree(rootList);

        // Сохраняем в storage
        const container = document.createElement("div");
        container.appendChild(newTree.cloneNode(true));
        localStorage.setItem(storageKey, container.innerHTML);
        localStorage.setItem(storageTimeKey, Date.now().toString());

        // Если уже показали старое, обновляем содержимое
        if (savedHTML && now - savedTime < oneDay) {
          const commentWrapper = document.querySelector(
            ".broadcast__text .comment"
          );
          if (commentWrapper) {
            commentWrapper.innerHTML = "";
            commentWrapper.appendChild(newTree);
          }
        } else {
          openModal(newTree);
        }
      } catch (e) {
        console.error(e);
        Lampa.Loading.stop();
      }
    })();

    function openModal(treeContent) {
      Lampa.Loading.stop();
      let modal = $(
        `<div><div class="broadcast__text" style="text-align:left;"><div class="comment"></div></div></div>`
      );
      modal.find(".comment").append(treeContent);

      // Стили модалки (если ещё не добавлены)
      if (!document.getElementById("rezka-comment-style")) {
        const styleEl = document.createElement("style");
        styleEl.id = "rezka-comment-style";
        styleEl.textContent = `
    .comments-tree-list{list-style:none;margin:0;padding:0;}
.comments-tree-item{list-style:none;margin:0;padding:0;}
.comment-wrap{display:flex;margin-bottom:5px;}
.avatar-column{margin-right:10px;}
.avatar-img{width:48px;height:48px;border-radius:4px;}
.comment-card{background:#1b1b1b;padding:5px 12px;border-radius:6px;border:1px solid #2a2a2a;width:100%;}
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

      Lampa.Modal.open({
        title: ``,
        html: modal,
        size: "large",
        style: "margin-top:10px;",
        mask: true,
        onBack: function () {
          Lampa.Modal.close();
          $(".modal--large").remove();
          Lampa.Controller.toggle("content");
        },
      });

      document
        .querySelector(".modal__head")
        ?.insertAdjacentHTML(
          "afterend",
          `<button class="modal-close-btn selector" onclick="$('.modal--large').remove()">&times;</button>  ${namemovie}`
        );
    }
  }

  // Функция для начала работы плагина
  function startPlugin() {
    window.comment_plugin = true;
    Lampa.Listener.follow("full", function (e) {
      if (e.type == "complite") {
        $(".button--comment").remove();
        $(".full-start-new__buttons").append(
          `<div class="full-start__button selector button--comment"><svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 356.484 356.484"><g><path d="M293.984 7.23H62.5C28.037 7.23 0 35.268 0 69.731v142.78c0 34.463 28.037 62.5 62.5 62.5l147.443.001 70.581 70.58a12.492 12.492 0 0 0 13.622 2.709 12.496 12.496 0 0 0 7.717-11.547v-62.237c30.759-3.885 54.621-30.211 54.621-62.006V69.731c0-34.463-28.037-62.501-62.5-62.501zm37.5 205.282c0 20.678-16.822 37.5-37.5 37.5h-4.621c-6.903 0-12.5 5.598-12.5 12.5v44.064l-52.903-52.903a12.493 12.493 0 0 0-8.839-3.661H62.5c-20.678 0-37.5-16.822-37.5-37.5V69.732c0-20.678 16.822-37.5 37.5-37.5h231.484c20.678 0 37.5 16.822 37.5 37.5v142.78z" fill="currentcolor"/></g></svg><span>${Lampa.Lang.translate(
            "title_comments"
          )}</span></div>`
        );

        $(".button--comment").on("hover:enter", function (card) {
          year = 0;
          if (e.data.movie.release_date) {
            year = e.data.movie.release_date.slice(0, 4);
          } else if (e.data.movie.first_air_date) {
            year = e.data.movie.first_air_date.slice(0, 4);
          }
          Lampa.Loading.start();
          getEnTitle(e.data.movie.id, e.object.method);
        });
      }
    });
  }

  if (!window.comment_plugin) startPlugin();
})();
