import json
import time
import random
import re
import base64
import requests
from bs4 import BeautifulSoup

BASE_URL = "https://hdrezka-home.tv/franchises/page/{}/"
RAW_FILE = "franchises_full.json"
EXPORT_FILE = "lampa_export.json"

TMDB_API_KEY = "ae4bd1b6fce2a5648671bfc171d15ba4"

session = requests.Session()


# =========================
# delay / anti-ban
# =========================
def delay(a=1, b=3):
    time.sleep(random.uniform(a, b))


# =========================
# request helper
# =========================
def get(url):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
        "Accept-Language": "en-US,en;q=0.9",
    }

    for _ in range(3):
        try:
            r = session.get(url, headers=headers, timeout=15)
            if r.status_code == 200:
                delay()
                return r.text
        except:
            time.sleep(5)

    return None


# =========================
# imdb decode
# =========================
def decode_imdb_id(help_url):
    try:
        encoded = help_url.split("/help/")[1].strip("/")
        decoded = base64.b64decode(encoded).decode("utf-8")
        return re.search(r"tt\d+", decoded).group(0)
    except:
        return None


# =========================
# franchises list
# =========================
def get_franchises(page):
    html = get(BASE_URL.format(page))
    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")

    items = soup.select(".b-content__collections_item")

    data = []

    for item in items:
        a = item.select_one("a.title")
        if not a:
            continue

        num = item.select_one(".num")

        data.append(
            {
                "title": a.text.strip(),
                "url": a["href"],
                "parts": num.text.strip() if num else "",
                "movies": [],
            }
        )

    return data


# =========================
# movies list
# =========================
def parse_movies(url):
    html = get(url)
    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")

    items = soup.select(".b-post__partcontent_item")

    movies = []

    for item in items:
        a = item.select_one(".td.title a")
        if not a:
            continue

        movies.append({"title": a.text.strip(), "url": a["href"]})

    return movies


# =========================
# TMDB
# =========================
def tmdb(imdb_id):
    if not imdb_id:
        return None

    url = f"https://api.themoviedb.org/3/find/{imdb_id}"

    try:
        r = session.get(
            url,
            params={"api_key": TMDB_API_KEY, "external_source": "imdb_id"},
            timeout=10,
        )

        data = r.json()

        if data.get("movie_results"):
            return {"id": data["movie_results"][0]["id"], "type": "movie"}

        if data.get("tv_results"):
            return {"id": data["tv_results"][0]["id"], "type": "tv"}

    except:
        pass

    return None


# =========================
# movie details
# =========================
def parse_movie_details(url):
    html = get(url)
    if not html:
        return {}

    soup = BeautifulSoup(html, "html.parser")

    result = {}

    imdb_block = soup.select_one(".b-post__info_rates.imdb")

    if imdb_block:
        a = imdb_block.select_one("a")

        if a:
            imdb_id = decode_imdb_id(a["href"])

            result["imdb_id"] = imdb_id

            t = tmdb(imdb_id)

            if t:
                result["tmdb_id"] = t["id"]
                result["media_type"] = t["type"]

    return result


# =========================
# export
# =========================
def export_lampa(data):
    out = []

    for fr in data:
        fr_out = {"tf": fr["title"], "p": fr.get("parts", ""), "m": []}

        for mv in fr.get("movies", []):
            fr_out["m"].append(
                {
                    "t": mv.get("title"),
                    "t_id": mv.get("tmdb_id"),
                    "i_id": mv.get("imdb_id"),
                    "type": mv.get("media_type"),
                }
            )

        out.append(fr_out)

    return out


# =========================
# save
# =========================
def save(file, data):
    with open(file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# =========================
# MAIN
# =========================
def main():

    try:
        all_fr = json.load(open(RAW_FILE, "r", encoding="utf-8"))
    except:
        all_fr = []

    if not all_fr:
        for page in range(1, 110):
            print("PAGE", page)

            fr = get_franchises(page)
            if not fr:
                break

            all_fr.extend(fr)
            save(RAW_FILE, all_fr)

    for i, fr in enumerate(all_fr, 1):
        print(i, fr["title"])

        if not fr.get("movies"):
            fr["movies"] = parse_movies(fr["url"])
            save(RAW_FILE, all_fr)

        for mv in fr["movies"]:
            if mv.get("imdb_id"):
                continue

            print(" ->", mv["url"])

            mv.update(parse_movie_details(mv["url"]))

            save(RAW_FILE, all_fr)
            save(EXPORT_FILE, export_lampa(all_fr))

    print("DONE")


if __name__ == "__main__":
    main()
