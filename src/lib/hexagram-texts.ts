/**
 * 六十四卦卦辞/爻辞库
 *
 * 包含完整的卦辞、象辞和爻辞，以及权重标记
 */

// 爻辞结构
export interface YaoText {
    position: number;      // 爻位 1-6
    name: string;          // 爻名 (初九、六二等)
    text: string;          // 爻辞内容
    emphasis: 'low' | 'medium' | 'high';  // 权重
    timing?: string;       // 时间暗示
}

// 卦辞结构
export interface HexagramText {
    name: string;          // 卦名
    gua: string;           // 卦辞
    xiang: string;         // 象辞
    yao: YaoText[];        // 六爻爻辞
}

/**
 * 64卦完整卦辞/爻辞
 * 键为卦名（如"乾为天"）
 */
export const HEXAGRAM_TEXTS: Record<string, HexagramText> = {
    '乾为天': {
        name: '乾为天',
        gua: '元亨利贞。',
        xiang: '天行健，君子以自强不息。',
        yao: [
            { position: 1, name: '初九', text: '潜龙勿用。', emphasis: 'medium', timing: '时机未到' },
            { position: 2, name: '九二', text: '见龙在田，利见大人。', emphasis: 'high', timing: '初显头角' },
            { position: 3, name: '九三', text: '君子终日乾乾，夕惕若厉，无咎。', emphasis: 'medium' },
            { position: 4, name: '九四', text: '或跃在渊，无咎。', emphasis: 'medium', timing: '进退皆宜' },
            { position: 5, name: '九五', text: '飞龙在天，利见大人。', emphasis: 'high', timing: '大展宏图' },
            { position: 6, name: '上九', text: '亢龙有悔。', emphasis: 'high', timing: '盛极必衰' },
        ],
    },
    '坤为地': {
        name: '坤为地',
        gua: '元亨，利牝马之贞。君子有攸往，先迷后得主，利西南得朋，东北丧朋。安贞吉。',
        xiang: '地势坤，君子以厚德载物。',
        yao: [
            { position: 1, name: '初六', text: '履霜，坚冰至。', emphasis: 'medium', timing: '渐进之象' },
            { position: 2, name: '六二', text: '直方大，不习无不利。', emphasis: 'high' },
            { position: 3, name: '六三', text: '含章可贞，或从王事，无成有终。', emphasis: 'medium' },
            { position: 4, name: '六四', text: '括囊，无咎无誉。', emphasis: 'low' },
            { position: 5, name: '六五', text: '黄裳，元吉。', emphasis: 'high', timing: '中正吉祥' },
            { position: 6, name: '上六', text: '龙战于野，其血玄黄。', emphasis: 'high', timing: '过刚则折' },
        ],
    },
    '水雷屯': {
        name: '水雷屯',
        gua: '元亨利贞，勿用有攸往，利建侯。',
        xiang: '云雷屯，君子以经纶。',
        yao: [
            { position: 1, name: '初九', text: '磐桓，利居贞，利建侯。', emphasis: 'medium', timing: '稳扎稳打' },
            { position: 2, name: '六二', text: '屯如邅如，乘马班如。匪寇婚媾，女子贞不字，十年乃字。', emphasis: 'high', timing: '十年' },
            { position: 3, name: '六三', text: '即鹿无虞，惟入于林中，君子几不如舍，往吝。', emphasis: 'medium' },
            { position: 4, name: '六四', text: '乘马班如，求婚媾，往吉无不利。', emphasis: 'high', timing: '适时而动' },
            { position: 5, name: '九五', text: '屯其膏，小贞吉，大贞凶。', emphasis: 'medium' },
            { position: 6, name: '上六', text: '乘马班如，泣血涟如。', emphasis: 'low', timing: '困顿之象' },
        ],
    },
    '山水蒙': {
        name: '山水蒙',
        gua: '亨。匪我求童蒙，童蒙求我。初筮告，再三渎，渎则不告。利贞。',
        xiang: '山下出泉，蒙；君子以果行育德。',
        yao: [
            { position: 1, name: '初六', text: '发蒙，利用刑人，用说桎梏，以往吝。', emphasis: 'medium' },
            { position: 2, name: '九二', text: '包蒙吉，纳妇吉，子克家。', emphasis: 'high' },
            { position: 3, name: '六三', text: '勿用取女，见金夫，不有躬，无攸利。', emphasis: 'low' },
            { position: 4, name: '六四', text: '困蒙，吝。', emphasis: 'low' },
            { position: 5, name: '六五', text: '童蒙，吉。', emphasis: 'high', timing: '虚心求教' },
            { position: 6, name: '上九', text: '击蒙，不利为寇，利御寇。', emphasis: 'medium' },
        ],
    },
    '水天需': {
        name: '水天需',
        gua: '有孚，光亨，贞吉。利涉大川。',
        xiang: '云上于天，需；君子以饮食宴乐。',
        yao: [
            { position: 1, name: '初九', text: '需于郊，利用恒，无咎。', emphasis: 'medium', timing: '耐心等待' },
            { position: 2, name: '九二', text: '需于沙，小有言，终吉。', emphasis: 'medium' },
            { position: 3, name: '九三', text: '需于泥，致寇至。', emphasis: 'low' },
            { position: 4, name: '六四', text: '需于血，出自穴。', emphasis: 'medium', timing: '险中求安' },
            { position: 5, name: '九五', text: '需于酒食，贞吉。', emphasis: 'high', timing: '从容待时' },
            { position: 6, name: '上六', text: '入于穴，有不速之客三人来，敬之终吉。', emphasis: 'medium' },
        ],
    },
    '天水讼': {
        name: '天水讼',
        gua: '有孚窒，惕中吉，终凶。利见大人，不利涉大川。',
        xiang: '天与水违行，讼；君子以作事谋始。',
        yao: [
            { position: 1, name: '初六', text: '不永所事，小有言，终吉。', emphasis: 'medium', timing: '及早收手' },
            { position: 2, name: '九二', text: '不克讼，归而逋，其邑人三百户无眚。', emphasis: 'medium' },
            { position: 3, name: '六三', text: '食旧德，贞厉，终吉，或从王事，无成。', emphasis: 'low' },
            { position: 4, name: '九四', text: '不克讼，复即命，渝安贞，吉。', emphasis: 'high', timing: '知退为进' },
            { position: 5, name: '九五', text: '讼，元吉。', emphasis: 'high' },
            { position: 6, name: '上九', text: '或锡之鞶带，终朝三褫之。', emphasis: 'low', timing: '得而复失' },
        ],
    },
    '地水师': {
        name: '地水师',
        gua: '贞，丈人吉，无咎。',
        xiang: '地中有水，师；君子以容民畜众。',
        yao: [
            { position: 1, name: '初六', text: '师出以律，否臧凶。', emphasis: 'high', timing: '纪律为先' },
            { position: 2, name: '九二', text: '在师中吉，无咎，王三锡命。', emphasis: 'high' },
            { position: 3, name: '六三', text: '师或舆尸，凶。', emphasis: 'low' },
            { position: 4, name: '六四', text: '师左次，无咎。', emphasis: 'medium', timing: '暂时退守' },
            { position: 5, name: '六五', text: '田有禽，利执言，无咎。长子帅师，弟子舆尸，贞凶。', emphasis: 'medium' },
            { position: 6, name: '上六', text: '大君有命，开国承家，小人勿用。', emphasis: 'high', timing: '论功行赏' },
        ],
    },
    '水地比': {
        name: '水地比',
        gua: '吉。原筮元永贞，无咎。不宁方来，后夫凶。',
        xiang: '地上有水，比；先王以建万国，亲诸侯。',
        yao: [
            { position: 1, name: '初六', text: '有孚比之，无咎。有孚盈缶，终来有他吉。', emphasis: 'high', timing: '诚信为本' },
            { position: 2, name: '六二', text: '比之自内，贞吉。', emphasis: 'high' },
            { position: 3, name: '六三', text: '比之匪人。', emphasis: 'low' },
            { position: 4, name: '六四', text: '外比之，贞吉。', emphasis: 'medium' },
            { position: 5, name: '九五', text: '显比，王用三驱，失前禽，邑人不诫，吉。', emphasis: 'high', timing: '宽宏大量' },
            { position: 6, name: '上六', text: '比之无首，凶。', emphasis: 'low', timing: '无所依附' },
        ],
    },
    '地天泰': {
        name: '地天泰',
        gua: '小往大来，吉亨。',
        xiang: '天地交，泰；后以财成天地之道，辅相天地之宜，以左右民。',
        yao: [
            { position: 1, name: '初九', text: '拔茅茹以其汇，征吉。', emphasis: 'high', timing: '携手同进' },
            { position: 2, name: '九二', text: '包荒，用冯河，不遐遗，朋亡，得尚于中行。', emphasis: 'high' },
            { position: 3, name: '九三', text: '无平不陂，无往不复，艰贞无咎，勿恤其孚，于食有福。', emphasis: 'medium', timing: '盛极思危' },
            { position: 4, name: '六四', text: '翩翩，不富以其邻，不戒以孚。', emphasis: 'medium' },
            { position: 5, name: '六五', text: '帝乙归妹，以祉元吉。', emphasis: 'high', timing: '大吉大利' },
            { position: 6, name: '上六', text: '城复于隍，勿用师，自邑告命，贞吝。', emphasis: 'low', timing: '泰极否来' },
        ],
    },
    '天地否': {
        name: '天地否',
        gua: '否之匪人，不利君子贞，大往小来。',
        xiang: '天地不交，否；君子以俭德辟难，不可荣以禄。',
        yao: [
            { position: 1, name: '初六', text: '拔茅茹以其汇，贞吉亨。', emphasis: 'medium', timing: '守正待时' },
            { position: 2, name: '六二', text: '包承，小人吉，大人否亨。', emphasis: 'medium' },
            { position: 3, name: '六三', text: '包羞。', emphasis: 'low' },
            { position: 4, name: '九四', text: '有命无咎，畴离祉。', emphasis: 'high', timing: '否极泰来' },
            { position: 5, name: '九五', text: '休否，大人吉。其亡其亡，系于苞桑。', emphasis: 'high', timing: '居安思危' },
            { position: 6, name: '上九', text: '倾否，先否后喜。', emphasis: 'high', timing: '否终则泰' },
        ],
    },
    '坎为水': {
        name: '坎为水',
        gua: '习坎，有孚，维心亨，行有尚。',
        xiang: '水洊至，习坎；君子以常德行，习教事。',
        yao: [
            { position: 1, name: '初六', text: '习坎，入于坎窞，凶。', emphasis: 'low', timing: '险上加险' },
            { position: 2, name: '九二', text: '坎有险，求小得。', emphasis: 'medium' },
            { position: 3, name: '六三', text: '来之坎坎，险且枕，入于坎窞，勿用。', emphasis: 'low' },
            { position: 4, name: '六四', text: '樽酒簋贰，用缶，纳约自牖，终无咎。', emphasis: 'medium', timing: '诚心化险' },
            { position: 5, name: '九五', text: '坎不盈，祗既平，无咎。', emphasis: 'high', timing: '险中求安' },
            { position: 6, name: '上六', text: '系用徽纆，寘于丛棘，三岁不得，凶。', emphasis: 'low', timing: '三年' },
        ],
    },
    '离为火': {
        name: '离为火',
        gua: '利贞，亨。畜牝牛，吉。',
        xiang: '明两作，离；大人以继明照于四方。',
        yao: [
            { position: 1, name: '初九', text: '履错然，敬之无咎。', emphasis: 'medium', timing: '谨慎开始' },
            { position: 2, name: '六二', text: '黄离，元吉。', emphasis: 'high', timing: '中正吉祥' },
            { position: 3, name: '九三', text: '日昃之离，不鼓缶而歌，则大耋之嗟，凶。', emphasis: 'low', timing: '日暮途穷' },
            { position: 4, name: '九四', text: '突如其来如，焚如，死如，弃如。', emphasis: 'low' },
            { position: 5, name: '六五', text: '出涕沱若，戚嗟若，吉。', emphasis: 'high', timing: '忧患意识' },
            { position: 6, name: '上九', text: '王用出征，有嘉折首，获匪其丑，无咎。', emphasis: 'medium' },
        ],
    },
    '水火既济': {
        name: '水火既济',
        gua: '亨，小利贞，初吉终乱。',
        xiang: '水在火上，既济；君子以思患而预防之。',
        yao: [
            { position: 1, name: '初九', text: '曳其轮，濡其尾，无咎。', emphasis: 'medium', timing: '谨慎前行' },
            { position: 2, name: '六二', text: '妇丧其茀，勿逐，七日得。', emphasis: 'high', timing: '七日' },
            { position: 3, name: '九三', text: '高宗伐鬼方，三年克之，小人勿用。', emphasis: 'medium', timing: '三年' },
            { position: 4, name: '六四', text: '繻有衣袽，终日戒。', emphasis: 'medium' },
            { position: 5, name: '九五', text: '东邻杀牛，不如西邻之禴祭，实受其福。', emphasis: 'high', timing: '诚心为要' },
            { position: 6, name: '上六', text: '濡其首，厉。', emphasis: 'low', timing: '过犹不及' },
        ],
    },
    '火水未济': {
        name: '火水未济',
        gua: '亨，小狐汔济，濡其尾，无攸利。',
        xiang: '火在水上，未济；君子以慎辨物居方。',
        yao: [
            { position: 1, name: '初六', text: '濡其尾，吝。', emphasis: 'low' },
            { position: 2, name: '九二', text: '曳其轮，贞吉。', emphasis: 'high', timing: '稳步前进' },
            { position: 3, name: '六三', text: '未济，征凶，利涉大川。', emphasis: 'medium' },
            { position: 4, name: '九四', text: '贞吉，悔亡，震用伐鬼方，三年有赏于大国。', emphasis: 'high', timing: '三年' },
            { position: 5, name: '六五', text: '贞吉，无悔，君子之光，有孚，吉。', emphasis: 'high', timing: '光明正大' },
            { position: 6, name: '上九', text: '有孚于饮酒，无咎，濡其首，有孚失是。', emphasis: 'medium' },
        ],
    },
    // 其他常用卦
    '风天小畜': {
        name: '风天小畜',
        gua: '亨，密云不雨，自我西郊。',
        xiang: '风行天上，小畜；君子以懿文德。',
        yao: [
            { position: 1, name: '初九', text: '复自道，何其咎，吉。', emphasis: 'medium' },
            { position: 2, name: '九二', text: '牵复，吉。', emphasis: 'high' },
            { position: 3, name: '九三', text: '舆说辐，夫妻反目。', emphasis: 'low' },
            { position: 4, name: '六四', text: '有孚，血去惕出，无咎。', emphasis: 'medium' },
            { position: 5, name: '九五', text: '有孚挛如，富以其邻。', emphasis: 'high' },
            { position: 6, name: '上九', text: '既雨既处，尚德载，妇贞厉，月几望，君子征凶。', emphasis: 'medium', timing: '月望' },
        ],
    },
    '天泽履': {
        name: '天泽履',
        gua: '履虎尾，不咥人，亨。',
        xiang: '上天下泽，履；君子以辨上下，定民志。',
        yao: [
            { position: 1, name: '初九', text: '素履往，无咎。', emphasis: 'medium', timing: '朴素前行' },
            { position: 2, name: '九二', text: '履道坦坦，幽人贞吉。', emphasis: 'high' },
            { position: 3, name: '六三', text: '眇能视，跛能履，履虎尾，咥人凶，武人为于大君。', emphasis: 'low' },
            { position: 4, name: '九四', text: '履虎尾，愬愬终吉。', emphasis: 'high', timing: '谨慎则吉' },
            { position: 5, name: '九五', text: '夬履，贞厉。', emphasis: 'medium' },
            { position: 6, name: '上九', text: '视履考祥，其旋元吉。', emphasis: 'high', timing: '善始善终' },
        ],
    },
    '雷地豫': {
        name: '雷地豫',
        gua: '利建侯行师。',
        xiang: '雷出地奋，豫；先王以作乐崇德，殷荐之上帝，以配祖考。',
        yao: [
            { position: 1, name: '初六', text: '鸣豫，凶。', emphasis: 'low' },
            { position: 2, name: '六二', text: '介于石，不终日，贞吉。', emphasis: 'high', timing: '当机立断' },
            { position: 3, name: '六三', text: '盱豫悔，迟有悔。', emphasis: 'low' },
            { position: 4, name: '九四', text: '由豫，大有得，勿疑，朋盍簪。', emphasis: 'high' },
            { position: 5, name: '六五', text: '贞疾，恒不死。', emphasis: 'medium' },
            { position: 6, name: '上六', text: '冥豫成，有渝无咎。', emphasis: 'medium', timing: '迷途知返' },
        ],
    },
    '山天大畜': {
        name: '山天大畜',
        gua: '利贞，不家食吉，利涉大川。',
        xiang: '天在山中，大畜；君子以多识前言往行，以畜其德。',
        yao: [
            { position: 1, name: '初九', text: '有厉利已。', emphasis: 'medium', timing: '暂停积累' },
            { position: 2, name: '九二', text: '舆说輹。', emphasis: 'medium' },
            { position: 3, name: '九三', text: '良马逐，利艰贞，曰闲舆卫，利有攸往。', emphasis: 'high', timing: '厚积薄发' },
            { position: 4, name: '六四', text: '童牛之牿，元吉。', emphasis: 'high' },
            { position: 5, name: '六五', text: '豮豕之牙，吉。', emphasis: 'high' },
            { position: 6, name: '上九', text: '何天之衢，亨。', emphasis: 'high', timing: '大道畅通' },
        ],
    },
    '泽火革': {
        name: '泽火革',
        gua: '已日乃孚，元亨利贞，悔亡。',
        xiang: '泽中有火，革；君子以治历明时。',
        yao: [
            { position: 1, name: '初九', text: '巩用黄牛之革。', emphasis: 'medium', timing: '巩固基础' },
            { position: 2, name: '六二', text: '已日乃革之，征吉，无咎。', emphasis: 'high', timing: '时机成熟' },
            { position: 3, name: '九三', text: '征凶，贞厉，革言三就，有孚。', emphasis: 'medium', timing: '三思后行' },
            { position: 4, name: '九四', text: '悔亡，有孚改命，吉。', emphasis: 'high', timing: '改革得宜' },
            { position: 5, name: '九五', text: '大人虎变，未占有孚。', emphasis: 'high', timing: '大刀阔斧' },
            { position: 6, name: '上六', text: '君子豹变，小人革面，征凶，居贞吉。', emphasis: 'medium' },
        ],
    },
    '火风鼎': {
        name: '火风鼎',
        gua: '元吉，亨。',
        xiang: '木上有火，鼎；君子以正位凝命。',
        yao: [
            { position: 1, name: '初六', text: '鼎颠趾，利出否，得妾以其子，无咎。', emphasis: 'medium' },
            { position: 2, name: '九二', text: '鼎有实，我仇有疾，不我能即，吉。', emphasis: 'high' },
            { position: 3, name: '九三', text: '鼎耳革，其行塞，雉膏不食，方雨亏悔，终吉。', emphasis: 'medium', timing: '终吉' },
            { position: 4, name: '九四', text: '鼎折足，覆公餗，其形渥，凶。', emphasis: 'low' },
            { position: 5, name: '六五', text: '鼎黄耳金铉，利贞。', emphasis: 'high', timing: '得遇贵人' },
            { position: 6, name: '上九', text: '鼎玉铉，大吉，无不利。', emphasis: 'high', timing: '大吉大利' },
        ],
    },
    '震为雷': {
        name: '震为雷',
        gua: '亨。震来虩虩，笑言哑哑。震惊百里，不丧匕鬯。',
        xiang: '洊雷，震；君子以恐惧修省。',
        yao: [
            { position: 1, name: '初九', text: '震来虩虩，后笑言哑哑，吉。', emphasis: 'high', timing: '先惊后喜' },
            { position: 2, name: '六二', text: '震来厉，亿丧贝，跻于九陵，勿逐，七日得。', emphasis: 'medium', timing: '七日' },
            { position: 3, name: '六三', text: '震苏苏，震行无眚。', emphasis: 'medium' },
            { position: 4, name: '九四', text: '震遂泥。', emphasis: 'low' },
            { position: 5, name: '六五', text: '震往来厉，亿无丧，有事。', emphasis: 'medium' },
            { position: 6, name: '上六', text: '震索索，视矍矍，征凶。震不于其躬，于其邻，无咎。婚媾有言。', emphasis: 'low' },
        ],
    },
    '艮为山': {
        name: '艮为山',
        gua: '艮其背，不获其身，行其庭，不见其人，无咎。',
        xiang: '兼山，艮；君子以思不出其位。',
        yao: [
            { position: 1, name: '初六', text: '艮其趾，无咎，利永贞。', emphasis: 'medium', timing: '止于初始' },
            { position: 2, name: '六二', text: '艮其腓，不拯其随，其心不快。', emphasis: 'medium' },
            { position: 3, name: '九三', text: '艮其限，列其夤，厉薰心。', emphasis: 'low' },
            { position: 4, name: '六四', text: '艮其身，无咎。', emphasis: 'high' },
            { position: 5, name: '六五', text: '艮其辅，言有序，悔亡。', emphasis: 'high', timing: '慎言' },
            { position: 6, name: '上九', text: '敦艮，吉。', emphasis: 'high', timing: '止于至善' },
        ],
    },
    '巽为风': {
        name: '巽为风',
        gua: '小亨，利有攸往，利见大人。',
        xiang: '随风，巽；君子以申命行事。',
        yao: [
            { position: 1, name: '初六', text: '进退，利武人之贞。', emphasis: 'medium' },
            { position: 2, name: '九二', text: '巽在床下，用史巫纷若，吉无咎。', emphasis: 'high' },
            { position: 3, name: '九三', text: '频巽，吝。', emphasis: 'low' },
            { position: 4, name: '六四', text: '悔亡，田获三品。', emphasis: 'high', timing: '收获丰厚' },
            { position: 5, name: '九五', text: '贞吉悔亡，无不利，无初有终，先庚三日，后庚三日，吉。', emphasis: 'high', timing: '三日' },
            { position: 6, name: '上九', text: '巽在床下，丧其资斧，贞凶。', emphasis: 'low' },
        ],
    },
    '兑为泽': {
        name: '兑为泽',
        gua: '亨，利贞。',
        xiang: '丽泽，兑；君子以朋友讲习。',
        yao: [
            { position: 1, name: '初九', text: '和兑，吉。', emphasis: 'high', timing: '和悦吉祥' },
            { position: 2, name: '九二', text: '孚兑，吉，悔亡。', emphasis: 'high' },
            { position: 3, name: '六三', text: '来兑，凶。', emphasis: 'low' },
            { position: 4, name: '九四', text: '商兑未宁，介疾有喜。', emphasis: 'medium' },
            { position: 5, name: '九五', text: '孚于剥，有厉。', emphasis: 'medium' },
            { position: 6, name: '上六', text: '引兑。', emphasis: 'medium' },
        ],
    },
};

/**
 * 获取卦辞爻辞
 */
export function getHexagramText(name: string): HexagramText | undefined {
    return HEXAGRAM_TEXTS[name];
}

/**
 * 获取特定爻的爻辞
 */
export function getYaoText(hexagramName: string, position: number): YaoText | undefined {
    const hex = HEXAGRAM_TEXTS[hexagramName];
    if (!hex) return undefined;
    return hex.yao.find(y => y.position === position);
}

/**
 * 获取高权重爻位
 */
export function getHighEmphasisYaos(hexagramName: string): number[] {
    const hex = HEXAGRAM_TEXTS[hexagramName];
    if (!hex) return [];
    return hex.yao.filter(y => y.emphasis === 'high').map(y => y.position);
}

/**
 * 检查是否有时间提示
 */
export function hasTimingHint(hexagramName: string, position: number): string | undefined {
    const yao = getYaoText(hexagramName, position);
    return yao?.timing;
}
