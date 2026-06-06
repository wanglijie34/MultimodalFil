export const historicalWaterways = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: '黄河', type: 'river' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [96.0, 34.0], [100.0, 35.5], [103.8, 36.0], // Qinghai to Lanzhou
          [106.0, 38.0], [108.0, 40.5], [111.0, 39.5], // Great Bend (Hetao)
          [110.5, 36.0], [110.0, 34.5], // Shanxi-Shaanxi border
          [113.6, 34.7], // Zhengzhou
          [117.0, 36.6], // Jinan
          [119.0, 38.0]  // Bohai Sea
        ]
      }
    },
    {
      type: 'Feature',
      properties: { name: '长江', type: 'river' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [91.0, 33.0], [97.0, 30.0], [100.0, 27.0], // Qinghai to Yunnan
          [104.6, 28.7], // Yibin
          [106.5, 29.5], // Chongqing
          [111.2, 30.7], // Yichang
          [114.3, 30.5], // Wuhan
          [116.0, 29.7], // Jiujiang
          [118.7, 32.0], // Nanjing
          [121.4, 31.2], // Shanghai
          [121.9, 31.3]  // East China Sea
        ]
      }
    },
    {
      type: 'Feature',
      properties: { name: '京杭大运河', type: 'canal' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [116.4, 39.9], // Beijing
          [117.2, 39.1], // Tianjin
          [116.8, 38.3], [116.2, 37.4], [115.7, 36.8], // Hebei/Shandong border (Linqing)
          [116.6, 35.4], // Jining
          [117.2, 34.2], // Xuzhou
          [119.1, 33.5], // Huai'an
          [119.4, 32.4], // Yangzhou
          [119.5, 32.2], // Cross Yangtze
          [119.9, 31.8], // Changzhou
          [120.6, 31.3], // Suzhou
          [120.1, 30.2]  // Hangzhou
        ]
      }
    }
  ]
};
