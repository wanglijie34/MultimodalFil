export const factionBoundaries = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 'ming',
        name: '大明帝国',
        color: '#a32727', // Deep red
        center: [112.0, 31.0]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          // Northeast (bordering Jurchen)
          [124.0, 42.0], // Liaodong
          [119.5, 40.0], // Shanhaiguan
          
          // Great Wall (West to East reversed)
          [115.0, 40.6], // Xuanfu
          [113.0, 40.0], // Datong
          [109.5, 38.0], // Yulin
          [106.0, 38.5], // Ningxia
          [102.0, 38.0], // Wuwei
          [98.0, 39.5],  // Jiayuguan
          
          // Extend to Hami & Touch Chagatai
          [95.0, 43.5],  // North of Hami (touching Oirat/Chagatai)
          [90.0, 43.0],  // Touching Chagatai near Turpan
          
          // Touching Chagatai down to Tibet
          [86.0, 38.0],  // Tarim Basin eastern edge
          [82.0, 35.0],  // Kunlun Mountains (bordering Chagatai)
          [79.0, 32.0],  // Western Tibet (Ngari)
          
          // Himalayas & South Borders
          [86.0, 28.0],  // Mt. Everest region
          [93.0, 27.5],  // South Tibet (Himalayas)
          [100.0, 27.0], // Yunnan/Burma border
          [97.0, 24.0],  // Deep Yunnan
          [105.0, 22.0], // Guangxi/Vietnam border
          [110.0, 20.0], // Hainan
          [117.0, 23.0], // Guangdong coast
          [120.0, 26.0], // Fujian coast
          [122.0, 30.0], // Zhejiang coast
          [121.0, 34.0], // Jiangsu coast
          [122.0, 37.0], // Shandong coast
          
          [124.0, 42.0]  // Back to Liaodong
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        id: 'northern-yuan',
        name: '北元 / 鞑靼',
        color: '#5c4033', // Dark brown/earth
        center: [113.0, 46.0]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [122.0, 44.0], // Touching Jurchen
          [115.0, 52.0], // North
          [95.0, 52.0],  // North-west (Siberia border)
          
          // Oirat Border (North to South)
          [100.0, 48.0], // Central Mongolia
          [100.0, 41.0], // North of Hexi
          [98.0, 39.5],  // Jiayuguan meeting point
          
          // Ming Border (West to East)
          [102.0, 38.0], // Wuwei
          [106.0, 38.5], // Ningxia
          [109.5, 38.0], // Yulin
          [113.0, 40.0], // Datong
          [115.0, 40.6], // Xuanfu
          [119.5, 40.0], // Shanhaiguan
          
          // Jurchen Border
          [122.0, 44.0]  // Back to start
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        id: 'oirats',
        name: '瓦剌',
        color: '#4a2f6b', // Purple
        center: [92.0, 47.0]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [85.0, 50.0],  // Altai mountains
          [95.0, 52.0],  // Siberia border meeting Northern Yuan
          
          // Northern Yuan border
          [100.0, 48.0], // Central Mongolia
          [100.0, 41.0], // North of Hexi
          [98.0, 39.5],  // Jiayuguan meeting point
          
          // Ming border (Hami extension)
          [95.0, 43.5],  // North of Hami
          
          // Chagatai border
          [88.0, 44.0],  // Turpan/Xinjiang
          [85.0, 50.0]   // Back to start
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        id: 'chagatai',
        name: '东察合台汗国',
        color: '#2d5c3f', // Dark green
        center: [82.0, 40.0]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          // Oirat border
          [88.0, 44.0],  // Turpan
          [95.0, 43.5],  // Near Hami (meeting Oirat and Ming)
          
          // Ming border (Hami down to Kunlun)
          [90.0, 43.0],
          [86.0, 38.0],
          [82.0, 35.0],  // Kunlun Mountains
          
          // Western border
          [75.0, 35.0],  // Karakoram
          [75.0, 40.0],  // Pamirs
          [80.0, 45.0],  // Ili
          
          [88.0, 44.0]   // Back to Turpan
        ]]
      }
    },
    {
      type: 'Feature',
      properties: {
        id: 'jurchen',
        name: '后金 (女真)',
        color: '#d48a00', // Gold/Amber
        center: [128.0, 45.0]
      },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          // Touching Ming
          [124.0, 42.0], // Liaodong
          [119.5, 40.0], // Shanhaiguan
          
          // Touching Northern Yuan
          [122.0, 44.0], // West
          
          // North/East limits
          [125.0, 48.0], // Northwest
          [135.0, 48.0], // North
          [135.0, 42.0], // East
          
          [124.0, 42.0]  // Back to start
        ]]
      }
    }
  ]
};

// Also export faction centers as a separate Point FeatureCollection for rendering names
export const factionLabels = {
  type: 'FeatureCollection',
  features: factionBoundaries.features.map(f => ({
    type: 'Feature',
    properties: {
      name: f.properties.name,
      color: f.properties.color
    },
    geometry: {
      type: 'Point',
      coordinates: f.properties.center
    }
  }))
};

export const mingProvinces = {
  type: 'FeatureCollection',
  features: [
    { type: 'Feature', properties: { name: '北直隶' }, geometry: { type: 'Point', coordinates: [116.0, 39.0] } },
    { type: 'Feature', properties: { name: '南直隶' }, geometry: { type: 'Point', coordinates: [118.8, 32.0] } },
    { type: 'Feature', properties: { name: '山东' }, geometry: { type: 'Point', coordinates: [118.0, 36.6] } },
    { type: 'Feature', properties: { name: '山西' }, geometry: { type: 'Point', coordinates: [112.5, 37.8] } },
    { type: 'Feature', properties: { name: '河南' }, geometry: { type: 'Point', coordinates: [113.6, 34.2] } },
    { type: 'Feature', properties: { name: '陕西' }, geometry: { type: 'Point', coordinates: [108.9, 34.3] } },
    { type: 'Feature', properties: { name: '四川' }, geometry: { type: 'Point', coordinates: [101.5, 31.0] } },
    { type: 'Feature', properties: { name: '湖广' }, geometry: { type: 'Point', coordinates: [112.3, 28.5] } },
    { type: 'Feature', properties: { name: '浙江' }, geometry: { type: 'Point', coordinates: [120.1, 29.2] } },
    { type: 'Feature', properties: { name: '江西' }, geometry: { type: 'Point', coordinates: [115.9, 27.6] } },
    { type: 'Feature', properties: { name: '福建' }, geometry: { type: 'Point', coordinates: [117.8, 26.0] } },
    { type: 'Feature', properties: { name: '广东' }, geometry: { type: 'Point', coordinates: [113.2, 23.5] } },
    { type: 'Feature', properties: { name: '广西' }, geometry: { type: 'Point', coordinates: [108.8, 23.8] } },
    { type: 'Feature', properties: { name: '云南' }, geometry: { type: 'Point', coordinates: [101.7, 25.0] } },
    { type: 'Feature', properties: { name: '贵州' }, geometry: { type: 'Point', coordinates: [106.7, 26.8] } },
    { type: 'Feature', properties: { name: '辽东都司' }, geometry: { type: 'Point', coordinates: [123.0, 41.5] } },
    { type: 'Feature', properties: { name: '乌斯藏都司' }, geometry: { type: 'Point', coordinates: [91.1, 29.6] } },
    { type: 'Feature', properties: { name: '朵甘都司' }, geometry: { type: 'Point', coordinates: [97.1, 31.0] } }
  ]
};
