"""Downloads the ENACOM repeaters KML from Google Maps and generates data/repetidoras.json."""
import json, re, html, ssl, urllib.request, xml.etree.ElementTree as ET
from pathlib import Path

KML_URL = 'https://www.google.com/maps/d/kml?mid=1UiTwskl11BvsihpvVZAS-KljYafHcJsS&forcekml=1'
OUT_PATH = Path(__file__).parent / 'repetidoras.json'
NS = {'kml': 'http://www.opengis.net/kml/2.2'}

def fetch_kml():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(KML_URL, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, context=ctx) as r:
        return r.read()

def field(desc, label):
    m = re.search(re.escape(label) + r'[:\s]+([^<\n]+)', desc or '')
    return html.unescape(m.group(1).strip()) if m else ''

def parse_kml(data):
    root = ET.fromstring(data)
    records = []
    for pm in root.findall('.//kml:Placemark', NS):
        name = pm.find('kml:name', NS)
        desc_el = pm.find('kml:description', NS)
        point = pm.find('.//kml:Point/kml:coordinates', NS)
        callsign = (name.text or '').strip()
        desc = desc_el.text if desc_el is not None else ''
        ftx_str = field(desc, 'Frecuencia de Salida [MHz]')
        frx_str = field(desc, 'Frecuencia de Entrada [MHz]')
        tone_str = field(desc, 'Subtono [Hz]')
        try: ftx = float(ftx_str)
        except: ftx = 0.0
        try: frx = float(frx_str)
        except: frx = 0.0
        try: tone = float(tone_str)
        except: tone = 0.0
        coords = None
        if point is not None and point.text:
            parts = point.text.strip().split(',')
            if len(parts) >= 2:
                try: coords = [round(float(parts[1]), 6), round(float(parts[0]), 6)]  # [lat, lng]
                except: pass
        if ftx < 30: band = 'HF'
        elif ftx < 300: band = 'VHF'
        else: band = 'UHF'
        rec = {
            'callsign': callsign,
            'owner': field(desc, 'Titular'),
            'locality': field(desc, 'Localidad'),
            'province': field(desc, 'Provincia'),
            'ftx': ftx, 'frx': frx, 'tone': tone,
            'band': band,
        }
        if coords: rec['coords'] = coords
        records.append(rec)
    return records

if __name__ == '__main__':
    print('Fetching KML...')
    data = fetch_kml()
    records = parse_kml(data)
    print(f'Parsed {len(records)} repeaters, {sum(1 for r in records if r.get("coords"))} with coords')
    OUT_PATH.write_text(json.dumps(records, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'Written {OUT_PATH}')
