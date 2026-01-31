# from playwright.sync_api import sync_playwright
# import re

# URL = "https://www.cimbclicks.com.sg/sgd-to-myr"

# def main():
#     with sync_playwright() as p:
#         browser = p.chromium.launch(headless=True)  # True = 不显示浏览器
#         # browser = p.chromium.launch(headless=False, slow_mo=500) # False = 显示浏览器
#         page = browser.new_page()

#         page.goto(URL, timeout=60000)

#         # ✅ 关键：等 id=rateStr 出现
#         page.wait_for_selector("#rateStr", timeout=60000)

#         # ✅ 直接抓这个 label 的文字
#         rate_text = page.locator("#rateStr").text_content()

#         print("原始文字：", rate_text)

#         # ✅ 只抓数字
#         match = re.search(r"MYR\s*([\d.]+)", rate_text)
#         if match:
#             rate = match.group(1)
#             print("✅ SGD → MYR 汇率 =", rate)
#         else:
#             print("❌ 抓不到数字")

#         browser.close()

# if __name__ == "__main__":
#     main()



from playwright.sync_api import sync_playwright
import re

URL = "https://www.cimbclicks.com.sg/sgd-to-myr"

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

        # 等网络空闲，而不是等 selector
        page.wait_for_load_state("networkidle")

        # 给一点“人类思考时间”
        page.wait_for_timeout(3000)

        # 再抓元素
        rate_text = page.locator("#rateStr").text_content(timeout=30000)

        print("原始文字：", rate_text)

        match = re.search(r"MYR\s*([\d.]+)", rate_text)
        if match:
            print("✅ SGD → MYR =", match.group(1))
        else:
            print("❌ 抓不到汇率")

        browser.close()

if __name__ == "__main__":
    main()
