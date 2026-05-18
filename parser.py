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

request_counter = 0


# =========================
# Human-like delay
# =========================
def human_delay(a=2, b=5):
    time.sleep(random.uniform(a, b))


def cooldown():
    global request_counter
    request_counter += 1

    if request_counter % 25 == 0:
        pause = random.uniform(25, 60)
        print(f"\nCooling down {pause:.1f}s...")
        time.sleep(pause)

    if request_counter % 300 == 0:
        pause = random.uniform(300, 600)
        print(f"\nLong cooldown {pause/60:.1f} min...")
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
        f"user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        f"AppleWebKit/537.36 (KHTML, like Gecko) "
        f"Chrome/{random.randint(120, 125)}.0.0.0 Safari/537.36"
    )

    return webdriver.Chrome(
        service=Service(ChromeDriverManager().install()), options=options
    )


# =========================
# Wait
# =========================
def wait_for(driver, selector, timeout=15):
    return WebDriverWait(driver, timeout).until(
        EC.presence_of_all_elements_located((By.CSS_SELECTOR, selector))
    )


# =========================
# Safe page load
# =========================
def safe_get(driver, url, retries=3):
    for attempt in range(retries):
        try:
            driver.get(url)

            # human_delay(2, 6)

            WebDriverWait(driver, 15).until(
                lambda d: d.execute_script("return document.readyState") == "complete"
            )

            # cooldown()
            return True

        except:
            print(f"Retry {attempt+1}/{retries}: {url}")
            # human_delay(10, 20)

    return False


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

    data = []

    for item in items:
        try:
            title_el = item.find_element(By.CSS_SELECTOR, "a.title")

            data.append(
                {
                    "title": title_el.text.strip(),
                    "url": title_el.get_attribute("href"),
                    "poster": item.find_element(
                        By.CSS_SELECTOR, "img.cover"
                    ).get_attribute("src"),
                    "parts": item.find_element(By.CSS_SELECTOR, ".num").text.strip(),
                    "movies": [],
                }
            )

        except:
            continue

    return data


# =========================
# Movies
# =========================
def parse_movies(driver, franchise_url):
    if not safe_get(driver, franchise_url):
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

            movies.append(
                {
                    "title": link.text.strip(),
                    "url": link.get_attribute("href"),
                    "year": item.find_element(By.CSS_SELECTOR, ".td.year").text.strip(),
                    "rating": item.find_element(
                        By.CSS_SELECTOR, ".td.rating"
                    ).text.strip(),
                }
            )

        except:
            continue

    return movies


# =========================
# TMDB
# =========================
def get_tmdb_id(imdb_id):
    if not imdb_id:
        return None

    try:
        # human_delay(0.5, 1.5)

        url = f"https://api.themoviedb.org/3/find/{imdb_id}"

        params = {"api_key": TMDB_API_KEY, "external_source": "imdb_id"}

        r = requests.get(url, params=params, timeout=10)
        data = r.json()

        if data.get("movie_results"):
            return data["movie_results"][0].get("id")

        if data.get("tv_results"):
            return data["tv_results"][0].get("id")

        return None

    except:
        return None


# =========================
# Details
# =========================
def parse_movie_details(driver, url):
    if not safe_get(driver, url):
        return {"imdb_id": None, "tmdb_id": None, "imdb_rating": None, "info": {}}

    result = {"imdb_id": None, "tmdb_id": None, "imdb_rating": None, "info": {}}

    try:
        imdb_elements = driver.find_elements(
            By.CSS_SELECTOR, ".b-post__info_rates.imdb"
        )

        if imdb_elements:
            imdb_block = imdb_elements[0]

            try:
                help_url = imdb_block.find_element(By.TAG_NAME, "a").get_attribute(
                    "href"
                )

                imdb_id = decode_imdb_id(help_url)

                result["imdb_id"] = imdb_id

                try:
                    result["imdb_rating"] = imdb_block.find_element(
                        By.CLASS_NAME, "bold"
                    ).text.strip()
                except:
                    pass

                result["tmdb_id"] = get_tmdb_id(imdb_id)

            except:
                pass
    except:
        pass

    try:
        rows = driver.find_elements(By.CSS_SELECTOR, ".b-post__info tr")

        for row in rows:
            try:
                key = row.find_element(By.CSS_SELECTOR, "td.l h2").text.strip()
                value = row.find_elements(By.CSS_SELECTOR, "td")[1].text.strip()
                result["info"][key] = value
            except:
                continue
    except:
        pass

    return result


# =========================
# Save
# =========================
def save(data):
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


# =========================
# Main
# =========================
def main():
    driver = create_driver()

    # =========================
    # Load existing checkpoint
    # =========================
    try:
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            all_franchises = json.load(f)
        print(f"Loaded checkpoint: {len(all_franchises)} franchises")
    except:
        all_franchises = []

    try:
        # если файла нет — собираем франшизы
        if not all_franchises:
            for page in range(1, 110):
                print(f"\n=== PAGE {page}/109 ===")

                franchises = get_franchises(driver, page)

                if not franchises:
                    break

                all_franchises.extend(franchises)
                save(all_franchises)

            print(f"\nCollected: {len(all_franchises)} franchises")

        # =========================
        # Continue parsing
        # =========================
        for i, fr in enumerate(all_franchises, 1):
            print(f"\n[{i}/{len(all_franchises)}] {fr['title']}")

            # если фильмы ещё не собраны
            if not fr.get("movies"):
                fr["movies"] = parse_movies(driver, fr["url"])
                save(all_franchises)

            movies = fr["movies"]

            for j, mv in enumerate(movies, 1):

                # уже обработан
                if "imdb_id" in mv:
                    continue

                print(f"   -> {j}/{len(movies)} {mv['title']}")

                details = parse_movie_details(driver, mv["url"])
                mv.update(details)

                save(all_franchises)

        print(f"\nDONE -> {OUTPUT_FILE}")

    finally:
        driver.quit()


if __name__ == "__main__":
    main()
