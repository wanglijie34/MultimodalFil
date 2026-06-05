import zipfile
import shapefile
import os

zip_path = r"D:\Develop\MultimodalFile\files\v6_time_pref_pgn_utf_xian80.zip"
extract_dir = r"D:\Develop\MultimodalFile\scratch\chgis"

if not os.path.exists(extract_dir):
    os.makedirs(extract_dir)

print("Extracting...")
with zipfile.ZipFile(zip_path, 'r') as zip_ref:
    zip_ref.extractall(extract_dir)

shp_path = os.path.join(extract_dir, "v6_time_pref_pgn_utf_xian80.shp")

print(f"Reading shapefile: {shp_path}")
sf = shapefile.Reader(shp_path)
print("Fields:")
for field in sf.fields[1:]:
    print(field[0])

print("\nFirst 5 records:")
for i in range(5):
    rec = sf.record(i)
    print(rec.as_dict())

print(f"Total shapes: {len(sf.shapes())}")
