import httpx, json, asyncio, re

async def test():
    async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0"}) as client:

        print("=== INE SERIES IPV (op 15) ===")
        r = await client.get("https://servicios.ine.es/wstempus/js/ES/SERIES_OPERACION/15?det=2")
        print("Status:", r.status_code, "| Len:", len(r.text))
        if r.status_code == 200 and r.text.strip():
            series = r.json()
            print("Total series:", len(series))
            for s in series[:10]:
                print("  Id=" + str(s.get("Id")) + " COD=" + str(s.get("COD")) + " Nombre=" + str(s.get("Nombre")))

        print()
        print("=== INE SERIES HIPOTECAS (op 40) ===")
        r2 = await client.get("https://servicios.ine.es/wstempus/js/ES/SERIES_OPERACION/40?det=2")
        print("Status:", r2.status_code, "| Len:", len(r2.text))
        if r2.status_code == 200 and r2.text.strip():
            series2 = r2.json()
            print("Total series:", len(series2))
            for s in series2[:15]:
                print("  Id=" + str(s.get("Id")) + " COD=" + str(s.get("COD")) + " Nombre=" + str(s.get("Nombre")))

        print()
        print("=== INE DATOS una serie IPV (primera de la lista) ===")
        r3 = await client.get("https://servicios.ine.es/wstempus/js/ES/SERIES_OPERACION/15?det=1&nult=0")
        if r3.status_code == 200 and r3.text.strip():
            series3 = r3.json()
            if series3:
                cod = series3[0].get("COD") or series3[0].get("Cod")
                print("Using series COD:", cod)
                url4 = "https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/" + str(cod) + "?nult=8"
                r4 = await client.get(url4)
                print("Status:", r4.status_code, "| Len:", len(r4.text))
                if r4.status_code == 200 and r4.text.strip():
                    d4 = r4.json()
                    print("Keys:", list(d4.keys()))
                    data = d4.get("Data", [])
                    print("Data points:", len(data))
                    if data:
                        print("Last 3:", json.dumps(data[-3:], ensure_ascii=False, indent=2))

        print()
        print("=== BdE tipos hipotecarios via bde.es ===")
        urls_bde = [
            "https://www.bde.es/webbe/es/estadisticas/compartidos/datos/si/si_1_1.json",
            "https://www.bde.es/webbe/es/estadisticas/tem/tablas/tipo_interes_credito.html",
            "https://www.bde.es/webbe/es/estadisticas/tem/tablas/boletinestadistico.html",
        ]
        for url in urls_bde:
            r5 = await client.get(url)
            print("  " + url[-50:] + " -> " + str(r5.status_code) + " (" + str(len(r5.text)) + " bytes)")
            if r5.status_code == 200:
                csvs = re.findall("https?://\\S+\\.csv", r5.text)
                print("  CSV refs:", csvs[:3])

asyncio.run(test())
