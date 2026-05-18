import json
import base64
import re
import requests
import time
import random

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException
from webdriver_manager.chrome import ChromeDriverManager


BASE_URL = "https://hdrezka-home.tv/franchises/page/{}/"

RAW_FILE = "franchises_full.json"
EXPORT_FILE = "lampa_export.json"

TMDB_API_KEY = "ae4bd1b6fce2a5648671bfc171d15ba4"

request_counter = 0


# =========================
# delay
# =========================
def human_delay(a=1, b=3):
    time.sleep(random.uniform(a, b))


def cooldown():
    global request_counter
    request_counter += 1

    if request_counter % 25 == 0:
        time.sleep(random.uniform(20, 50))

    if request_counter % 300 == 0:
        time.sleep(random.uniform(300, 600))


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
# driver
# =========================
def create_driver():
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    options.add_argument(
        f"user-agent=Mozilla/5.0 Chrome/{random.randint(120,125)}.0.0.0"
    )

    return webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options
    )


# =========================
# wait
# =========================
def wait_for(driver, selector):
    return WebDriverWait(driver, 15).until(
        EC.presence_of_all_elements_located((By.CSS_SELECTOR, selector))
    )


# =========================
# safe load
# =========================
def safe_get(driver, url):
    for _ in range(3):
        try:
            driver.get(url)
            WebDriverWait(driver, 15).until(
                lambda d: d.execute_script("return document.readyState") == "complete"
            )
            human_delay()
            cooldown()
            return True
        except:
            time.sleep(10)

    return False


# =========================
# franchises
# =========================
def get_franchises(driver, page):
    if not safe_get(driver, BASE_URL.format(page)):
        return []

    try:
        items = wait_for(driver, ".b-content__collections_item")
    except TimeoutException:
        return []

    data = []

    for item in items:
        try:
            a = item.find_element(By.CSS_SELECTOR, "a.title")

            data.append({
                "title": a.text.strip(),
                "url": a.get_attribute("href"),
                "parts": item.find_element(By.CSS_SELECTOR, ".num").text.strip(),
                "movies": []
            })

        except:
            continue

    return data


# =========================
# movies
# =========================
def parse_movies(driver, url):
    if not safe_get(driver, url):
        return []

    try:
        wait_for(driver, ".b-post__partcontent_item")
    except TimeoutException:
        return []

    items = driver.find_elements(By.CSS_SELECTOR, ".b-post__partcontent_item")

    movies = []

    for item in items:
        try:
            link = item.find_element(By.CSS_SELECTOR, ".td.title a")

            movies.append({
                "title": link.text.strip(),
                "url": link.get_attribute("href")
            })

        except:
            continue

    return movies


# =========================
# tmdb
# =========================
def get_tmdb_data(imdb_id):
    if not imdb_id:
        return None

    try:
        r = requests.get(
            f"https://api.themoviedb.org/3/find/{imdb_id}",
            params={
                "api_key": TMDB_API_KEY,
                "external_source": "imdb_id"
            },
            timeout=10
        )

        data = r.json()

        if data.get("movie_results"):
            return {
                "id": data["movie_results"][0]["id"],
                "type": "movie"
            }

        if data.get("tv_results"):
            return {
                "id": data["tv_results"][0]["id"],
                "type": "tv"
            }

    except:
        pass

    return None


# =========================
# details
# =========================
def parse_movie_details(driver, url):
    if not safe_get(driver, url):
        return {}

    result = {}

    try:
        imdb_block = driver.find_elements(
            By.CSS_SELECTOR,
            ".b-post__info_rates.imdb"
        )

        if imdb_block:
            help_url = imdb_block[0].find_element(By.TAG_NAME, "a").get_attribute("href")

            imdb_id = decode_imdb_id(help_url)

            result["imdb_id"] = imdb_id

            tmdb = get_tmdb_data(imdb_id)

            if tmdb:
                result["tmdb_id"] = tmdb["id"]
                result["media_type"] = tmdb["type"]

    except:
        pass

    return result


# =========================
# EXPORT FOR LAMPA
# =========================
def export_lampa(data):
    out = []

    for fr in data:
        fr_out = {
            "tf": fr.get("title"),
            "p": fr.get("parts"),
            "m": []
        }

        for mv in fr.get("movies", []):
            fr_out["m"].append({
                "t": mv.get("title"),
                "i_id": mv.get("imdb_id"),
                "t_id": mv.get("tmdb_id")
            })

        out.append(fr_out)

    return out


def save_export(data):
    with open(EXPORT_FILE, "w", encoding="utf-8") as f:
        json.dump(export_lampa(data), f, ensure_ascii=False, indent=2)


# =========================
# SAVE RAW
# =========================
def save_raw(data):
    with open(RAW_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# =========================
# MAIN
# =========================
def main():
    driver = create_driver()

    try:
        try:
            with open(RAW_FILE, "r", encoding="utf-8") as f:
                all_franchises = json.load(f)
        except:
            all_franchises = []

        if not all_franchises:
            for page in range(1, 110):
                print(f"PAGE {page}")
                fr = get_franchises(driver, page)

                if not fr:
                    break

                all_franchises.extend(fr)
                save_raw(all_franchises)

        for i, fr in enumerate(all_franchises, 1):
            print(f"[{i}] {fr['title']}")

            if not fr.get("movies"):
                fr["movies"] = parse_movies(driver, fr["url"])
                save_raw(all_franchises)

            for mv in fr["movies"]:

                if mv.get("imdb_id"):
                    continue

                print(" ->", mv.get("url"))

                mv.update(parse_movie_details(driver, mv["url"]))
                save_raw(all_franchises)

                # export обновляется всегда
                save_export(all_franchises)

        print("DONE")

    finally:
        driver.quit()


if __name__ == "__main__":
    main()