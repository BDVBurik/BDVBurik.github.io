{const c="https://api.themoviedb.org/3/",o="https://worker-patient-dream-26d7.bdvburik.workers.dev/",d="?language=en-US&api_key=4ef0d7355d9ffb5151e987764708ce96";let t,n,i,l;async function s(e,t,a){e=await fetch(o+e+(t||"")+(a?"+"+a:""),{method:"GET",headers:{"Content-Type":"text/html"}}).then(e=>e.text());return(new DOMParser).parseFromString(e,"text/html")}async function r(e,t){let a=await s("https://hdrezka.ag/search/?do=search&subaction=search&q=",e,t);e=Array.from(a.getElementsByClassName("b-content__inline_item-link"));l=e[0].children[0].href,a=await s(l,"",""),async function(e){n="";let a,t=(e.filter((e,t)=>{e.className.includes("current")&&(a=t)}),e.forEach((e,t)=>{n+='<div id="stringhide" class="'+e.className,a+2>=t&&t>=a-2?n+=" show":n+=" hide hdhd",n+=` "><span  class="${e.children[0].className}">
      ${e.children[0].innerText}</span><span class="${e.children[1].className}">${e.children[1].innerText}
  </span><span class="${e.children[2].className}">${e.children[2].innerText}
  </span><span class="${e.children[3].className}" ><i class="hd-tooltip tooltipstered" >${e.children[3].innerText}</i> </span>
</div>`}),$(`<div id ="collect" class="collection selector" style='display: table;width: 100%;'>`+n+"</div>")),i=($(".collection").remove(),$(".full-descr__text").after(t),1);$(".collection").on("hover:enter",function(){i,i?(i=0,$(".hdhd").removeClass("hide")):(i=1,$(".hdhd").addClass("hide"))})}(Array.from(a.getElementsByClassName("b-post__partcontent_item")))}async function a(e,t){let a;!async function(e){let t;await fetch(e).then(e=>e.json()).then(e=>t=e.title||e.name),r(t.toLowerCase().replace(/[\-\u2010-\u2015\u2E3A\u2E3B\uFE58\uFE63\uFF0D]+/g,"-").replace(/ё/g,"е").replace(/[\s.,:;’'`!?]+/g,"%20").trim(),i)}(a="movie"===t?o+c+"movie/"+e+d:o+c+"tv/"+e+d)}window.rezkacoll_plugin||(window.rezkacoll_plugin=!0,Lampa.Listener.follow("full",function(e){"complite"==e.type&&(i=e.data.movie.release_date?e.data.movie.release_date.slice(0,4):e.data.movie.first_air?e.data.movie.first_air.slice(0,4):"",t=e.data.movie.title||e.data.movie.name,a(e.data.movie.id,e.object.method),(e=document.createElement("style")).setAttribute("type","text/css"),e.innerHTML=`
.td {
  display: table-cell;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.5);
  padding: 0 10px;
}

.collection {
  display: table;
  width:90%;
}
.collection.focus{
outline : outset  #FFF;
}

.rating {
  text-align: center;
  width: 4em;
}
.year {
  width: 8em;
  text-align: right;
}
.title {
  text-align: left;
}
.num {
  text-align: center;
  width: 3em;
}
.b-post__partcontent_item {
  display: table-row;
  width: 90%;
}
.current {
   background-color: #ffffff1f;
}
.show {
  visibility: visible;
}
.hide {
  visibility: hidden;
 
}


`,document.head.appendChild(e))}))}