import httpx, json, asyncio, datetime

async def test():
    async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers={"User-Agent": "Mozilla/5.0"}) as client:

        # -- INE IPV: buscar series nacionales base reciente --
        print("=== IPV Series Nacionales ===")
        r = await client.get("https://servicios.ine.es/wstempus/js/ES/SERIES_OPERACION/15?det=2")
        if r.status_code == 200 and r.text.strip():
            series = r.json()
            print("Total IPV series:", len(series))
            for s in series[:20]:
                print(f"  {s.get('COD')}: {s.get('Nombre')}")

        print()
        # -- IPV: tomar las primeras 5 series y obtener datos recientes --
        print("=== IPV ultimos datos (5 series) ===")
        for cod in ["IPV1","IPV4","IPV5","IPV6","IPV9"]:
            r2 = await client.get(f"https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/{cod}?nult=4")
            if r2.status_code == 200 and r2.text.strip():
                d = r2.json()
                nombre = d.get("Nombre","")
                pts = d.get("Data",[])
                print(f"\n  {cod}: {nombre[:80]}")
                for p in pts:
                    ts = p.get("Fecha",0)/1000
                    if ts:
                        dt = datetime.datetime.fromtimestamp(ts)
                        q = (dt.month - 1) // 3 + 1
                        label = f"{dt.year}-Q{q}"
                    else:
                        label = "?"
                    print(f"    {p.get('Anyo')}/{p.get('FK_Periodo')}: {p.get('Valor')}  [{label}]")

        print()
        # -- INE Hipotecas: buscar serie total nacional fincas urbanas --
        print("=== Hipotecas Series (buscar total) ===")
        r3 = await client.get("https://servicios.ine.es/wstempus/js/ES/SERIES_OPERACION/40?det=2")
        if r3.status_code == 200 and r3.text.strip():
            series3 = r3.json()
            relevantes = [s for s in series3 
                          if "total" in s.get("Nombre","").lower() 
                          and ("urbana" in s.get("Nombre","").lower() or "nacional" in s.get("Nombre","").lower())]
            print("Series relevantes hipotecas:", len(relevantes))
            for s in relevantes[:10]:
                print(f"  {s.get('COD')}: {s.get('Nombre')[:100]}")

        print()
        # -- ECB SDW: tipos hipotecarios espana --
        print("=== ECB tipos hipotecarios Espana ===")
        ecb_url = "https://sdw-wsrest.ecb.europa.eu/service/data/MIR/M.ES.B.A2C.F.R.A.2250.EUR.N?lastNObservations=6&format=jsondata"
        r4 = await client.get(ecb_url)
        print("Status:", r4.status_code, "Len:", len(r4.text))
        if r4.status_code == 200 and r4.text.strip():
            d4 = r4.json()
            print("Keys:", list(d4.keys()))
            try:
                obs = d4["dataSets"][0]["series"]
                print("Series in dataset:", len(obs))
                first_key = list(obs.keys())[0]
                obs_data = obs[first_key]["observations"]
                print("Observations:", len(obs_data))
                times = d4["structure"]["dimensions"]["observation"][0]["values"]
                latest = sorted(obs_data.keys())[-6:]
                for k in latest:
                    print(f"  {times[int(k)]['id']}: {obs_data[k][0]}")
            except Exception as e:
                print("Parse error:", e)
                print("Raw snippet:", r4.text[:500])

asyncio.run(test())
