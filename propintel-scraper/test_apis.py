import httpx, json, asyncio, re

async def test():
    async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers={"Accept": "application/json, text/html,*/*", "User-Agent": "Mozilla/5.0"}) as client:

        # INE: Buscar operacion IPV
        print("=== INE OPERACIONES IPV ===")
        r = await client.get("https://servicios.ine.es/wstempus/js/ES/OPERACIONES_DISPONIBLES")
        print("Status:", r.status_code, "| Len:", len(r.text))
        if r.status_code == 200 and r.text.strip():
            ops = r.json()
            ipv_ops = [x for x in ops if "precio" in x.get("Nombre","").lower() and "vivienda" in x.get("Nombre","").lower()]
            print("IPV ops found:", ipv_ops[:5])
            hip_ops = [x for x in ops if "hipotec" in x.get("Nombre","").lower()]
            print("Hipotecas ops found:", hip_ops[:5])

        print()
        # INE: Buscar series IPV por operacion
        print("=== INE SERIES IPV op 25 ===")
        r2 = await client.get("https://servicios.ine.es/wstempus/js/ES/SERIES_OPERACION/25?det=2&nult=0")
        print("Status:", r2.status_code, "| Len:", len(r2.text))
        if r2.status_code == 200 and r2.text.strip():
            series = r2.json()
            print("Series count:", len(series))
            total = [s for s in series if "total" in s.get("Nombre","").lower() or "nacional" in s.get("Nombre","").lower()]
            print("Total/Nacional series:", total[:3])

        print()
        # INE: Usar SERIES_OPERACION para hipotecas
        print("=== INE OPERACIONES HIPOTECAS ===")
        r3 = await client.get("https://servicios.ine.es/wstempus/js/ES/SERIES_OPERACION/30?det=2&nult=0")
        print("Status:", r3.status_code, "| Len:", len(r3.text))
        if r3.status_code == 200 and r3.text.strip():
            s3 = r3.json()
            print("Series count:", len(s3))
            total3 = [s for s in s3 if "total" in str(s).lower()][:3]
            print("Sample series:", total3)

        print()
        # BdE: endpoint alternative
        print("=== BdE BIEST API ===")
        r4 = await client.get("https://www.bde.es/webbe/es/estadisticas/compartidos/datos/si/si_2_1.csv")
        print("Status:", r4.status_code, "| Len:", len(r4.text))
        if r4.status_code == 200:
            print("First 10 lines:")
            for line in r4.text.split("\n")[:10]:
                print(" ", repr(line))

        print()
        print("=== BdE buscar tipo hipotecario ===")
        r5 = await client.get("https://www.bde.es/webbe/es/estadisticas/tem/tablas/tipo_int_credito_viv.html")
        print("Status:", r5.status_code, "| Len:", len(r5.text))
        if r5.status_code == 200:
            csvs = re.findall(r"href=[\"'](.*?\.csv[^\"']*)[\"']", r5.text)
            jsons = re.findall(r"href=[\"'](.*?\.json[^\"']*)[\"']", r5.text)
            print("CSV links found:", csvs[:5])
            print("JSON links found:", jsons[:5])

asyncio.run(test())
