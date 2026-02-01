from playwright.sync_api import sync_playwright
import re
import json
from pathlib import Path
from datetime import datetime
from zoneinfo import ZoneInfo


URL = "https://www.cimbclicks.com.sg/sgd-to-myr"

# JSON 文件路径
# DATA_FILE = Path("data/rates.json")
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = PROJECT_ROOT / "data" / "rates.json"


def save_rate_to_json(rate: float):
    now = datetime.now(ZoneInfo("Asia/Kuala_Lumpur")) #修改成马来西亚时间

    year = now.strftime("%Y")
    month = now.strftime("%m")
    day = now.strftime("%d")
    time_str = now.strftime("%H:%M")

    # 如果 JSON 不存在，初始化结构
    if DATA_FILE.exists():
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = {
            "base_currency": "MYR",
            "currency": "SGD",
            "data": {}
        }

    # 确保层级存在
    data["data"].setdefault(year, {})
    data["data"][year].setdefault(month, {})
    data["data"][year][month].setdefault(day, [])

    # 追加 15 分钟数据
    data["data"][year][month][day].append({
        "time": time_str,
        "rate": rate
    })

    # 创建目录
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)

    # 写回 JSON
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"✅ 已写入 JSON：{year}-{month}-{day} {time_str} → {rate}")

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

            # ⭐ 写入 JSON
            save_rate_to_json(rate)

        else:
            print("❌ 抓不到汇率")
            save_rate_to_json('N/A')

        browser.close()

if __name__ == "__main__":
    main()
