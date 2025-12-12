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

  // Функция для получения комментариев с сайта rezka
async function comment_rezka(id) {
  console.log(
    "rcomment",
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
  ).then((response) => response.json());

  let dom = new DOMParser().parseFromString(fc.comments, "text/html");

  // Мусор
  dom.querySelectorAll(".actions, i, .share-link").forEach((elem) => elem.remove());

  // info → myinfo + чистка текстовых узлов
  dom.querySelectorAll(".info").forEach((info) => {
    info.classList.add("myinfo");
    info.classList.remove("info");

    Array.from(info.childNodes).forEach((node) => {
      if (node.nodeType === 3 && node.textContent.trim()) node.remove();
    });
  });

  // Основная переразметка
  dom.querySelectorAll(".comments-tree-item").forEach((li) => {
    const block = li.querySelector(".b-comment, .comment-item, .comment");
    if (!block) return;

    const message = block.querySelector(".message");
    const ava = block.querySelector(".ava img");
    const info = block.querySelector(".myinfo");
    const text = block.querySelector(".text");

    if (!message) return;

    const nameNode = info ? info.querySelector(".name") : null;
    const dateNode = info ? info.querySelector(".date") : null;

    // comment-wrap — общий контейнер
    const wrap = dom.createElement("div");
    wrap.className = "comment-wrap";

    // avatar-column — слева, вынесена визуально вне карточки
    const avatarCol = dom.createElement("div");
    avatarCol.className = "avatar-column";
    if (ava) {
      ava.classList.add("avatar-img");
      avatarCol.appendChild(ava);
    }

    // comment-card — сама карточка комментария справа
    const card = dom.createElement("div");
    card.className = "comment-card";

    const header = dom.createElement("div");
    header.className = "comment-header";

    if (nameNode) {
      const n = dom.createElement("span");
      n.className = "name";
      n.textContent = nameNode.textContent.trim();
      header.appendChild(n);
    }

    if (dateNode) {
      const d = dom.createElement("span");
      d.className = "date";
      d.textContent = dateNode.textContent.trim();
      header.appendChild(d);
    }

    const textWrap = dom.createElement("div");
    textWrap.className = "comment-text";
    if (text) {
      textWrap.appendChild(text);
    }

    card.appendChild(header);
    card.appendChild(textWrap);

    wrap.appendChild(avatarCol);
    wrap.appendChild(card);

    // message заполняем новой структурой
    message.innerHTML = "";
    message.appendChild(wrap);

    // ВСТАВЛЯЕМ message В LI (в начало), ПОТОМ убираем старый block
    li.insertBefore(message, li.firstChild);
    block.remove();
  });

  // Убеждаемся, что message идёт перед replies
  dom.querySelectorAll(".comments-tree-item").forEach((item) => {
    const message = item.querySelector(":scope > .message");
    const replies = item.querySelector(":scope > ol.comments-tree-list");
    if (message && replies && message.nextSibling !== replies) {
      item.insertBefore(message, replies);
    }
  });

  www = dom.body.innerHTML;

  // Стили под lumen‑стиль, Вариант B
  const styleEl = document.createElement("style");
  styleEl.setAttribute("type", "text/css");
  styleEl.innerHTML = `
  .title_spoiler {
  display: inline-block;
  background-color: #2a2a2a;
  border-radius: 6px;
  font-size: 13px;
  color: #e0e0e0;
  cursor: pointer;
  user-select: none;
  box-shadow: 0 0 2px rgba(0,0,0,0.4);
}
.title_spoiler img {
  vertical-align: middle;
  margin-right: 4px;
}
.title_spoiler .attention {
  margin-left: 6px;
  vertical-align: middle;
}

.text_spoiler {
  display: none;
  background-color: #1c1c1c;
  border-left: 3px solid #555;
  padding: 6px 10px;
  margin: 6px 0;
  font-size: 14px;
  color: #dcdcdc;
  border-radius: 4px;
}
.comments-tree-item {
  list-style: none;
  margin: 3px 0;
  font-family: Arial, sans-serif;
  color: #e0e0e0;
}
/* убираем отступ у всех ol */
.comments-tree-list {
  padding-left: 0;
  padding-inline-start: 0;
  margin-left: 0;
}

/* корневые комментарии — отступ 16px */
.modal--large .comments-tree-list > .comments-tree-item {
  margin-left: 16px;
}

/* вложенные комментарии — отступ 12px */
.comments-tree-item .comments-tree-list > .comments-tree-item {
  margin-left: 16px;
}

/* общий wrap: аватар + карточка */
.comment-wrap {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

/* аватарка слева, визуально "вне" карточки */
.avatar-column {
  flex-shrink: 0;
  margin-top: 4px;
}
.avatar-column .avatar-img {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: cover;
  background-color: #333;
}

/* сама карточка комментария */
.comment-card {
  background: #1b1b1b;
  border-radius: 8px;
  padding: 3px 6px;
  border: 1px solid #2a2a2a;
  box-shadow: 0 0 4px rgba(0,0,0,0.35);
  width: 100%;
}
.comment-card:hover {
  background-color: #222;
}

/* шапка: имя слева, дата справа */
.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  margin-bottom: 6px;
  color: #cfc9be;
}
.comment-header .name {
  font-weight: bold;
  color: #d0d0d0;
}
.comment-header .date {
  opacity: 0.7;
  font-size: 11px;
}

/* текст */
.comment-text {
  font-size: 14px;
  line-height: 1.45em;
  color: #e6e6e6;
}
`;
  document.head.appendChild(styleEl);

  // Спойлеры
  let Script = document.createElement("Script");
  Script.innerHTML = `function ShowOrHide(id) {var text = $("#" + id);text.prev(".title_spoiler").remove();text.css("display", "inline");}`;
  document.head.appendChild(Script);

  const modal = $(`
    <div>
      <div class="broadcast__text" style="text-align:left;">
        <div class="comment" style="margin-left: -15px;">${www}</div>
      </div>
    </div>
  `);

  const enabled = Lampa.Controller.enabled().name;

  Lampa.Modal.open({
    title: ``,
    html: modal,
    size: "large",
    style: "margin-top:10px;",
    mask: !0,
    onBack: function () {
      Lampa.Modal.close(), Lampa.Controller.toggle(enabled);
      $(".modal--large").remove();
      www = "";
    },
    onSelect: function () {},
  });

  $(".modal__head").after(
    `${namemovie}<button class="selector " tabindex="0" style="float: right;" type="button" onclick="$('.modal--large').remove()" data-dismiss="modal">&times;</button>`
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
