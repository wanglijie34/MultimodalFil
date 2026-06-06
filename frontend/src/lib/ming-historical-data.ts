export interface PrefectureData {
  population: number;
  grain: '丰盈' | '尚可维持' | '告急' | '严重告急' | '颗粒无收';
  agriculture: string;
  tax: number;
  magistrate?: string;
}

export const prefectureHistoricalData: Record<string, PrefectureData> = {
  '顺天府': { population: 190000, grain: '告急', agriculture: '小冰河期极寒，京畿重地仰赖江南漕运，京营糜费极巨', tax: 150000 },
  '保定府': { population: 150000, grain: '告急', agriculture: '畿辅重地，苦于频繁征发与摊派', tax: 120000 },
  '应天府': { population: 450000, grain: '丰盈', agriculture: '留都所在，天下财赋重地，辽饷加派极重', tax: 3200000 },
  '苏州府': { population: 600000, grain: '尚可维持', agriculture: '小冰河期气候异常，秋粮有减，然商业极盛，承担全国最高赋税', tax: 3500000 },
  '松江府': { population: 350000, grain: '尚可维持', agriculture: '衣被天下，棉花纺织中心，抗税斗争频发', tax: 1800000 },
  '杭州府': { population: 400000, grain: '尚可维持', agriculture: '丝绸之乡，商业繁盛，赋重役繁', tax: 1100000 },
  '嘉兴府': { population: 320000, grain: '丰盈', agriculture: '地滨杭嘉湖平原，蚕桑极盛，士绅多拒交新饷', tax: 1000000 },
  '湖州府': { population: 290000, grain: '丰盈', agriculture: '湖丝甲天下，太湖流域粮仓', tax: 950000 },
  '开封府': { population: 250000, grain: '严重告急', agriculture: '中原腹地，连年大旱，福王等藩王疯狂兼并土地', tax: 850000 },
  '河南府': { population: 120000, grain: '颗粒无收', agriculture: '赤地千里，大饥，流民易子而食，盗贼蜂起', tax: 300000 },
  '西安府': { population: 180000, grain: '严重告急', agriculture: '崇祯元年大旱，赤地千里，官府仍严厉催征辽饷，民不聊生', tax: 650000 },
  '延安府': { population: 80000, grain: '颗粒无收', agriculture: '大旱极度严重，草根树皮食尽，人相食。驿站裁撤，底层军民开始逃亡', tax: 180000 },
  '太原府': { population: 150000, grain: '告急', agriculture: '表里山河，边防重镇，晋商活动频繁但民生凋敝', tax: 450000 },
  '武昌府': { population: 320000, grain: '尚可维持', agriculture: '九省通衢，湖广熟天下足，楚王府兼并严重', tax: 950000 },
  '成都府': { population: 200000, grain: '尚可维持', agriculture: '天府之国，偏安一隅，蜀王奢靡', tax: 800000 },
  '广州府': { population: 380000, grain: '丰盈', agriculture: '岭南重镇，海外贸易繁荣，引种番薯玉米稍解饥荒', tax: 1300000 },
  '辽东都司': { population: 40000, grain: '严重告急', agriculture: '军屯尽毁，后金频频入寇，兵将嗷嗷待哺，纯耗粮饷', tax: 0 },
  '琼州府': { population: 90000, grain: '尚可维持', agriculture: '孤悬海外，黎汉杂居，时有动荡', tax: 120000 }
};

export function getPrefectureData(name: string, lat: number, lng: number): PrefectureData {
  if (prefectureHistoricalData[name]) {
    return prefectureHistoricalData[name];
  }
  
  // Shaanxi, Shanxi, Henan, North Zhili (Epicenter of 1628 famines and rebellions)
  if (lat > 33 && lng < 116) {
    return {
      population: Math.floor(Math.random() * 50000 + 20000), // Decimated by starvation and fleeing
      grain: lat > 35 ? '颗粒无收' : '严重告急',
      agriculture: '崇祯初年大旱，蝗灾肆虐，流民四起，田园荒芜，朝廷仍严厉催科',
      tax: Math.floor(Math.random() * 80000 + 40000)
    };
  }
  
  // Jiangnan / Southeast (Wealthy, stable grain, brutally high taxes due to Liao-Xiang)
  if (lat < 33 && lat > 28 && lng > 118) {
    return {
      population: Math.floor(Math.random() * 150000 + 100000),
      grain: '尚可维持',
      agriculture: '鱼米之乡，商品经济发达，但承担了朝廷绝大部分的辽饷加派，民怨沸腾',
      tax: Math.floor(Math.random() * 400000 + 300000)
    };
  }
  
  // Southwest (Yunnan, Guizhou, Sichuan, Guangxi)
  if (lat < 30 && lng < 108) {
    return {
      population: Math.floor(Math.random() * 80000 + 50000),
      grain: '尚可维持',
      agriculture: '山地崎岖，土司林立，奢安之乱余波未平',
      tax: Math.floor(Math.random() * 80000 + 30000)
    };
  }
  
  // Default for others (e.g. Huguang, Jiangxi, Fujian)
  return {
    population: Math.floor(Math.random() * 100000 + 70000),
    grain: lat > 35 ? '告急' : '尚可维持',
    agriculture: lat > 35 ? '气候干冷，收成锐减，辽饷加派沉重' : '农业尚可，然新饷不断致使民力衰竭',
    tax: Math.floor(Math.random() * 150000 + 80000)
  };
}
