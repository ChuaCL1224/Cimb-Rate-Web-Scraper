from playwright.sync_api import sync_playwright
import re
import json
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo


URL = "https://www.cimbclicks.com.sg/sgd-to-myr"

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
INDEX_FILE = DATA_DIR / "index.json"


def load_index() -> dict:
    """Load index.json, or create a fresh one if it doesn't exist."""
    if INDEX_FILE.exists():
        with open(INDEX_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {
        "base_currency": "MYR",
        "currency": "SGD",
        "years": {}
    }


def save_index(index: dict):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)


def load_month_file(year: str, month: str) -> dict:
    """Load the monthly data file, or return empty dict if it doesn't exist."""
    path = DATA_DIR / f"{year}-{month}.json"
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_month_file(year: str, month: str, month_data: dict):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    path = DATA_DIR / f"{year}-{month}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(month_data, f, ensure_ascii=False, indent=2)


def save_rate(rate):
    now = datetime.now(ZoneInfo("Asia/Kuala_Lumpur"))
    year  = now.strftime("%Y")
    month = now.strftime("%m")
    day   = now.strftime("%d")
    time_str = now.strftime("%H:%M")

    # ── Update index.json ────────────────────────────────────────────────────
    index = load_index()
    months_list = index["years"].setdefault(year, [])
    if month not in months_list:
        months_list.append(month)
        months_list.sort()
    save_index(index)

    # ── Update monthly file ──────────────────────────────────────────────────
    month_data = load_month_file(year, month)
    month_data.setdefault(day, [])
    month_data[day].append({
        "time": time_str,
        "rate": rate
    })
    save_month_file(year, month, month_data)

    print(f"✅ 已写入：{year}-{month}-{day} {time_str} → {rate}")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
                "--disable-dev-shm-usage"
            ]
        )

        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1366, "height": 768},
            locale="en-SG",
            timezone_id="Asia/Singapore"
        )

        page = context.new_page()
        page.goto(URL, timeout=60000)
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(3000)

        rate_text = page.locator("#rateStr").text_content(timeout=30000)
        print("原始文字：", rate_text)

        match = re.search(r"MYR\s*([\d.]+)", rate_text)
        if match:
            rate = float(match.group(1))
            print("✅ SGD → MYR =", rate)
            save_rate(rate)
        else:
            print("❌ 抓不到汇率")
            save_rate("N/A")

        browser.close()


if __name__ == "__main__":
    main()
