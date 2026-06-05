import os
import shapefile
from shapely.geometry import shape, mapping
from shapely.ops import transform
from pyproj import Transformer
import json

shp_path = r"D:\Develop\MultimodalFile\scratch\chgis\v6_time_pref_pgn_utf_xian80.shp"
out_path = r"D:\Develop\MultimodalFile\frontend\public\data\ming_prefectures_1628.geojson"

os.makedirs(os.path.dirname(out_path), exist_ok=True)

# Transform Xian80 Zone 19 to WGS84
transformer = Transformer.from_crs("EPSG:2333", "EPSG:4326", always_xy=True)

sf = shapefile.Reader(shp_path)
features = []

count = 0
for sr in sf.shapeRecords():
    rec = sr.record.as_dict()
    # 1628 in range
    beg = rec.get('BEG_YR')
    end = rec.get('END_YR')
    if beg is not None and end is not None:
        if beg <= 1628 and end >= 1628:
            geom = shape(sr.shape.__geo_interface__)
            
            geom_wgs84 = transform(transformer.transform, geom)
            
            # Simplify geometry: 0.005 is ~500m, good enough for empire-scale mapping without lagging
            geom_simplified = geom_wgs84.simplify(0.005, preserve_topology=True)
            
            feature = {
                "type": "Feature",
                "properties": {
                    "name": rec.get('NAME_CH', ''),
                    "type": rec.get('TYPE_CH', '')
                },
                "geometry": mapping(geom_simplified)
            }
            features.append(feature)
            count += 1

geojson = {
    "type": "FeatureCollection",
    "features": features
}

print(f"Exporting {count} features for year 1628...")
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(geojson, f, ensure_ascii=False)

print(f"Saved GeoJSON to {out_path}. Size: {os.path.getsize(out_path) / 1024 / 1024:.2f} MB")
