export interface PrefectureData {
  population: number;
  grain: '丰盈' | '尚可维持' | '告急' | '严重告急' | '颗粒无收';
  agriculture: string;
  tax: number;
  magistrate?: string;
}

export const prefectureHistoricalData: Record<string, PrefectureData> = {
  '顺天府': { population: 210000, grain: '告急', agriculture: '京畿重地，仰赖漕运，京营糜费极巨', tax: 150000 },
  '保定府': { population: 180000, grain: '告急', agriculture: '畿辅重地，频遭清军入关劫掠', tax: 120000 },
  '应天府': { population: 450000, grain: '丰盈', agriculture: '留都所在，天下财赋重地，赋役极重', tax: 2500000 },
  '苏州府': { population: 600000, grain: '丰盈', agriculture: '苏湖熟，天下足，丝织棉纺极盛', tax: 2800000 },
  '松江府': { population: 350000, grain: '尚可维持', agriculture: '衣被天下，棉花种植与纺织中心', tax: 1200000 },
  '杭州府': { population: 400000, grain: '尚可维持', agriculture: '丝绸之乡，商业繁盛，人文荟萃', tax: 1100000 },
  '嘉兴府': { population: 320000, grain: '丰盈', agriculture: '地滨杭嘉湖平原，蚕桑极盛', tax: 1000000 },
  '湖州府': { population: 290000, grain: '丰盈', agriculture: '湖丝甲天下，太湖流域粮仓', tax: 950000 },
  '开封府': { population: 280000, grain: '严重告急', agriculture: '中原腹地，连年大旱，流寇横行，藩王兼并极重', tax: 850000 },
  '河南府': { population: 150000, grain: '颗粒无收', agriculture: '赤地千里，大饥，人相食', tax: 300000 },
  '西安府': { population: 250000, grain: '严重告急', agriculture: '西北重镇，大旱连年，民不聊生，赋役折银沉重', tax: 700000 },
  '延安府': { population: 120000, grain: '颗粒无收', agriculture: '连年大旱，草根树皮食尽，农民军发源地', tax: 150000 },
  '太原府': { population: 180000, grain: '告急', agriculture: '表里山河，边防重镇，晋商活动频繁', tax: 450000 },
  '武昌府': { population: 320000, grain: '尚可维持', agriculture: '九省通衢，湖广熟天下足，商业水运发达', tax: 950000 },
  '成都府': { population: 200000, grain: '尚可维持', agriculture: '天府之国，偏安一隅，蜀锦蜀茶远销', tax: 800000 },
  '广州府': { population: 380000, grain: '丰盈', agriculture: '岭南重镇，海外贸易繁荣，引种番薯玉米', tax: 1300000 },
  '辽东都司': { population: 80000, grain: '严重告急', agriculture: '边患深重，建州女真频频入寇，军屯尽毁', tax: 10000 },
  '琼州府': { population: 90000, grain: '尚可维持', agriculture: '孤悬海外，黎汉杂居，时有动荡', tax: 120000 }
};

export function getPrefectureData(name: string, lat: number, lng: number): PrefectureData {
  if (prefectureHistoricalData[name]) {
    return prefectureHistoricalData[name];
  }
  
  // Shaanxi, Shanxi, Henan, North Zhili (Epicenter of late Ming famines and rebellions)
  if (lat > 33 && lng < 116) {
    return {
      population: Math.floor(Math.random() * 60000 + 40000),
      grain: lat > 35 ? '颗粒无收' : '严重告急',
      agriculture: '连年大旱，蝗灾肆虐，流民四起，田园荒芜',
      tax: Math.floor(Math.random() * 100000 + 50000)
    };
  }
  
  // Jiangnan / Southeast (Wealthy, stable grain, high taxes)
  if (lat < 33 && lat > 28 && lng > 118) {
    return {
      population: Math.floor(Math.random() * 150000 + 100000),
      grain: '尚可维持',
      agriculture: '鱼米之乡，商品经济发达，赋重役繁',
      tax: Math.floor(Math.random() * 400000 + 200000)
    };
  }
  
  // Southwest (Yunnan, Guizhou, Sichuan, Guangxi)
  if (lat < 30 && lng < 108) {
    return {
      population: Math.floor(Math.random() * 80000 + 50000),
      grain: '尚可维持',
      agriculture: '山地崎岖，土司林立，改土归流引发时叛',
      tax: Math.floor(Math.random() * 80000 + 30000)
    };
  }
  
  // Default for others (e.g. Huguang, Jiangxi, Fujian)
  return {
    population: Math.floor(Math.random() * 100000 + 70000),
    grain: lat > 35 ? '告急' : '尚可维持',
    agriculture: lat > 35 ? '气候干冷，收成锐减，辽饷加派沉重' : '农业尚可，三饷加派致使民怨沸腾',
    tax: Math.floor(Math.random() * 150000 + 80000)
  };
}
