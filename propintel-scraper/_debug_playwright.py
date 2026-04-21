"""
Debug script: intercept ALL network requests and simulate a search
"""
import asyncio
from playwright.async_api import async_playwright

async def main():
    all_calls = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0"
        )
        page = await ctx.new_page()

        async def on_response(response):
            url = response.url
            ct = response.headers.get('content-type', '')
            if 'json' in ct:
                try:
                    body = await response.text()
                    all_calls.append(f"\nJSON {url}\n  {body[:400]}")
                except:
                    pass
            elif any(k in url for k in ['api', 'precio', 'municipio', 'stat']):
                all_calls.append(f"URL: {url} [{ct[:30]}]")

        page.on("response", on_response)

        print("Loading buscador...")
        await page.goto("https://penotariado.com/inmobiliario/buscador-precio-vivienda",
                        wait_until="networkidle", timeout=40000)
        await page.wait_for_timeout(5000)

        # Try evaluating in the browser to find inputs
        all_inputs = await page.evaluate("""
            () => {
                const inputs = document.querySelectorAll('input, [contenteditable], [role="searchbox"], [role="combobox"]');
                return Array.from(inputs).map(el => ({tag: el.tagName, type: el.type, ph: el.placeholder, cls: el.className.substring(0, 50), id: el.id}));
            }
        """)
        print("Inputs via evaluate:", all_inputs)

        # Print full rendered body text
        body_text = await page.evaluate("() => document.body.innerText.substring(0, 2000)")
        print("\nBody text:", body_text)

        # Look for any text input
        inputs = await page.query_selector_all("input, [role='combobox'], [role='searchbox']")
        print(f"Inputs found: {len(inputs)}")
        for i, inp in enumerate(inputs):
            ph = await inp.evaluate("el => el.placeholder || el.getAttribute('aria-label') || el.className")
            print(f"  [{i}] {ph}")

        # Try clicking first input and typing
        if inputs:
            await inputs[0].click()
            await inputs[0].type("Oviedo", delay=100)
            await page.wait_for_timeout(2000)

            # Look for autocomplete suggestions
            items = await page.query_selector_all("[role='option'], li, .suggestion, .autocomplete-item")
            print(f"\nSuggestions: {len(items)}")
            for item in items[:5]:
                print(" ", await item.inner_text())

        print("\n--- JSON API calls ---")
        for c in all_calls:
            print(c)

        await page.screenshot(path="_debug_screenshot.png")
        print("\nScreenshot saved")
        await browser.close()

asyncio.run(main())
