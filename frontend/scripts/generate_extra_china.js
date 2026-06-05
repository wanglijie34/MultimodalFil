const turf = require('@turf/turf');
const fs = require('fs');

const chinaData = JSON.parse(fs.readFileSync('D:/Develop/MultimodalFile/frontend/public/data/china.geojson'));
const worldData = JSON.parse(fs.readFileSync('D:/Develop/MultimodalFile/frontend/public/data/world.geojson'));

function getFeature(name, fromWorld=false) {
  const data = fromWorld ? worldData : chinaData;
  return data.features.find(f => (f.properties.name || f.properties.NAME) === name);
}

const regions = [
  {
    faction: '后金',
    sourceFeatures: [getFeature('黑龙江省'), getFeature('吉林省'), getFeature('辽宁省')],
    points: ['建州左卫', '建州右卫', '海西女真', '野人女真', '长白山部', '科尔沁部', '董鄂部', '辉发部', '乌拉部', '辽阳', '沈阳', '广宁', '铁岭', '海州', '盖州', '复州', '金州']
  },
  {
    faction: '北元 / 鞑靼',
    sourceFeatures: [getFeature('内蒙古自治区'), getFeature('甘肃省'), getFeature('宁夏回族自治区'), getFeature('河北省'), getFeature('山西省'), getFeature('陕西省')],
    points: ['察哈尔部', '土默特部', '鄂尔多斯部', '兀良哈', '科尔沁左翼', '翁牛特部', '阿鲁科尔沁', '巴林部', '奈曼部', '河套', '阿拉善']
  },
  {
    faction: '瓦剌',
    sourceFeatures: [getFeature('Mongolia', true)],
    points: ['准噶尔部', '和硕特部', '土尔扈特部', '杜尔伯特部', '辉特部', '喀尔喀蒙古']
  },
  {
    faction: '东察合台汗国',
    sourceFeatures: [getFeature('新疆维吾尔自治区')],
    points: ['吐鲁番', '哈密', '喀什噶尔', '叶尔羌', '和田', '阿克苏', '库车', '乌什', '拜城', '轮台']
  },
  {
    faction: '吐蕃诸部',
    sourceFeatures: [getFeature('西藏自治区'), getFeature('云南省'), getFeature('青海省'), getFeature('四川省')],
    points: ['拉萨', '日喀则', '阿里', '那曲', '山南', '林芝', '昌都', '帕里', '丽江木氏', '玉树', '果洛', '甘孜', '阿坝', '理塘', '巴塘', '德格', '石渠', '松潘卫']
  },
  {
    faction: '辽东都司',
    sourceFeatures: [getFeature('辽宁省'), getFeature('河北省')],
    points: ['宁远', '锦州', '山海关']
  }
];

const allFeatures = [];

for (const region of regions) {
  let combinedPoly = null;
  for (const f of region.sourceFeatures) {
    if (!f) continue;
    if (!combinedPoly) {
      combinedPoly = f;
    } else {
      combinedPoly = turf.union(turf.featureCollection([combinedPoly, f]));
    }
  }
  
  if (!combinedPoly) continue;
  
  const bbox = turf.bbox(combinedPoly);
  
  const pts = [];
  let attempts = 0;
  while(pts.length < region.points.length && attempts < 5000) {
    attempts++;
    const pt = turf.randomPoint(1, {bbox});
    if (turf.booleanPointInPolygon(pt.features[0], combinedPoly)) {
      pt.features[0].properties.name = region.points[pts.length];
      pt.features[0].properties.faction = region.faction;
      pts.push(pt.features[0]);
    }
  }
  
  if (pts.length === 0) continue;
  
  const pointsFc = turf.featureCollection(pts);
  const voronoi = turf.voronoi(pointsFc, {bbox});
  
  for (let i = 0; i < voronoi.features.length; i++) {
    const poly = voronoi.features[i];
    if (poly) {
      try {
        const clipped = turf.intersect(turf.featureCollection([poly, combinedPoly]));
        if (clipped) {
          clipped.properties = {
            name: pts[i].properties.name,
            faction: pts[i].properties.faction
          };
          allFeatures.push(clipped);
        }
      } catch (e) {
        console.error("Intersection failed for", pts[i].properties.name);
      }
    }
  }
}

fs.writeFileSync('D:/Develop/MultimodalFile/frontend/public/data/extra_factions.geojson', JSON.stringify(turf.featureCollection(allFeatures)));
console.log('done extra_factions');
