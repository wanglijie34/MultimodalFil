import shapefile
import os

shp_path = r"D:\Develop\MultimodalFile\scratch\chgis\v6_time_pref_pgn_utf_xian80.shp"
sf = shapefile.Reader(shp_path)

print("Check projection and coordinates:")
shape = sf.shape(0)
print(shape.points[:5])
