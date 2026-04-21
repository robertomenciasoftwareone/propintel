import urllib.request
import json

base = "https://servicios.ine.es/wstempus/js/ES/DATOS_SERIE/"

codes_to_test = [
    ("IPV0038", "controller: IPV general"),
    ("IPV0039", "controller: IPV nueva vivienda"),
    ("IPV0040", "controller: IPV segunda mano"),
    ("EH0020", "controller: Num hipotecas"),
    ("EH0023", "controller: Importe medio"),
    ("IPV1", "discovery: Indices general"),
    ("IPV3", "discovery: Var anual general"),
    ("IPV9", "discovery: Segunda mano indice"),
    ("IPV11", "discovery: Segunda mano var anual"),
]

print("=== INE Series Code Verification ===\n")
for code, desc in codes_to_test:
    url = f"{base}{code}?nult=4&det=0"
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=15) as r:
            body = r.read().decode("utf-8")
            if len(body) < 10 or body.strip() == "":
                print(f"[EMPTY] {code} ({desc})")
                continue
            try:
                data = json.loads(body)
                if isinstance(data, dict) and "Data" in data:
                    pts = data["Data"]
                    if pts:
                        last = pts[-1]
                        nombre = data.get("Nombre", "")[:60]
                        print(f"[OK] {code} ({desc}) | {len(pts)} pts | last: {last.get('NombrePeriodo','?')} = {last.get('Valor','?')}")
                        print(f"     Nombre: {nombre}")
                    else:
                        print(f"[NODATA] {code} ({desc}) | Data array empty")
                elif isinstance(data, dict) and "Erro" in data:
                    print(f"[ERROR] {code} ({desc}) | INE error: {data.get('Erro')}")
                else:
                    print(f"[UNKNOWN] {code} ({desc}) | keys={list(data.keys()) if isinstance(data,dict) else type(data)}")
            except json.JSONDecodeError:
                print(f"[NONJSON] {code} ({desc}) | body: {body[:80]}")
    except Exception as e:
        print(f"[FAIL] {code} ({desc}) | {e}")

print("\n=== Eurostat irt_h_mrs_m (mortgage rates) test ===")
eurostat_url = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/irt_h_mrs_m?geo=ES&maturity=OV&type=IR&unit=PC_PA&lastTimePeriod=8&format=JSON"
try:
    req = urllib.request.Request(eurostat_url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=20) as r:
        body = r.read().decode("utf-8")
        data = json.loads(body)
        vals = data.get("value", {})
        print(f"[OK] Eurostat | {len(vals)} observations found")
        if vals:
            ids = list(vals.keys())[-3:]
            print(f"     Last obs keys: {ids}")
            print(f"     Values: {[vals[k] for k in ids]}")
            # also show time dimension
            time_dim = data.get("dimension", {}).get("time", {}).get("category", {}).get("label", {})
            if time_dim:
                last_times = list(time_dim.values())[-3:]
                print(f"     Last periods: {last_times}")
except Exception as e:
    print(f"[FAIL] Eurostat | {e}")
