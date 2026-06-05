const turf = require('@turf/turf');
const fs = require('fs');

const factions = {
  jurchen: {
    name: '后金',
    poly: turf.polygon([[[124, 42], [119.5, 40], [122, 44], [125, 48], [135, 48], [135, 42], [124, 42]]]),
    points: ['建州左卫', '建州右卫', '海西女真', '野人女真', '长白山部', '科尔沁部', '董鄂部', '苏克素护河部', '辉发部', '乌拉部']
  },
  northern_yuan: {
    name: '北元',
    poly: turf.polygon([[[122, 44], [115, 52], [95, 52], [100, 48], [100, 41], [98, 39.5], [102, 38], [106, 38.5], [109.5, 38], [113, 40], [115, 40.6], [119.5, 40], [122, 44]]]),
    points: ['察哈尔部', '土默特部', '鄂尔多斯部', '喀尔喀蒙古', '兀良哈', '科尔沁左翼', '科尔沁右翼', '翁牛特部', '阿鲁科尔沁', '巴林部', '扎鲁特部', '奈曼部', '敖汉部', '克什克腾']
  },
  oirats: {
    name: '瓦剌',
    poly: turf.polygon([[[85, 50], [95, 52], [100, 48], [100, 41], [98, 39.5], [95, 43.5], [88, 44], [85, 50]]]),
    points: ['准噶尔部', '和硕特部', '土尔扈特部', '杜尔伯特部', '辉特部', '罗卜藏丹津', '青海蒙古']
  },
  chagatai: {
    name: '东察合台',
    poly: turf.polygon([[[88, 44], [95, 43.5], [90, 43], [86, 38], [82, 35], [75, 35], [75, 40], [80, 45], [88, 44]]]),
    points: ['吐鲁番', '哈密', '喀什噶尔', '叶尔羌', '和田', '阿克苏', '库车', '乌什', '拜城', '轮台']
  },
  wusizang: {
    name: '乌斯藏都司',
    poly: turf.polygon([[[79, 32], [86, 28], [93, 27.5], [95, 30], [92, 33], [82, 35], [79, 32]]]),
    points: ['拉萨', '日喀则', '阿里', '那曲', '山南', '林芝', '昌都', '帕里']
  },
  duogan: {
    name: '朵甘都司',
    poly: turf.polygon([[[92, 33], [95, 30], [93, 27.5], [100, 27], [101, 31], [98, 34], [92, 33]]]),
    points: ['玉树', '果洛', '甘孜', '阿坝', '理塘', '巴塘', '德格', '石渠']
  },
  liaodong: {
    name: '辽东都司',
    poly: turf.polygon([[[119.5, 40], [121, 39], [122, 39.5], [124.5, 40], [125, 41.5], [124, 42], [119.5, 40]]]),
    points: ['辽阳', '沈阳', '广宁', '铁岭', '海州', '盖州', '复州', '金州', '宁远', '锦州']
  }
};

const allFeatures = [];

for (const key in factions) {
  const faction = factions[key];
  const bbox = turf.bbox(faction.poly);
  
  // Create random points inside the polygon
  const pts = [];
  let attempts = 0;
  while(pts.length < faction.points.length && attempts < 1000) {
    attempts++;
    const pt = turf.randomPoint(1, {bbox});
    if (turf.booleanPointInPolygon(pt.features[0], faction.poly)) {
      pt.features[0].properties.name = faction.points[pts.length];
      pt.features[0].properties.faction = faction.name;
      pts.push(pt.features[0]);
    }
  }
  
  const pointsFc = turf.featureCollection(pts);
  const voronoi = turf.voronoi(pointsFc, {bbox});
  
  for (let i = 0; i < voronoi.features.length; i++) {
    const poly = voronoi.features[i];
    if (poly) {
      // intersect with faction polygon to clip strictly
      const clipped = turf.intersect(turf.featureCollection([poly, faction.poly]));
      if (clipped) {
        clipped.properties = {
          name: pts[i].properties.name,
          faction: pts[i].properties.faction
        };
        allFeatures.push(clipped);
      }
    }
  }
}

fs.writeFileSync('D:/Develop/MultimodalFile/frontend/public/data/extra_factions.geojson', JSON.stringify(turf.featureCollection(allFeatures)));
console.log('done');
