(function () {
  // BDVBurik 2024
  // thanks Red Cat
  "use strict";

  let www = "";
  let year;
  let namemovie;

  const urlEndTMDB = "?language=ru-RU&api_key=4ef0d7355d9ffb5151e987764708ce96";
  const tmdbApiUrl = "https://api.themoviedb.org/3/";
  const kp_prox = "https://worker-patient-dream-26d7.bdvburik.workers.dev:8443/";
  const urlRezka = "https://rezka.ag/ajax/get_comments/?t=1714093694732&news_id=";

  async function searchRezka(name, ye) {
    const fc = await fetch(
      kp_prox +
        "https://hdrezka.ag/search/?do=search&subaction=search&q=" +
        name +
        (ye ? "+" + ye : ""),
      { method: "GET", headers: { "Content-Type": "text/html" } }
    ).then((r) => r.text());

    const dom = new DOMParser().parseFromString(fc, "text/html");
    const arr = Array.from(dom.getElementsByClassName("b-content__inline_item"));
    if (!arr.length) return;

    namemovie = arr[0].childNodes[3].innerText;
    console.log("rezkacomment", name, ye);
    comment_rezka(arr[0].dataset.id);
  }

  async function getEnTitle(id, type) {
    const url =
      kp_prox +
      tmdbApiUrl +
      (type === "movie" ? "movie/" : "tv/") +
      id +
      urlEndTMDB;
    Lampa.Loading.start();
    ennTitle(url);
  }

  async function ennTitle(url) {
    let enTitle = "";
    await fetch(url)
      .then((r) => r.json())
      .then((e) => (enTitle = e.title || e.name || ""));
    if (!enTitle) return;
    searchRezka(normalizeTitle(enTitle), year);
  }

  function cleanTitle(str) {
    return str.replace(/[\s.,:;’'`!?]+/g, " ").trim();
  }

  function normalizeTitle(str) {
    return cleanTitle(
      String(str || "")
        .toLowerCase()
        .replace(/[\-\u2010-\u2015\u2E3A\u2E3B\uFE58\uFE63\uFF0D]+/g, "-")
        .replace(/ё/g, "е")
    );
  }

  async function comment_rezka(id) {
    const link =
      kp_prox +
      urlRezka +
      (id || "1") +
      "&cstart=1&type=0&comment_id=0&skin=hdrezka";

    console.log("rcomment", link);

    const fc = await fetch(link, {
      method: "GET",
      headers: { "Content-Type": "text/plain" },
    }).then((r) => r.json());

    const dom = new DOMParser().parseFromString(fc.comments, "text/html");

    dom.querySelectorAll(".actions, i, .share-link").forEach((e) => e.remove());

    dom.querySelectorAll(".info").forEach((info) => {
      info.classList.add("myinfo");
      info.classList.remove("info");
      Array.from(info.childNodes).forEach((node) => {
        if (node.nodeType === 3 && node.textContent.trim()) node.remove();
      });
    });

    dom.querySelectorAll(".comments-tree-item").forEach((li) => {
      const block = li.querySelector(".b-comment, .comment-item, .comment");
      if (!block) return;

      const message = block.querySelector(".message");
      if (!message) return;

      const ava = block.querySelector(".ava img");
      const info = block.querySelector(".myinfo");
      const text = block.querySelector(".text");

      const wrap = dom.createElement("div");
      wrap.className = "comment-wrap";

      const avatarCol = dom.createElement("div");
      avatarCol.className = "avatar-column";
      if (ava) {
        ava.classList.add("avatar-img");
        avatarCol.appendChild(ava);
      }

      const card = dom.createElement("div");
      card.className = "comment-card";

      const header = dom.createElement("div");
      header.className = "comment-header";

      if (info) {
        const nameNode = info.querySelector(".name");
        const dateNode = info.querySelector(".date");

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
      }

      const textWrap = dom.createElement("div");
      textWrap.className = "comment-text";
      if (text) textWrap.appendChild(text);

      card.appendChild(header);
      card.appendChild(textWrap);

      wrap.appendChild(avatarCol);
      wrap.appendChild(card);

      message.innerHTML = "";
      message.appendChild(wrap);

      li.insertBefore(message, li.firstChild);
      block.remove();
    });

    dom.querySelectorAll(".comments-tree-item").forEach((item) => {
      const message = item.querySelector(":scope > .message");
      const replies = item.querySelector(":scope > ol.comments-tree-list");
      if (message && replies && message.nextSibling !== replies) {
        item.insertBefore(message, replies);
      }
    });

    www = dom.body.innerHTML;

    const styleEl = document.createElement("style");
    styleEl.type = "text/css";
    styleEl.innerHTML = `
.comments-tree-item{list-style:none;margin:10px 0;font-family:Arial,sans-serif;color:#e0e0e0;}
.comments-tree-list{padding-left:0;padding-inline-start:0;margin-left:0;}
.comments-tree-list>.comments-tree-item{margin-left:10px;}
.comment-wrap{display:flex;align-items:flex-start;gap:10px;}
.avatar-column{flex-shrink:0;margin-top:4px;}
.avatar-column .avatar-img{width:40px;height:40px;border-radius:8px;object-fit:cover;background-color:#333;}
.comment-card{background:#1b1b1b;border-radius:8px;padding:10px 12px;border:1px solid #2a2a2a;box-shadow:0 0 4px rgba(0,0,0,.35);width:100%;}
.comment-card:hover{background-color:#222;}
.comment-header{display:flex;justify-content:space-between;align-items:center;font-size:13px;margin-bottom:6px;color:#cfc9be;}
.comment-header .name{font-weight:700;color:#d0d0d0;}
.comment-header .date{opacity:.7;font-size:11px;}
.comment-text{font-size:14px;line-height:1.45em;color:#e6e6e6;}
.title_spoiler{display:inline-flex;align-items:center;background:#2a2a2a;border-radius:6px;padding:1px 4px;margin:0 2px;font-size:13px;color:#e0e0e0;cursor:pointer;box-shadow:0 0 2px rgba(0,0,0,.4);}
.title_spoiler a{color:#e0e0e0!important;text-decoration:none!important;}
.title_spoiler img{height:14px;width:auto;vertical-align:middle;margin:0 2px;}
.title_spoiler .attention{height:14px;width:14px;margin-left:4px;vertical-align:middle;}
.text_spoiler{display:none;background:#1c1c1c;border-left:3px solid #555;padding:6px 10px;margin:6px 0;font-size:14px;border-radius:4px;color:#dcdcdc;}
`;
    document.head.appendChild(styleEl);

    const Script = document.createElement("script");
    Script.innerHTML =
      "function ShowOrHide(id){var t=$('#'+id);t.prev('.title_spoiler').remove();t.css('display','inline');}";
    document.head.appendChild(Script);

    const modal = $(`
      <div>
        <div class="broadcast__text" style="text-align:left;">
          <div class="comment" style="margin-left:-15px;">${www}</div>
        </div>
      </div>
    `);

    const enabled = Lampa.Controller.enabled().name;

    Lampa.Modal.open({
      title: "",
      html: modal,
      size: "large",
      style: "margin-top:10px;",
      mask: !0,
      onBack: function () {
        Lampa.Modal.close();
        Lampa.Controller.toggle(enabled);
        $(".modal--large").remove();
        www = "";
      },
      onSelect: function () {},
    });
Lampa.Loading.stop();

    $(".modal__head").after(
      `${namemovie}<button class="selector" tabindex="0" style="float:right;" type="button" onclick="$('.modal--large').remove()" data-dismiss="modal">&times;</button>`
    );
  }

  function startPlugin() {
    window.comment_plugin = true;
    Lampa.Listener.follow("full", function (e) {
      if (e.type !== "complite") return;

      $(".button--comment").remove();
      $(".full-start-new__buttons").append(
        `<span>${Lampa.Lang.translate(
          "title_comments"
        )}</span></div>`
      );

      $(".button--comment").on("hover:enter", function () {
        year = 0;
        if (e.data.movie.release_date) {
          year = e.data.movie.release_date.slice(0, 4);
        } else if (e.data.movie.first_air_date) {
          year = e.data.movie.first_air_date.slice(0, 4);
        }
        getEnTitle(e.data.movie.id, e.object.method);
      });
    });
  }

  if (!window.comment_plugin) startPlugin();
})();
