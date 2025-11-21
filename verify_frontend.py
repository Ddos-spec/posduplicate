from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    try:
        page.goto("http://localhost:5173/login")
        page.wait_for_load_state("networkidle")

        # Take a screenshot of the initial login page
        page.screenshot(path="frontend_login.png")
        print("Screenshot saved to frontend_login.png")

        # Fill in credentials to simulate attempting login
        # We can't actually login because the backend isn't fully running/connected in this isolated test
        # But we can check if the UI elements are present
        page.fill('input[type="email"]', "test@example.com")
        page.fill('input[type="password"]', "password")

        page.screenshot(path="frontend_login_filled.png")
        print("Screenshot saved to frontend_login_filled.png")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
