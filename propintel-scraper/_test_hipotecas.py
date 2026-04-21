import urllib.request
import json

base_series = "https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/"
base_op = "https://servicios.ine.es/wstempus/js/ES/SERIES_OPERACION/"

# Test EH hipotecas - look for nacional fincas urbanas total numero/importe
# First get first 50 series from EH operation (id=40)
print("=== Searching EH operation 40 series (nacional total) ===")
try:
    req = urllib.request.Request(f"{base_op}40?det=2&page=1", headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.loads(r.read().decode("utf-8"))
        # Filter for Nacional + Fincas urbanas + Total + Numero
        matches = []
        for s in data:
            nombre = s.get("Nombre", "")
            cod = s.get("COD", "")
            nombre_lower = nombre.lower()
            # Check for national level housing total count
            if ("nacional" in nombre_lower and "urbana" in nombre_lower and 
                "total" in nombre_lower and 
                ("número" in nombre_lower or "numero" in nombre_lower or "importe" in nombre_lower)):
                matches.append((cod, nombre[:80]))
        
        print(f"Total series in op 40 page 1: {len(data)}")
        print(f"Matches for nacional+urbana+total+numero/importe: {len(matches)}")
        for cod, nom in matches[:10]:
            print(f"  {cod}: {nom}")
        
        # Also look for series starting with EH to understand numbering
        eh_series_first = [(s.get("COD",""), s.get("Nombre","")[:60]) for s in data[:30]]
        print("\nFirst 20 EH series codes:")
        for cod, nom in eh_series_first[:20]:
            print(f"  {cod}: {nom}")
except Exception as e:
    print(f"FAIL op 40 page 1: {e}")

# Test specific EH codes to find national ones
print("\n=== Testing candidate EH national codes ===")
# National usually appears at beginning since EH is ordered by geography (Nacional first, then CC.AA., then provincias)
candidate_codes = ["EH0001", "EH0002", "EH0003", "EH0004", "EH0005", "EH0006", "EH0007", "EH0008"]
for code in candidate_codes:
    url = f"{base_series}{code}?nult=3&det=0"
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read().decode("utf-8"))
            if "Data" in data and data["Data"]:
                last = data["Data"][-1]
                print(f"[OK] {code}: {data.get('Nombre','')[:70]}")
                print(f"     last val={last.get('Valor','?')}, pts={len(data['Data'])}")
    except Exception as e:
        print(f"[FAIL] {code}: {e}")

# Test new ECB data portal (replaced SDW)
print("\n=== Testing ECB new data portal ===")
# Spain mortgage rate - MIR dataset, M.ES.B.A2C.AM.R.A.2250.EUR.N
ecb_urls = [
    ("ECB MIR Spain mortgage", "https://data.ecb.europa.eu/api/data/MIR/M.ES.B.A2C.AM.R.A.2250.EUR.N?lastNObservations=6&detail=dataonly&format=jsondata"),
    ("Eurostat fixed params", "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/irt_h_mrs_m?geo=ES&unit=PC_PA&lastTimePeriod=8&format=JSON"),
]
for desc, url in ecb_urls:
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=20) as r:
            body = r.read().decode("utf-8")
            data = json.loads(body)
            print(f"[OK] {desc}: body len={len(body)}, keys={list(data.keys())[:5]}")
            # Try to get observations
            if "dataSets" in data:
                obs = data["dataSets"][0].get("series",{})
                if obs:
                    first_series = list(obs.values())[0]
                    observations = first_series.get("observations", {})
                    keys = list(observations.keys())[-3:]
                    print(f"     Last 3 obs: {[observations[k] for k in keys]}")
            elif "value" in data:
                vals = data["value"]
                print(f"     {len(vals)} values found")
    except Exception as e:
        print(f"[FAIL] {desc}: {e}")
