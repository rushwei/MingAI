/**
 * 中国城市数据 - 模块化城市列表
 * 
 * 用于出生地点智能输入的自动补全功能
 * 包含中国所有省级行政区和主要城市
 */

export interface CityInfo {
    /** 城市名称 */
    name: string;
    /** 所属省份 */
    province: string;
    /** 完整显示名称 */
    fullName: string;
}

/**
 * 中国城市列表
 * 包含4个直辖市、31个省会、主要地级市
 */
export const CHINA_CITIES: CityInfo[] = [
    // 直辖市
    { name: '北京市', province: '北京', fullName: '北京市' },
    { name: '上海市', province: '上海', fullName: '上海市' },
    { name: '天津市', province: '天津', fullName: '天津市' },
    { name: '重庆市', province: '重庆', fullName: '重庆市' },

    // 河北省
    { name: '石家庄', province: '河北', fullName: '河北省石家庄市' },
    { name: '唐山', province: '河北', fullName: '河北省唐山市' },
    { name: '秦皇岛', province: '河北', fullName: '河北省秦皇岛市' },
    { name: '保定', province: '河北', fullName: '河北省保定市' },
    { name: '邯郸', province: '河北', fullName: '河北省邯郸市' },
    { name: '廊坊', province: '河北', fullName: '河北省廊坊市' },

    // 山西省
    { name: '太原', province: '山西', fullName: '山西省太原市' },
    { name: '大同', province: '山西', fullName: '山西省大同市' },
    { name: '阳泉', province: '山西', fullName: '山西省阳泉市' },
    { name: '晋城', province: '山西', fullName: '山西省晋城市' },

    // 内蒙古
    { name: '呼和浩特', province: '内蒙古', fullName: '内蒙古呼和浩特市' },
    { name: '包头', province: '内蒙古', fullName: '内蒙古包头市' },
    { name: '赤峰', province: '内蒙古', fullName: '内蒙古赤峰市' },
    { name: '鄂尔多斯', province: '内蒙古', fullName: '内蒙古鄂尔多斯市' },

    // 辽宁省
    { name: '沈阳', province: '辽宁', fullName: '辽宁省沈阳市' },
    { name: '大连', province: '辽宁', fullName: '辽宁省大连市' },
    { name: '鞍山', province: '辽宁', fullName: '辽宁省鞍山市' },
    { name: '抚顺', province: '辽宁', fullName: '辽宁省抚顺市' },
    { name: '锦州', province: '辽宁', fullName: '辽宁省锦州市' },

    // 吉林省
    { name: '长春', province: '吉林', fullName: '吉林省长春市' },
    { name: '吉林市', province: '吉林', fullName: '吉林省吉林市' },
    { name: '四平', province: '吉林', fullName: '吉林省四平市' },
    { name: '延吉', province: '吉林', fullName: '吉林省延吉市' },

    // 黑龙江省
    { name: '哈尔滨', province: '黑龙江', fullName: '黑龙江省哈尔滨市' },
    { name: '齐齐哈尔', province: '黑龙江', fullName: '黑龙江省齐齐哈尔市' },
    { name: '大庆', province: '黑龙江', fullName: '黑龙江省大庆市' },
    { name: '牡丹江', province: '黑龙江', fullName: '黑龙江省牡丹江市' },

    // 江苏省
    { name: '南京', province: '江苏', fullName: '江苏省南京市' },
    { name: '苏州', province: '江苏', fullName: '江苏省苏州市' },
    { name: '无锡', province: '江苏', fullName: '江苏省无锡市' },
    { name: '常州', province: '江苏', fullName: '江苏省常州市' },
    { name: '南通', province: '江苏', fullName: '江苏省南通市' },
    { name: '扬州', province: '江苏', fullName: '江苏省扬州市' },
    { name: '徐州', province: '江苏', fullName: '江苏省徐州市' },
    { name: '镇江', province: '江苏', fullName: '江苏省镇江市' },
    { name: '泰州', province: '江苏', fullName: '江苏省泰州市' },
    { name: '盐城', province: '江苏', fullName: '江苏省盐城市' },

    // 浙江省
    { name: '杭州', province: '浙江', fullName: '浙江省杭州市' },
    { name: '宁波', province: '浙江', fullName: '浙江省宁波市' },
    { name: '温州', province: '浙江', fullName: '浙江省温州市' },
    { name: '嘉兴', province: '浙江', fullName: '浙江省嘉兴市' },
    { name: '湖州', province: '浙江', fullName: '浙江省湖州市' },
    { name: '绍兴', province: '浙江', fullName: '浙江省绍兴市' },
    { name: '金华', province: '浙江', fullName: '浙江省金华市' },
    { name: '台州', province: '浙江', fullName: '浙江省台州市' },

    // 安徽省
    { name: '合肥', province: '安徽', fullName: '安徽省合肥市' },
    { name: '芜湖', province: '安徽', fullName: '安徽省芜湖市' },
    { name: '蚌埠', province: '安徽', fullName: '安徽省蚌埠市' },
    { name: '马鞍山', province: '安徽', fullName: '安徽省马鞍山市' },
    { name: '安庆', province: '安徽', fullName: '安徽省安庆市' },
    { name: '黄山', province: '安徽', fullName: '安徽省黄山市' },

    // 福建省
    { name: '福州', province: '福建', fullName: '福建省福州市' },
    { name: '厦门', province: '福建', fullName: '福建省厦门市' },
    { name: '泉州', province: '福建', fullName: '福建省泉州市' },
    { name: '漳州', province: '福建', fullName: '福建省漳州市' },
    { name: '莆田', province: '福建', fullName: '福建省莆田市' },

    // 江西省
    { name: '南昌', province: '江西', fullName: '江西省南昌市' },
    { name: '九江', province: '江西', fullName: '江西省九江市' },
    { name: '景德镇', province: '江西', fullName: '江西省景德镇市' },
    { name: '赣州', province: '江西', fullName: '江西省赣州市' },

    // 山东省
    { name: '济南', province: '山东', fullName: '山东省济南市' },
    { name: '青岛', province: '山东', fullName: '山东省青岛市' },
    { name: '烟台', province: '山东', fullName: '山东省烟台市' },
    { name: '威海', province: '山东', fullName: '山东省威海市' },
    { name: '潍坊', province: '山东', fullName: '山东省潍坊市' },
    { name: '淄博', province: '山东', fullName: '山东省淄博市' },
    { name: '临沂', province: '山东', fullName: '山东省临沂市' },
    { name: '济宁', province: '山东', fullName: '山东省济宁市' },
    { name: '泰安', province: '山东', fullName: '山东省泰安市' },
    { name: '日照', province: '山东', fullName: '山东省日照市' },

    // 河南省
    { name: '郑州', province: '河南', fullName: '河南省郑州市' },
    { name: '洛阳', province: '河南', fullName: '河南省洛阳市' },
    { name: '开封', province: '河南', fullName: '河南省开封市' },
    { name: '南阳', province: '河南', fullName: '河南省南阳市' },
    { name: '新乡', province: '河南', fullName: '河南省新乡市' },
    { name: '焦作', province: '河南', fullName: '河南省焦作市' },

    // 湖北省
    { name: '武汉', province: '湖北', fullName: '湖北省武汉市' },
    { name: '宜昌', province: '湖北', fullName: '湖北省宜昌市' },
    { name: '襄阳', province: '湖北', fullName: '湖北省襄阳市' },
    { name: '荆州', province: '湖北', fullName: '湖北省荆州市' },
    { name: '十堰', province: '湖北', fullName: '湖北省十堰市' },

    // 湖南省
    { name: '长沙', province: '湖南', fullName: '湖南省长沙市' },
    { name: '株洲', province: '湖南', fullName: '湖南省株洲市' },
    { name: '湘潭', province: '湖南', fullName: '湖南省湘潭市' },
    { name: '衡阳', province: '湖南', fullName: '湖南省衡阳市' },
    { name: '岳阳', province: '湖南', fullName: '湖南省岳阳市' },
    { name: '常德', province: '湖南', fullName: '湖南省常德市' },

    // 广东省
    { name: '广州', province: '广东', fullName: '广东省广州市' },
    { name: '深圳', province: '广东', fullName: '广东省深圳市' },
    { name: '珠海', province: '广东', fullName: '广东省珠海市' },
    { name: '东莞', province: '广东', fullName: '广东省东莞市' },
    { name: '佛山', province: '广东', fullName: '广东省佛山市' },
    { name: '惠州', province: '广东', fullName: '广东省惠州市' },
    { name: '中山', province: '广东', fullName: '广东省中山市' },
    { name: '汕头', province: '广东', fullName: '广东省汕头市' },
    { name: '江门', province: '广东', fullName: '广东省江门市' },
    { name: '湛江', province: '广东', fullName: '广东省湛江市' },

    // 广西
    { name: '南宁', province: '广西', fullName: '广西南宁市' },
    { name: '桂林', province: '广西', fullName: '广西桂林市' },
    { name: '柳州', province: '广西', fullName: '广西柳州市' },
    { name: '北海', province: '广西', fullName: '广西北海市' },

    // 海南省
    { name: '海口', province: '海南', fullName: '海南省海口市' },
    { name: '三亚', province: '海南', fullName: '海南省三亚市' },

    // 四川省
    { name: '成都', province: '四川', fullName: '四川省成都市' },
    { name: '绵阳', province: '四川', fullName: '四川省绵阳市' },
    { name: '德阳', province: '四川', fullName: '四川省德阳市' },
    { name: '宜宾', province: '四川', fullName: '四川省宜宾市' },
    { name: '泸州', province: '四川', fullName: '四川省泸州市' },
    { name: '乐山', province: '四川', fullName: '四川省乐山市' },
    { name: '南充', province: '四川', fullName: '四川省南充市' },

    // 贵州省
    { name: '贵阳', province: '贵州', fullName: '贵州省贵阳市' },
    { name: '遵义', province: '贵州', fullName: '贵州省遵义市' },
    { name: '六盘水', province: '贵州', fullName: '贵州省六盘水市' },

    // 云南省
    { name: '昆明', province: '云南', fullName: '云南省昆明市' },
    { name: '大理', province: '云南', fullName: '云南省大理市' },
    { name: '丽江', province: '云南', fullName: '云南省丽江市' },
    { name: '曲靖', province: '云南', fullName: '云南省曲靖市' },
    { name: '玉溪', province: '云南', fullName: '云南省玉溪市' },

    // 西藏
    { name: '拉萨', province: '西藏', fullName: '西藏拉萨市' },
    { name: '日喀则', province: '西藏', fullName: '西藏日喀则市' },

    // 陕西省
    { name: '西安', province: '陕西', fullName: '陕西省西安市' },
    { name: '咸阳', province: '陕西', fullName: '陕西省咸阳市' },
    { name: '宝鸡', province: '陕西', fullName: '陕西省宝鸡市' },
    { name: '渭南', province: '陕西', fullName: '陕西省渭南市' },
    { name: '延安', province: '陕西', fullName: '陕西省延安市' },

    // 甘肃省
    { name: '兰州', province: '甘肃', fullName: '甘肃省兰州市' },
    { name: '天水', province: '甘肃', fullName: '甘肃省天水市' },
    { name: '酒泉', province: '甘肃', fullName: '甘肃省酒泉市' },

    // 青海省
    { name: '西宁', province: '青海', fullName: '青海省西宁市' },
    { name: '海东', province: '青海', fullName: '青海省海东市' },

    // 宁夏
    { name: '银川', province: '宁夏', fullName: '宁夏银川市' },
    { name: '石嘴山', province: '宁夏', fullName: '宁夏石嘴山市' },

    // 新疆
    { name: '乌鲁木齐', province: '新疆', fullName: '新疆乌鲁木齐市' },
    { name: '克拉玛依', province: '新疆', fullName: '新疆克拉玛依市' },
    { name: '吐鲁番', province: '新疆', fullName: '新疆吐鲁番市' },
    { name: '喀什', province: '新疆', fullName: '新疆喀什市' },

    // 特别行政区
    { name: '香港', province: '香港', fullName: '香港特别行政区' },
    { name: '澳门', province: '澳门', fullName: '澳门特别行政区' },

    // 台湾省
    { name: '台北', province: '台湾', fullName: '台湾省台北市' },
    { name: '高雄', province: '台湾', fullName: '台湾省高雄市' },
    { name: '台中', province: '台湾', fullName: '台湾省台中市' },
    { name: '台南', province: '台湾', fullName: '台湾省台南市' },
];

/**
 * 搜索城市
 * @param query 搜索关键词
 * @param limit 最大返回数量
 * @returns 匹配的城市列表
 */
export function searchCities(query: string, limit: number = 10): CityInfo[] {
    if (!query || query.trim() === '') {
        return [];
    }

    const normalizedQuery = query.trim().toLowerCase();

    return CHINA_CITIES
        .filter(city =>
            city.name.toLowerCase().includes(normalizedQuery) ||
            city.province.toLowerCase().includes(normalizedQuery) ||
            city.fullName.toLowerCase().includes(normalizedQuery)
        )
        .slice(0, limit);
}
