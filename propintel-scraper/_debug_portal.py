import asyncio
import httpx
import re

async def main():
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0"}
    async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=20) as c:
        r = await c.get("https://penotariado.com/inmobiliario/buscador-precio-vivienda")
        print("Status:", r.status_code, "URL:", str(r.url))
        txt = r.text

        chunks = re.findall(r'/_next/static/chunks/[^"\']+\.js', txt)
        print("\nJS chunks:", chunks[:6])

        apis = re.findall(r'["\'](/(?:inmobiliario/)?api[/a-zA-Z0-9_\-?=&]{3,80})["\']', txt)
        print("\nAPI paths in HTML:", apis[:15])

        # Print raw HTML snippet around 'api' occurrences
        for m in re.finditer(r'.{60}api.{60}', txt, re.IGNORECASE):
            snippet = m.group()
            if 'script' not in snippet.lower():
                print("  >>", snippet)

asyncio.run(main())
