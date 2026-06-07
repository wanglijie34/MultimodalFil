export interface MapLocation {
  id: string;
  name: string;
  lat?: number;
  lng?: number;
  type: 'capital' | 'fortress' | 'garrison' | 'event' | 'mountain' | 'river' | 'city';
  description: string;
}

export interface MapRelation {
  id: string;
  from: string;
  to: string;
  type: 'route' | 'defense' | 'campaign';
  description: string;
}

// Real-world Lat/Lng coordinates for Ming Dynasty locations
export const mapLocations: MapLocation[] = [
  {
    id: 'beijing',
    name: '京师 (顺天府)',
    lat: 39.9042,
    lng: 116.4074,
    type: 'capital',
    description: '大明京师，天子守国门。永乐大帝迁都于此，是帝国的绝对政治、军事与权力中枢。'
  },
  {
    id: 'nanjing',
    name: '南京 (应天府)',
    lat: 32.0603,
    lng: 118.7969,
    type: 'capital',
    description: '大明留都，明初首都。保留了完整的中央六部机构，是南方江南财赋重地的核心与文化中心。'
  },
  {
    id: 'fengyang',
    name: '中都 (凤阳)',
    lat: 32.868,
    lng: 117.561,
    type: 'capital',
    description: '大明中都，太祖高皇帝朱元璋的龙兴之地。这里不仅是皇室祖陵所在，更是维系大明法统与“祖宗成法”的精神圣地。'
  },
  {
    id: 'tumu',
    name: '土木堡',
    lat: 40.3833,
    lng: 115.5333,
    type: 'event',
    description: '1449年，明英宗在此被瓦剌大军包围并俘虏，史称“土木堡之变”，明朝由盛转衰的转折点。'
  },
  {
    id: 'datong',
    name: '大同镇',
    lat: 40.0903,
    lng: 113.2914,
    type: 'fortress',
    description: '九边重镇之一，山西门户，直面蒙古察哈尔部（林丹汗）的兵锋。'
  },
  {
    id: 'shanhaiguan',
    name: '山海关',
    lat: 40.0070,
    lng: 119.7430,
    type: 'fortress',
    description: '天下第一关，扼守辽西走廊，是防范东北女真等部族的重要关隘。'
  },
  {
    id: 'ningyuan',
    name: '宁远',
    lat: 40.62,
    lng: 120.71,
    type: 'fortress',
    description: '关外坚城，袁崇焕凭借红夷大炮在此击退努尔哈赤，是关宁锦防线的核心。'
  },
  {
    id: 'jinzhou',
    name: '锦州',
    lat: 41.11,
    lng: 121.12,
    type: 'fortress',
    description: '大明在关外最前沿的重镇，像一颗钉子死死钉在后金的咽喉上。'
  },
  {
    id: 'gansu',
    name: '甘肃镇',
    lat: 38.93,
    lng: 100.45,
    type: 'fortress',
    description: '九边重镇之一，最西端的防区，控制河西走廊，防范西域与青海方向的威胁。'
  },
  {
    id: 'shanxi_zhen',
    name: '山西镇 (偏头关)',
    lat: 39.444,
    lng: 111.498,
    type: 'fortress',
    description: '九边重镇之一，防范蒙古骑兵从黄河渡口渗入晋中。'
  },
  {
    id: 'liaodong',
    name: '辽东镇',
    lat: 41.2694,
    lng: 123.1815,
    type: 'fortress',
    description: '九边重镇之一，防区极广，直面女真（后金）与东部蒙古，是大明晚期流血最多的防线。'
  },
  {
    id: 'nurgan',
    name: '奴儿干都司',
    lat: 52.9833,
    lng: 139.7667,
    type: 'event',
    description: '明朝管辖黑龙江、乌苏里江流域及库页岛的军政机构（治所特林），永乐年间设立。'
  },
  // ----- 新增：根据 1443 年地图提取的北疆与塞外势力 -----
  {
    id: 'oirat',
    name: '瓦剌 (Oirat)',
    lat: 47.0,
    lng: 95.0,
    type: 'event',
    description: '西部蒙古部落联盟，1449年也先统领瓦剌大军南下，引发土木堡之变。'
  },
  {
    id: 'tatar',
    name: '鞑靼 (Tatar)',
    lat: 45.0,
    lng: 112.0,
    type: 'event',
    description: '东部蒙古本部，明朝北部边境的长期威胁。'
  },
  {
    id: 'sibir',
    name: '失必儿 (Sibir)',
    lat: 56.0,
    lng: 69.0,
    type: 'event',
    description: '西伯利亚汗国的前身，位于鄂毕河流域，明代地图所标注的最西北端势力之一。'
  },
  {
    id: 'kyrgyz',
    name: '乞儿吉思',
    lat: 52.0,
    lng: 92.0,
    type: 'event',
    description: '叶尼塞吉尔吉斯人，游牧于叶尼塞河上游。'
  },
  {
    id: 'jianzhou',
    name: '建州卫',
    lat: 41.8,
    lng: 124.9,
    type: 'event',
    description: '明朝在女真地区设立的羁縻卫所，后努尔哈赤统一建州女真，建立后金。'
  },
  // ----- 新增：明朝九边重镇与核心卫所 -----
  {
    id: 'xuanfu',
    name: '宣府镇',
    lat: 40.6,
    lng: 115.0,
    type: 'fortress',
    description: '九边重镇之一，京师西北的大门，扼守蒙古骑兵南下京城的要道。'
  },
  {
    id: 'jizhou',
    name: '蓟州镇',
    lat: 40.0,
    lng: 117.4,
    type: 'fortress',
    description: '九边重镇之一，京师的绝对门户，负责防卫山海关至古北口一线的长城，护卫京畿安全。'
  },
  {
    id: 'ningxia',
    name: '宁夏镇',
    lat: 38.5,
    lng: 106.2,
    type: 'fortress',
    description: '九边重镇之一，扼守黄河几字弯，有着“塞上江南”之称的重要军屯与防御基地。'
  },
  {
    id: 'yulin',
    name: '延绥镇 (榆林)',
    lat: 38.3,
    lng: 109.7,
    type: 'fortress',
    description: '九边重镇之一，扼守陕北高原，防范鄂尔多斯高原的“套部”蒙古，也是明末民变的策源地之一。'
  },
  {
    id: 'guyuan',
    name: '固原镇',
    lat: 36.00,
    lng: 106.24,
    type: 'fortress',
    description: '九边重镇之一，位于西北大后方，是陕西三边（延绥、宁夏、甘肃）的总后方与预备队兵源地。'
  },
  // Mountains and Rivers
  {
    id: 'yellow-river',
    name: '黄河',
    lat: 38.5,
    lng: 110.0,
    type: 'river',
    description: '中华民族的母亲河。明代常因黄河决溢而进行大规模治河工程。'
  },
  {
    id: 'yangtze-river',
    name: '长江',
    lat: 30.5,
    lng: 112.5,
    type: 'river',
    description: '天堑长江，明代南京即依托长江天险建立。'
  },
  {
    id: 'taihang-mountains',
    name: '太行山脉',
    lat: 37.5,
    lng: 113.8,
    type: 'mountain',
    description: '华北平原与黄土高原的天然分界线，历代兵家必争之地。'
  },
  {
    id: 'yinshan-mountains',
    name: '阴山山脉',
    lat: 41.5,
    lng: 110.0,
    type: 'mountain',
    description: '横亘于内蒙古高原腹地，是中原王朝抵御北方游牧民族的天然屏障。'
  },
  {
    id: 'qilian-mountains',
    name: '祁连山脉',
    lat: 38.5,
    lng: 99.5,
    type: 'mountain',
    description: '河西走廊的生命之源，明代防范吐鲁番与蒙古右翼的重要地理依托。'
  },
  {
    id: 'onon-river',
    name: '斡难河',
    lat: 48.5,
    lng: 110.5,
    type: 'river',
    description: '成吉思汗的发迹之地，明代漠北蒙古的游牧核心区域。'
  },
  // ----- 新增：两京十三布政使司（大明核心省会） -----
  {
    id: 'zhejiang',
    name: '浙江布政使司 (杭州)',
    lat: 30.25,
    lng: 120.17,
    type: 'city',
    description: '明代浙江承宣布政使司治所，江南财赋重地，丝绸与茶叶贸易枢纽。'
  },
  {
    id: 'jiangxi',
    name: '江西布政使司 (南昌)',
    lat: 28.68,
    lng: 115.89,
    type: 'city',
    description: '明代江西承宣布政使司治所，文风鼎盛，科举强省。'
  },
  {
    id: 'fujian',
    name: '福建布政使司 (福州)',
    lat: 26.08,
    lng: 119.30,
    type: 'city',
    description: '明代福建承宣布政使司治所，海上丝绸之路的重要起点区域。'
  },
  {
    id: 'guangdong',
    name: '广东布政使司 (广州)',
    lat: 23.13,
    lng: 113.26,
    type: 'city',
    description: '明代广东承宣布政使司治所，对外贸易与市舶司所在地。'
  },
  {
    id: 'guangxi',
    name: '广西布政使司 (桂林)',
    lat: 25.28,
    lng: 110.29,
    type: 'city',
    description: '明代广西承宣布政使司治所，靖江王藩封之地，西南军事重镇。'
  },
  {
    id: 'yunnan',
    name: '云南布政使司 (昆明)',
    lat: 25.04,
    lng: 102.71,
    type: 'city',
    description: '明初沐英平定云南后世代镇守，是西南边防与民族融合的核心。'
  },
  {
    id: 'guizhou',
    name: '贵州布政使司 (贵阳)',
    lat: 26.65,
    lng: 106.63,
    type: 'city',
    description: '永乐十一年（1413年）建省，加强了中央对西南土司地区的控制。'
  },
  {
    id: 'sichuan',
    name: '四川布政使司 (成都)',
    lat: 30.57,
    lng: 104.06,
    type: 'city',
    description: '天府之国，明代蜀王藩封地，西南战略大后方。'
  },
  {
    id: 'huguang',
    name: '湖广布政使司 (武昌)',
    lat: 30.54,
    lng: 114.31,
    type: 'city',
    description: '“湖广熟，天下足”，明代中后期最重要的商品粮基地，楚王藩封地。'
  },
  {
    id: 'henan',
    name: '河南布政使司 (开封)',
    lat: 34.80,
    lng: 114.31,
    type: 'city',
    description: '中原腹地，明代周王藩封地，黄河水患防御的重点区域。'
  },
  {
    id: 'shandong',
    name: '山东布政使司 (济南)',
    lat: 36.65,
    lng: 117.12,
    type: 'city',
    description: '扼守京杭大运河咽喉，孔孟之乡，齐鲁大地的政治中心。'
  },
  {
    id: 'shanxi',
    name: '山西布政使司 (太原)',
    lat: 37.87,
    lng: 112.53,
    type: 'city',
    description: '晋王藩封地，表里山河，不仅是晋商发源地，也是支援九边重镇的后勤基地。'
  },
  {
    id: 'shaanxi',
    name: '陕西布政使司 (西安)',
    lat: 34.34,
    lng: 108.94,
    type: 'city',
    description: '秦王藩封地，西北重镇，负责统筹防范西北游牧民族的军需。'
  }
];

export const mapRelations: MapRelation[] = [
  // --- 物流与驿路网 (Logistics & Postal Routes) ---
  {
    id: 'canal-north',
    from: 'beijing',
    to: 'shandong',
    type: 'route',
    description: '京杭大运河北段：崇祯元年，维系京师钱粮的生命线。'
  },
  {
    id: 'canal-mid',
    from: 'shandong',
    to: 'nanjing',
    type: 'route',
    description: '京杭大运河中段：连通江淮与齐鲁，南粮北调的咽喉。'
  },
  {
    id: 'canal-south',
    from: 'nanjing',
    to: 'zhejiang',
    type: 'route',
    description: '京杭大运河南段：将江南财富源源不断汇入帝国血脉。'
  },
  {
    id: 'route-sw-1',
    from: 'nanjing',
    to: 'huguang',
    type: 'route',
    description: '长江水路：应天府至武昌府的黄金水道，兵马钱粮西进枢纽。'
  },
  {
    id: 'route-sw-2',
    from: 'huguang',
    to: 'guizhou',
    type: 'route',
    description: '西南驿路：湖广通往贵州的兵马要道。'
  },
  {
    id: 'route-sw-3',
    from: 'guizhou',
    to: 'yunnan',
    type: 'route',
    description: '滇黔驿路：连接云贵两省，维系大明对西南边陲的控制。'
  },
  {
    id: 'route-nw-1',
    from: 'beijing',
    to: 'shanxi',
    type: 'route',
    description: '晋冀古道：京师通往太原的重要后勤与兵力调配线。'
  },
  {
    id: 'route-nw-2',
    from: 'shanxi',
    to: 'shaanxi',
    type: 'route',
    description: '秦晋古道：连通太原与西安，是西北镇压民变的主轴路线。'
  },
  {
    id: 'route-nw-3',
    from: 'shaanxi',
    to: 'sichuan',
    type: 'route',
    description: '蜀道：由关中平原穿越秦岭进入四川盆地。'
  },
  {
    id: 'route-south-1',
    from: 'nanjing',
    to: 'jiangxi',
    type: 'route',
    description: '江南驿路：由南京南下至南昌，文教与漕粮命脉。'
  },
  {
    id: 'route-south-2',
    from: 'jiangxi',
    to: 'guangdong',
    type: 'route',
    description: '梅岭古道：跨越南岭，沟通长江流域与岭南。'
  },
  
  // --- 九边防线 (Northern Defense Grid) ---
  {
    id: 'def-liao-ji',
    from: 'liaodong',
    to: 'shanhaiguan',
    type: 'defense',
    description: '辽东-山海关防线：崇祯元年，袁崇焕督师蓟辽，苦撑宁锦防线。'
  },
  {
    id: 'def-ji-xuan',
    from: 'shanhaiguan',
    to: 'jizhou',
    type: 'defense',
    description: '山海关-蓟州防线：拱卫京师东北的生命线。'
  },
  {
    id: 'def-xuan-da',
    from: 'jizhou',
    to: 'xuanfu',
    type: 'defense',
    description: '蓟州-宣府防线：京师正北方的长城核心防御区。'
  },
  {
    id: 'def-da-yan',
    from: 'xuanfu',
    to: 'datong',
    type: 'defense',
    description: '宣大防线：直面蒙古察哈尔部压力的前沿阵地。'
  },
  {
    id: 'def-yan-yu',
    from: 'datong',
    to: 'yulin',
    type: 'defense',
    description: '大同-榆林防线：横跨晋陕的长城堡垒链。'
  },
  {
    id: 'def-yu-ning',
    from: 'yulin',
    to: 'ningxia',
    type: 'defense',
    description: '陕北-宁夏防线：扼守黄河几字弯，防范套部蒙古。'
  },
  {
    id: 'def-ning-jiayu',
    from: 'ningxia',
    to: 'jiayuguan',
    type: 'defense',
    description: '宁夏-甘肃防线：河西走廊的军事连线，通往嘉峪关。'
  },
  {
    id: 'def-jiayu-hami',
    from: 'jiayuguan',
    to: 'hami',
    type: 'defense',
    description: '嘉峪关-哈密卫：大明在西域残存的影响力投射线。'
  },
  {
    id: 'def-inner-passes',
    from: 'beijing',
    to: 'juyongguan',
    type: 'defense',
    description: '居庸关防线：京师最后的北大门。'
  },
  {
    id: 'def-outer-passes',
    from: 'datong',
    to: 'yanmenguan',
    type: 'defense',
    description: '雁门关防线：大同失守后的晋北第二道长城防线。'
  },
  {
    id: 'def-jianmen',
    from: 'shaanxi',
    to: 'jianmenguan',
    type: 'defense',
    description: '入蜀金牛道：连接关中与四川的军事天险。'
  },
  
  // --- 1628 崇祯元年危机线 (1628 Crisis Events) ---
  {
    id: 'crisis-houjin',
    from: 'jianzhou',
    to: 'liaodong',
    type: 'campaign',
    description: '【后金崛起危机】崇祯元年，皇太极在关外频频发难，辽东局势崩坏，大明国运受到最致命威胁。'
  },
  {
    id: 'crisis-peasant',
    from: 'yulin',
    to: 'shaanxi',
    type: 'campaign',
    description: '【陕北民变策源】崇祯元年陕西大旱，延绥镇士兵因缺饷哗变，王嘉胤等起事，拉开明末农民战争序幕。'
  },
  {
    id: 'crisis-mongol',
    from: 'tatar',
    to: 'datong',
    type: 'campaign',
    description: '【林丹汗西迁】受后金压迫，蒙古察哈尔部西迁，多次叩关大同、宣府，加剧了九边防线的崩溃。'
  },
  {
    id: 'route-fujian',
    from: 'zhejiang',
    to: 'fujian',
    type: 'route',
    description: '东南沿海驿道：连通江浙与福建的重要商贸与行政路线。'
  },
  {
    id: 'route-guangxi',
    from: 'guangdong',
    to: 'guangxi',
    type: 'route',
    description: '两广驿道：维系岭南地区统治的关键通道。'
  },
  {
    id: 'route-henan',
    from: 'beijing',
    to: 'henan',
    type: 'route',
    description: '京汉驿道：连接京师与中原腹地的干线。'
  }
];
