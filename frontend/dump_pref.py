import json
with open(r'd:\Develop\MultimodalFile\frontend\public\data\ming_prefectures_1628.geojson', 'r', encoding='utf-8') as f:
    d = json.load(f)
with open('prefectures.txt', 'w', encoding='utf-8') as out:
    for f in d['features']:
        out.write(f"{f['properties'].get('province')}: {f['properties'].get('name')}\n")
