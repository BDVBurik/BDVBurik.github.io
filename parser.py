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
OUTPUT_FILE = "franchises_full.json"
TMDB_API_KEY = "ae4bd1b6fce2a5648671bfc171d15ba4"
PLUGIN_FILE = "franchises_plugin.json"
request_counter = 0


# =========================
# Delay / cooldown
# =========================
def human_delay(a=1, b=3):
    time.sleep(random.uniform(a, b))


def cooldown():
    global request_counter
    request_counter += 1

    if request_counter % 25 == 0:
        pause = random.uniform(20, 50)
        print(f"Cooling down {pause:.1f}s")
        time.sleep(pause)

    if request_counter % 300 == 0:
        pause = random.uniform(300, 600)
        print(f"Long cooldown {pause/60:.1f} min")
        time.sleep(pause)


# =========================
# IMDb decode
# =========================
def decode_imdb_id(help_url):
    try:
        encoded = help_url.split("/help/")[1].strip("/")
        decoded = base64.b64decode(encoded).decode("utf-8")
        match = re.search(r"tt\d+", decoded)
        return match.group(0)
    except:
        return None


# =========================
# Driver
# =========================
def create_driver():
    options = Options()

    options.add_argument("--headless=new")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    options.add_argument(
        f"user-agent=Mozilla/5.0 "
        f"Chrome/{random.randint(120,125)}.0.0.0"
    )

    return webdriver.Chrome(
        service=Service(ChromeDriverManager().install()),
        options=options
    )


# =========================
# Wait
# =========================
def wait_for(driver, selector, timeout=15):
    return WebDriverWait(driver, timeout).until(
        EC.presence_of_all_elements_located(
            (By.CSS_SELECTOR, selector)
        )
    )


# =========================
# Safe GET
# =========================
def safe_get(driver, url, retries=3):
    for attempt in range(retries):
        try:
            driver.get(url)

            WebDriverWait(driver, 15).until(
                lambda d: d.execute_script(
                    "return document.readyState"
                ) == "complete"
            )

            human_delay()
            cooldown()
            return True

        except:
            print(f"Retry {attempt+1}/{retries}: {url}")
            time.sleep(10)

    return False


# =========================
# Compact JSON
# =========================

def compact_plugin_data(data):
    compact = []

    for fr in data:
        compact_fr = {"title": fr.get("title"), "parts": fr.get("parts"), "movies": []}

        for mv in fr.get("movies", []):
            if mv.get("tmdb_id"):
                compact_mv = {"tmdb_id": mv.get("tmdb_id")}

                if mv.get("media_type"):
                    compact_mv["media_type"] = mv["media_type"]

                compact_fr["movies"].append(compact_mv)

        compact.append(compact_fr)

    return compact


def compact_data(data):
    compact = []

    for fr in data:
        compact_fr = {
            "title": fr.get("title"),
            "url": fr.get("url"),
            "parts": fr.get("parts"),
            "movies": []
        }

        for mv in fr.get("movies", []):
            compact_mv = {
                "title": mv.get("title"),
                "url": mv.get("url"),
                
                "imdb_id": mv.get("imdb_id"),
                "tmdb_id": mv.get("tmdb_id")
            }

            if mv.get("media_type"):
                compact_mv["media_type"] = mv["media_type"]

            compact_fr["movies"].append(compact_mv)

        compact.append(compact_fr)

    return compact


def save(data):
    # full checkpoint
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # lightweight plugin file
    with open(PLUGIN_FILE, "w", encoding="utf-8") as f:
        json.dump(compact_plugin_data(data), f, ensure_ascii=False, indent=2)


# =========================
# Franchises
# =========================
def get_franchises(driver, page):
    if not safe_get(driver, BASE_URL.format(page)):
        return []

    try:
        items = wait_for(driver, ".b-content__collections_item")
    except TimeoutException:
        return []

    result = []

    for item in items:
        try:
            title_el = item.find_element(
                By.CSS_SELECTOR,
                "a.title"
            )

            result.append({
                "title": title_el.text.strip(),
                "url": title_el.get_attribute("href"),
                "parts": item.find_element(
                    By.CSS_SELECTOR,
                    ".num"
                ).text.strip(),
                "movies": []
            })

        except:
            continue

    return result


# =========================
# Parse movies
# =========================
def parse_movies(driver, franchise_url):
    if not safe_get(driver, franchise_url):
        return []

    try:
        wait_for(driver, ".b-post__partcontent_item")
    except TimeoutException:
        return []

    items = driver.find_elements(
        By.CSS_SELECTOR,
        ".b-post__partcontent_item"
    )

    movies = []

    for item in items:
        try:
            link = item.find_element(
                By.CSS_SELECTOR,
                ".td.title a"
            )

            movies.append({
                "title": link.text.strip(),
                "url": link.get_attribute("href"),
                "year": item.find_element(
                    By.CSS_SELECTOR,
                    ".td.year"
                ).text.strip()
            })

        except:
            continue

    return movies


# =========================
# TMDB lookup
# =========================
def get_tmdb_data(imdb_id):
    if not imdb_id:
        return None

    try:
        url = f"https://api.themoviedb.org/3/find/{imdb_id}"

        r = requests.get(
            url,
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
# Movie details
# =========================
def parse_movie_details(driver, url):
    if not safe_get(driver, url):
        return {}

    result = {}

    try:
        imdb_elements = driver.find_elements(
            By.CSS_SELECTOR,
            ".b-post__info_rates.imdb"
        )

        if imdb_elements:
            imdb_block = imdb_elements[0]

            help_url = imdb_block.find_element(
                By.TAG_NAME,
                "a"
            ).get_attribute("href")

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
# Main
# =========================
def main():
    driver = create_driver()

    try:
        try:
            with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
                all_franchises = json.load(f)

            all_franchises = compact_data(all_franchises)
            save(all_franchises)

            print(
                f"Loaded checkpoint: "
                f"{len(all_franchises)} franchises"
            )

        except:
            all_franchises = []

        # collect franchises
        if not all_franchises:
            for page in range(1, 110):
                print(f"\nPAGE {page}/109")

                franchises = get_franchises(driver, page)

                if not franchises:
                    break

                all_franchises.extend(franchises)
                save(all_franchises)

        print(
            f"\nTotal franchises: "
            f"{len(all_franchises)}"
        )

        # continue parsing
        for i, fr in enumerate(all_franchises, 1):
            print(f"\n[{i}] {fr['title']}")

            if not fr.get("movies"):
                fr["movies"] = parse_movies(
                    driver,
                    fr["url"]
                )
                save(all_franchises)

            for j, mv in enumerate(fr["movies"], 1):

                if mv.get("imdb_id"):
                    continue

                print(
                    f"   -> {j}/{len(fr['movies'])} "
                    f"{mv['title']}"
                )

                mv.update(
                    parse_movie_details(
                        driver,
                        mv["url"]
                    )
                )

                save(all_franchises)

        print(f"\nDONE -> {OUTPUT_FILE}")

    finally:
        driver.quit()


if __name__ == "__main__":
    main()
