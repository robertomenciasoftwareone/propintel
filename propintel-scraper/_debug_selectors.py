"""Debug script — inspect real DOM of Idealista and Fotocasa."""
import asyncio
import re
from playwright.async_api import async_playwright


async def debug_idealista():
    pw = await async_playwright().start()
    browser = await pw.chromium.launch(
        headless=True,
        args=["--no-sandbox", "--disable-blink-features=AutomationControlled"],
    )
    ctx = await browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        viewport={"width": 1366, "height": 768},
        locale="es-ES",
    )
    page = await ctx.new_page()
    await page.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>undefined})")

    url = "https://www.idealista.com/venta-viviendas/oviedo/"
    print(f"→ {url}")
    await page.goto(url, wait_until="domcontentloaded", timeout=30000)
    await asyncio.sleep(5)

    html = await page.content()
    with open("_debug_idealista.html", "w", encoding="utf-8") as f:
        f.write(html)

    print(f"Page title: {await page.title()}")
    print(f"HTML length: {len(html)}")
    print(f"CAPTCHA: {'captcha' in html.lower()}")
    print(f"Acepto cookies: {'acepto' in html.lower()}")

    # Check article patterns
    article_classes = re.findall(r'<article[^>]*class="([^"]+)"', html)
    print(f"Article classes (first 10): {article_classes[:10]}")

    # Try many selectors
    selectors = [
        "article.item",
        "article[data-adid]",
        "article",
        "div.item-info-container",
        "section.items-list",
        "div.listing-items",
        "main article",
        "[class*='listing']",
        "[class*='property']",
        "[class*='result']",
        "[class*='card']",
        "a[href*='/inmueble/']",
    ]
    for sel in selectors:
        items = await page.query_selector_all(sel)
        if items:
            print(f"  ✓ '{sel}': {len(items)} items")
        else:
            print(f"  ✗ '{sel}': 0")

    await browser.close()
    await pw.stop()


async def debug_fotocasa():
    pw = await async_playwright().start()
    browser = await pw.chromium.launch(
        headless=True,
        args=["--no-sandbox", "--disable-blink-features=AutomationControlled"],
    )
    ctx = await browser.new_context(
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        viewport={"width": 1366, "height": 768},
        locale="es-ES",
    )
    page = await ctx.new_page()
    await page.add_init_script("""
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        window.chrome = { runtime: {} };
    """)

    url = "https://www.fotocasa.es/es/comprar/viviendas/oviedo/todas-las-zonas/l"
    print(f"\n→ {url}")
    await page.goto(url, wait_until="domcontentloaded", timeout=35000)
    await asyncio.sleep(6)

    html = await page.content()
    with open("_debug_fotocasa.html", "w", encoding="utf-8") as f:
        f.write(html)

    print(f"Page title: {await page.title()}")
    print(f"HTML length: {len(html)}")
    print(f"Cloudflare/challenge: {'Just a moment' in html or 'challenge' in html.lower()}")

    article_classes = re.findall(r'<article[^>]*class="([^"]+)"', html)
    print(f"Article classes (first 10): {article_classes[:10]}")

    selectors = [
        "article[data-testid]",
        "article[class*='re-Card']",
        "li[class*='re-SearchResult']",
        "article",
        "[class*='CardPrice']",
        "[class*='re-Card']",
        "a[href*='/comprar/']",
        "a[href*='/inmueble/']",
        "[class*='listing']",
        "[class*='property']",
    ]
    for sel in selectors:
        items = await page.query_selector_all(sel)
        if items:
            print(f"  ✓ '{sel}': {len(items)} items")
        else:
            print(f"  ✗ '{sel}': 0")

    await browser.close()
    await pw.stop()


async def main():
    print("=" * 60)
    print("IDEALISTA DEBUG")
    print("=" * 60)
    await debug_idealista()

    print("\n" + "=" * 60)
    print("FOTOCASA DEBUG")
    print("=" * 60)
    await debug_fotocasa()


if __name__ == "__main__":
    asyncio.run(main())
