"""Inspect the saved Fotocasa HTML to find the DOM structure."""
from bs4 import BeautifulSoup
import re

with open("_debug_fotocasa.html", "r", encoding="utf-8") as f:
    html = f.read()

soup = BeautifulSoup(html, "html.parser")
articles = soup.find_all("article")
print(f"Total articles: {len(articles)}")

for i, art in enumerate(articles[:5]):
    print(f"\n{'='*60}")
    print(f"=== ARTICLE {i+1} ===")
    print(f"{'='*60}")
    
    # Text content
    text = art.get_text(" | ", strip=True)
    print(f"TEXT: {text[:300]}")
    
    # All links
    links = art.find_all("a")
    for link in links:
        href = link.get("href", "")
        title = link.get("title", "")
        link_text = link.get_text(strip=True)[:60]
        if "/comprar/" in href and "/d" in href:
            print(f"  LINK: href={href[:100]}  title={title[:80]}  text={link_text}")
    
    # Price: find €
    price_spans = [el for el in art.find_all(string=re.compile(r"\d.*€"))]
    for ps in price_spans:
        parent = ps.parent
        print(f"  PRICE: text='{ps.strip()}'  tag={parent.name}  class={parent.get('class')}")
    
    # m² 
    m2_spans = [el for el in art.find_all(string=re.compile(r"m²"))]
    for ms in m2_spans:
        parent = ms.parent
        gp = parent.parent
        print(f"  M2: text='{ms.strip()}'  tag={parent.name}  class={parent.get('class')}  parent_tag={gp.name}  parent_class={gp.get('class')}")
    
    # hab/dorm
    hab_spans = [el for el in art.find_all(string=re.compile(r"hab", re.IGNORECASE))]
    for hs in hab_spans:
        parent = hs.parent
        print(f"  HAB: text='{hs.strip()}'  tag={parent.name}  class={parent.get('class')}")
    
    # data-panot-component
    panots = art.find_all(attrs={"data-panot-component": True})
    panot_types = set(p.get("data-panot-component") for p in panots)
    print(f"  PANOT components: {panot_types}")
