/**
 * 六爻分析处理器
 * 完整实现六爻分析功能
 */
import { Solar } from 'lunar-javascript';
import { createSeededRng, resolveSeed } from '../seeded-rng.js';
// 旺衰标签
const WANG_SHUAI_LABELS = {
    wang: '旺', xiang: '相', xiu: '休', qiu: '囚', si: '死',
};
// 空亡状态标签
const KONG_WANG_LABELS = {
    'not_kong': '',
    'kong_static': '空',
    'kong_changing': '动空',
    'kong_ri_chong': '冲空',
    'kong_yue_jian': '临建',
};
// 卦辞（周易原文）
const GUA_CI = {
    '乾为天': '乾：元，亨，利，贞。',
    '坤为地': '坤：元，亨，利牝马之贞。君子有攸往，先迷后得主，利西南得朋，东北丧朋。安贞，吉。',
    '水雷屯': '屯：元，亨，利，贞，勿用，有攸往，利建侯。',
    '山水蒙': '蒙：亨。匪我求童蒙，童蒙求我。初筮告，再三渎，渎则不告。利贞。',
    '水天需': '需：有孚，光亨，贞吉。利涉大川。',
    '天水讼': '讼：有孚，窒。惕中吉。终凶。利见大人，不利涉大川。',
    '地水师': '师：贞，丈人，吉，无咎。',
    '水地比': '比：吉。原筮元永贞，无咎。不宁方来，后夫凶。',
    '风天小畜': '小畜：亨。密云不雨，自我西郊。',
    '天泽履': '履：履虎尾，不咥人，亨。',
    '地天泰': '泰：小往大来，吉亨。',
    '天地否': '否：否之匪人，不利君子贞，大往小来。',
    '天火同人': '同人：同人于野，亨。利涉大川，利君子贞。',
    '火天大有': '大有：元亨。',
    '地山谦': '谦：亨，君子有终。',
    '雷地豫': '豫：利建侯行师。',
    '泽雷随': '随：元亨利贞，无咎。',
    '山风蛊': '蛊：元亨，利涉大川。先甲三日，后甲三日。',
    '地泽临': '临：元，亨，利，贞。至于八月有凶。',
    '风地观': '观：盥而不荐，有孚颙若。',
    '火雷噬嗑': '噬嗑：亨。利用狱。',
    '山火贲': '贲：亨。小利有攸往。',
    '山地剥': '剥：不利有攸往。',
    '地雷复': '复：亨。出入无疾，朋来无咎。反复其道，七日来复，利有攸往。',
    '天雷无妄': '无妄：元，亨，利，贞。其匪正有眚，不利有攸往。',
    '山天大畜': '大畜：利贞，不家食吉，利涉大川。',
    '山雷颐': '颐：贞吉。观颐，自求口实。',
    '泽风大过': '大过：栋桡，利有攸往，亨。',
    '坎为水': '坎：习坎，有孚，维心亨，行有尚。',
    '离为火': '离：利贞，亨。畜牝牛，吉。',
    '泽山咸': '咸：亨，利贞，取女吉。',
    '雷风恒': '恒：亨，无咎，利贞，利有攸往。',
    '天山遯': '遯：亨，小利贞。',
    '雷天大壮': '大壮：利贞。',
    '火地晋': '晋：康侯用锡马蕃庶，昼日三接。',
    '地火明夷': '明夷：利艰贞。',
    '风火家人': '家人：利女贞。',
    '火泽睽': '睽：小事吉。',
    '水山蹇': '蹇：利西南，不利东北。利见大人，贞吉。',
    '雷水解': '解：利西南，无所往，其来复吉。有攸往，夙吉。',
    '山泽损': '损：有孚，元吉，无咎，可贞，利有攸往。曷之用，二簋可用享。',
    '风雷益': '益：利有攸往，利涉大川。',
    '泽天夬': '夬：扬于王庭，孚号，有厉，告自邑，不利即戎，利有攸往。',
    '天风姤': '姤：女壮，勿用取女。',
    '泽地萃': '萃：亨。王假有庙，利见大人，亨，利贞。用大牲吉，利有攸往。',
    '地风升': '升：元亨，用见大人，勿恤，南征吉。',
    '泽水困': '困：亨，贞，大人吉，无咎，有言不信。',
    '水风井': '井：改邑不改井，无丧无得，往来井井。汔至，亦未繘井，羸其瓶，凶。',
    '泽火革': '革：己日乃孚，元亨利贞，悔亡。',
    '火风鼎': '鼎：元吉，亨。',
    '震为雷': '震：亨。震来虩虩，笑言哑哑。震惊百里，不丧匕鬯。',
    '艮为山': '艮：艮其背，不获其身，行其庭，不见其人，无咎。',
    '风山渐': '渐：女归吉，利贞。',
    '雷泽归妹': '归妹：征凶，无攸利。',
    '雷火丰': '丰：亨，王假之，勿忧，宜日中。',
    '火山旅': '旅：小亨，旅贞吉。',
    '巽为风': '巽：小亨，利攸往，利见大人。',
    '兑为泽': '兑：亨，利贞。',
    '风水涣': '涣：亨。王假有庙，利涉大川，利贞。',
    '水泽节': '节：亨。苦节不可贞。',
    '风泽中孚': '中孚：豚鱼吉，利涉大川，利贞。',
    '雷山小过': '小过：亨，利贞，可小事，不可大事。飞鸟遗之音，不宜上宜下，大吉。',
    '水火既济': '既济：亨，小利贞，初吉终乱。',
    '火水未济': '未济：亨，小狐汔济，濡其尾，无攸利。',
};
// 象辞
const XIANG_CI = {
    '乾为天': '天行健，君子以自强不息。',
    '坤为地': '地势坤，君子以厚德载物。',
    '水雷屯': '云雷，屯；君子以经纶。',
    '山水蒙': '山下出泉，蒙；君子以果行育德。',
    '水天需': '云上于天，需；君子以饮食宴乐。',
    '天水讼': '天与水违行，讼；君子以作事谋始。',
    '地水师': '地中有水，师；君子以容民畜众。',
    '水地比': '地上有水，比；先王以建万国，亲诸侯。',
    '风天小畜': '风行天上，小畜；君子以懿文德。',
    '天泽履': '上天下泽，履；君子以辨上下，定民志。',
    '地天泰': '天地交，泰；后以财成天地之道，辅相天地之宜，以左右民。',
    '天地否': '天地不交，否；君子以俭德辟难，不可荣以禄。',
    '天火同人': '天与火，同人；君子以类族辨物。',
    '火天大有': '火在天上，大有；君子以遏恶扬善，顺天休命。',
    '地山谦': '地中有山，谦；君子以裒多益寡，称物平施。',
    '雷地豫': '雷出地奋，豫；先王以作乐崇德，殷荐之上帝，以配祖考。',
    '泽雷随': '泽中有雷，随；君子以向晦入宴息。',
    '山风蛊': '山下有风，蛊；君子以振民育德。',
    '地泽临': '泽上有地，临；君子以教思无穷，容保民无疆。',
    '风地观': '风行地上，观；先王以省方观民设教。',
    '火雷噬嗑': '雷电噬嗑；先王以明罚敕法。',
    '山火贲': '山下有火，贲；君子以明庶政，无敢折狱。',
    '山地剥': '山附地上，剥；上以厚下，安宅。',
    '地雷复': '雷在地中，复；先王以至日闭关，商旅不行，后不省方。',
    '天雷无妄': '天下雷行，物与无妄；先王以茂对时，育万物。',
    '山天大畜': '天在山中，大畜；君子以多识前言往行，以畜其德。',
    '山雷颐': '山下有雷，颐；君子以慎言语，节饮食。',
    '泽风大过': '泽灭木，大过；君子以独立不惧，遁世无闷。',
    '坎为水': '水洊至，习坎；君子以常德行，习教事。',
    '离为火': '明两作，离；大人以继明照于四方。',
    '泽山咸': '山上有泽，咸；君子以虚受人。',
    '雷风恒': '雷风，恒；君子以立不易方。',
    '天山遯': '天下有山，遯；君子以远小人，不恶而严。',
    '雷天大壮': '雷在天上，大壮；君子以非礼弗履。',
    '火地晋': '明出地上，晋；君子以自昭明德。',
    '地火明夷': '明入地中，明夷；君子以莅众，用晦而明。',
    '风火家人': '风自火出，家人；君子以言有物，而行有恒。',
    '火泽睽': '上火下泽，睽；君子以同而异。',
    '水山蹇': '山上有水，蹇；君子以反身修德。',
    '雷水解': '雷雨作，解；君子以赦过宥罪。',
    '山泽损': '山下有泽，损；君子以惩忿窒欲。',
    '风雷益': '风雷，益；君子以见善则迁，有过则改。',
    '泽天夬': '泽上于天，夬；君子以施禄及下，居德则忌。',
    '天风姤': '天下有风，姤；后以施命诰四方。',
    '泽地萃': '泽上于地，萃；君子以除戎器，戒不虞。',
    '地风升': '地中生木，升；君子以顺德，积小以高大。',
    '泽水困': '泽无水，困；君子以致命遂志。',
    '水风井': '木上有水，井；君子以劳民劝相。',
    '泽火革': '泽中有火，革；君子以治历明时。',
    '火风鼎': '木上有火，鼎；君子以正位凝命。',
    '震为雷': '洊雷，震；君子以恐惧修省。',
    '艮为山': '兼山，艮；君子以思不出其位。',
    '风山渐': '山上有木，渐；君子以居贤德善俗。',
    '雷泽归妹': '泽上有雷，归妹；君子以永终知敝。',
    '雷火丰': '雷电皆至，丰；君子以折狱致刑。',
    '火山旅': '山上有火，旅；君子以明慎用刑，而不留狱。',
    '巽为风': '随风，巽；君子以申命行事。',
    '兑为泽': '丽泽，兑；君子以朋友讲习。',
    '风水涣': '风行水上，涣；先王以享于帝立庙。',
    '水泽节': '泽上有水，节；君子以制数度，议德行。',
    '风泽中孚': '泽上有风，中孚；君子以议狱缓死。',
    '雷山小过': '山上有雷，小过；君子以行过乎恭，丧过乎哀，用过乎俭。',
    '水火既济': '水在火上，既济；君子以思患而预防之。',
    '火水未济': '火在水上，未济；君子以慎辨物居方。',
};
// 卦辞简介
const HEXAGRAM_BRIEF = {
    '乾为天': '元亨利贞，君子自强不息。',
    '坤为地': '厚德载物，柔顺利贞。',
    '水雷屯': '万事开头难，需耐心等待时机。',
    '山水蒙': '蒙昧待启，虚心求教。',
    '水天需': '需要等待，养精蓄锐。',
    '天水讼': '争讼之象，宜和解退让。',
    '地水师': '众军出征，师出有名。',
    '水地比': '亲比和睦，广结善缘。',
    '风天小畜': '小有积蓄，量力而行。',
    '天泽履': '如履薄冰，谨慎行事。',
    '地天泰': '天地交泰，万事亨通。',
    '天地否': '天地不交，闭塞不通。',
    '天火同人': '志同道合，和衷共济。',
    '火天大有': '大有收获，富贵荣华。',
    '地山谦': '谦虚谨慎，受益无穷。',
    '雷地豫': '顺时而动，和乐安详。',
    '泽雷随': '随机应变，顺势而为。',
    '山风蛊': '整治弊端，革故鼎新。',
    '地泽临': '居高临下，亲民爱物。',
    '风地观': '观察形势，审时度势。',
    '火雷噬嗑': '刚柔相济，决断明快。',
    '山火贲': '文饰修养，内外兼修。',
    '山地剥': '剥落衰败，静待时机。',
    '地雷复': '一阳来复，否极泰来。',
    '天雷无妄': '无妄之灾，谨言慎行。',
    '山天大畜': '大有积蓄，厚积薄发。',
    '山雷颐': '颐养正道，慎言节食。',
    '泽风大过': '大过之时，独立不惧。',
    '坎为水': '险陷重重，以诚待人。',
    '离为火': '附丽光明，柔顺中正。',
    '泽山咸': '感应相通，男女和合。',
    '雷风恒': '恒久不变，持之以恒。',
    '天山遯': '退避隐遁，明哲保身。',
    '雷天大壮': '刚强壮盛，戒骄戒躁。',
    '火地晋': '日出地上，晋升有望。',
    '地火明夷': '光明受损，韬光养晦。',
    '风火家人': '家道正，天下定。',
    '火泽睽': '乖离背道，求同存异。',
    '水山蹇': '行路艰难，知难而退。',
    '雷水解': '解除困难，雨过天晴。',
    '山泽损': '损己益人，先损后益。',
    '风雷益': '损上益下，利有攸往。',
    '泽天夬': '决断刚毅，扬善去恶。',
    '天风姤': '不期而遇，柔遇刚也。',
    '泽地萃': '聚集汇合，顺天应人。',
    '地风升': '积小成大，步步高升。',
    '泽水困': '困顿穷厄，守正待时。',
    '水风井': '井养不穷，取之不竭。',
    '泽火革': '革故鼎新，顺天应人。',
    '火风鼎': '鼎新革故，养贤育才。',
    '震为雷': '震动惊惧，恐惧修省。',
    '艮为山': '止而不动，知止则吉。',
    '风山渐': '循序渐进，稳步前行。',
    '雷泽归妹': '归妹待时，守正不移。',
    '雷火丰': '丰盛光明，日中则昃。',
    '火山旅': '旅途在外，小心谨慎。',
    '巽为风': '顺入柔和，谦逊有礼。',
    '兑为泽': '喜悦和乐，利于交往。',
    '风水涣': '涣散离析，聚合人心。',
    '水泽节': '节制有度，苦节不可。',
    '风泽中孚': '诚信感人，中心诚信。',
    '雷山小过': '小有过越，宜下不宜上。',
    '水火既济': '功成名就，守成为要。',
    '火水未济': '未能成功，继续努力。',
};
// 爻辞数据（卦名 -> 六爻爻辞数组，从初爻到上爻）
const YAO_CI = {
    '乾为天': [
        '初九：潜龙勿用。',
        '九二：见龙在田，利见大人。',
        '九三：君子终日乾乾，夕惕若厉，无咎。',
        '九四：或跃在渊，无咎。',
        '九五：飞龙在天，利见大人。',
        '上九：亢龙有悔。',
    ],
    '坤为地': [
        '初六：履霜，坚冰至。',
        '六二：直，方，大，不习无不利。',
        '六三：含章可贞。或从王事，无成有终。',
        '六四：括囊，无咎，无誉。',
        '六五：黄裳，元吉。',
        '上六：龙战于野，其血玄黄。',
    ],
    '水雷屯': [
        '初九：磐桓，利居贞，利建侯。',
        '六二：屯如邅如，乘马班如。匪寇婚媾，女子贞不字，十年乃字。',
        '六三：即鹿无虞，惟入于林中，君子几不如舍，往吝。',
        '六四：乘马班如，求婚媾，往吉，无不利。',
        '九五：屯其膏，小贞吉，大贞凶。',
        '上六：乘马班如，泣血涟如。',
    ],
    '山水蒙': [
        '初六：发蒙，利用刑人，用说桎梏，以往吝。',
        '九二：包蒙吉；纳妇吉；子克家。',
        '六三：勿用取女；见金夫，不有躬，无攸利。',
        '六四：困蒙，吝。',
        '六五：童蒙，吉。',
        '上九：击蒙；不利为寇，利御寇。',
    ],
    '水天需': [
        '初九：需于郊。利用恒，无咎。',
        '九二：需于沙。小有言，终吉。',
        '九三：需于泥，致寇至。',
        '六四：需于血，出自穴。',
        '九五：需于酒食，贞吉。',
        '上六：入于穴，有不速之客三人来，敬之终吉。',
    ],
    '天水讼': [
        '初六：不永所事，小有言，终吉。',
        '九二：不克讼，归而逋，其邑人三百户，无眚。',
        '六三：食旧德，贞厉，终吉，或从王事，无成。',
        '九四：不克讼，复即命，渝安贞，吉。',
        '九五：讼元吉。',
        '上九：或锡之鞶带，终朝三褫之。',
    ],
    '地水师': [
        '初六：师出以律，否臧凶。',
        '九二：在师中，吉无咎，王三锡命。',
        '六三：师或舆尸，凶。',
        '六四：师左次，无咎。',
        '六五：田有禽，利执言，无咎。长子帅师，弟子舆尸，贞凶。',
        '上六：大君有命，开国承家，小人勿用。',
    ],
    '水地比': [
        '初六：有孚，比之，无咎。有孚盈缶，终来有它，吉。',
        '六二：比之自内，贞吉。',
        '六三：比之匪人。',
        '六四：外比之，贞吉。',
        '九五：显比，王用三驱，失前禽。邑人不诫，吉。',
        '上六：比之无首，凶。',
    ],
    '风天小畜': [
        '初九：复自道，何其咎，吉。',
        '九二：牵复，吉。',
        '九三：舆说辐，夫妻反目。',
        '六四：有孚，血去惕出，无咎。',
        '九五：有孚挛如，富以其邻。',
        '上九：既雨既处，尚德载，妇贞厉。月几望，君子征凶。',
    ],
    '天泽履': [
        '初九：素履，往无咎。',
        '九二：履道坦坦，幽人贞吉。',
        '六三：眇能视，跛能履，履虎尾，咥人，凶。武人为于大君。',
        '九四：履虎尾，愬愬终吉。',
        '九五：夬履，贞厉。',
        '上九：视履考祥，其旋元吉。',
    ],
    '地天泰': [
        '初九：拔茅茹，以其汇，征吉。',
        '九二：包荒，用冯河，不遐遗，朋亡，得尚于中行。',
        '九三：无平不陂，无往不复，艰贞无咎。勿恤其孚，于食有福。',
        '六四：翩翩不富，以其邻，不戒以孚。',
        '六五：帝乙归妹，以祉元吉。',
        '上六：城复于隍，勿用师。自邑告命，贞吝。',
    ],
    '天地否': [
        '初六：拔茅茹，以其汇，贞吉亨。',
        '六二：包承。小人吉，大人否亨。',
        '六三：包羞。',
        '九四：有命无咎，畴离祉。',
        '九五：休否，大人吉。其亡其亡，系于苞桑。',
        '上九：倾否，先否后喜。',
    ],
    '天火同人': [
        '初九：同人于门，无咎。',
        '六二：同人于宗，吝。',
        '九三：伏戎于莽，升其高陵，三岁不兴。',
        '九四：乘其墉，弗克攻，吉。',
        '九五：同人，先号啕而后笑。大师克相遇。',
        '上九：同人于郊，无悔。',
    ],
    '火天大有': [
        '初九：无交害，匪咎，艰则无咎。',
        '九二：大车以载，有攸往，无咎。',
        '九三：公用亨于天子，小人弗克。',
        '九四：匪其彭，无咎。',
        '六五：厥孚交如，威如；吉。',
        '上九：自天祐之，吉无不利。',
    ],
    '地山谦': [
        '初六：谦谦君子，用涉大川，吉。',
        '六二：鸣谦，贞吉。',
        '九三：劳谦，君子有终，吉。',
        '六四：无不利，撝谦。',
        '六五：不富，以其邻，利用侵伐，无不利。',
        '上六：鸣谦，利用行师，征邑国。',
    ],
    '雷地豫': [
        '初六：鸣豫，凶。',
        '六二：介于石，不终日，贞吉。',
        '六三：盱豫，悔。迟有悔。',
        '九四：由豫，大有得。勿疑。朋盍簪。',
        '六五：贞疾，恒不死。',
        '上六：冥豫，成有渝，无咎。',
    ],
    '泽雷随': [
        '初九：官有渝，贞吉。出门交有功。',
        '六二：系小子，失丈夫。',
        '六三：系丈夫，失小子。随有求得，利居贞。',
        '九四：随有获，贞凶。有孚在道，以明，何咎。',
        '九五：孚于嘉，吉。',
        '上六：拘系之，乃从维之。王用亨于西山。',
    ],
    '山风蛊': [
        '初六：干父之蛊，有子，考无咎，厉终吉。',
        '九二：干母之蛊，不可贞。',
        '九三：干父小有悔，无大咎。',
        '六四：裕父之蛊，往见吝。',
        '六五：干父之蛊，用誉。',
        '上九：不事王侯，高尚其事。',
    ],
    '地泽临': [
        '初九：咸临，贞吉。',
        '九二：咸临，吉无不利。',
        '六三：甘临，无攸利。既忧之，无咎。',
        '六四：至临，无咎。',
        '六五：知临，大君之宜，吉。',
        '上六：敦临，吉无咎。',
    ],
    '风地观': [
        '初六：童观，小人无咎，君子吝。',
        '六二：窥观，利女贞。',
        '六三：观我生，进退。',
        '六四：观国之光，利用宾于王。',
        '九五：观我生，君子无咎。',
        '上九：观其生，君子无咎。',
    ],
    '火雷噬嗑': [
        '初九：屦校灭趾，无咎。',
        '六二：噬肤灭鼻，无咎。',
        '六三：噬腊肉，遇毒；小吝，无咎。',
        '九四：噬乾胏，得金矢，利艰贞，吉。',
        '六五：噬乾肉，得黄金，贞厉，无咎。',
        '上九：何校灭耳，凶。',
    ],
    '山火贲': [
        '初九：贲其趾，舍车而徒。',
        '六二：贲其须。',
        '九三：贲如濡如，永贞吉。',
        '六四：贲如皤如，白马翰如，匪寇婚媾。',
        '六五：贲于丘园，束帛戋戋，吝，终吉。',
        '上九：白贲，无咎。',
    ],
    '山地剥': [
        '初六：剥床以足，蔑贞凶。',
        '六二：剥床以辨，蔑贞凶。',
        '六三：剥之，无咎。',
        '六四：剥床以肤，凶。',
        '六五：贯鱼，以宫人宠，无不利。',
        '上九：硕果不食，君子得舆，小人剥庐。',
    ],
    '地雷复': [
        '初九：不远复，无祗悔，元吉。',
        '六二：休复，吉。',
        '六三：频复，厉无咎。',
        '六四：中行独复。',
        '六五：敦复，无悔。',
        '上六：迷复，凶，有灾眚。用行师，终有大败，以其国君，凶；至于十年，不克征。',
    ],
    '天雷无妄': [
        '初九：无妄，往吉。',
        '六二：不耕获，不菑畬，则利有攸往。',
        '六三：无妄之灾，或系之牛，行人之得，邑人之灾。',
        '九四：可贞，无咎。',
        '九五：无妄之疾，勿药有喜。',
        '上九：无妄，行有眚，无攸利。',
    ],
    '山天大畜': [
        '初九：有厉利已。',
        '九二：舆说辐。',
        '九三：良马逐，利艰贞。曰闲舆卫，利有攸往。',
        '六四：童牛之牿，元吉。',
        '六五：豮豕之牙，吉。',
        '上九：何天之衢，亨。',
    ],
    '山雷颐': [
        '初九：舍尔灵龟，观我朵颐，凶。',
        '六二：颠颐，拂经，于丘颐，征凶。',
        '六三：拂颐，贞凶，十年勿用，无攸利。',
        '六四：颠颐吉，虎视眈眈，其欲逐逐，无咎。',
        '六五：拂经，居贞吉，不可涉大川。',
        '上九：由颐，厉吉，利涉大川。',
    ],
    '泽风大过': [
        '初六：藉用白茅，无咎。',
        '九二：枯杨生稊，老夫得其女妻，无不利。',
        '九三：栋桡，凶。',
        '九四：栋隆，吉；有它吝。',
        '九五：枯杨生华，老妇得士夫，无咎无誉。',
        '上六：过涉灭顶，凶，无咎。',
    ],
    '坎为水': [
        '初六：习坎，入于坎窞，凶。',
        '九二：坎有险，求小得。',
        '六三：来之坎坎，险且枕，入于坎窞，勿用。',
        '六四：樽酒簋贰，用缶，纳约自牖，终无咎。',
        '九五：坎不盈，祗既平，无咎。',
        '上六：系用徽纆，寘于丛棘，三岁不得，凶。',
    ],
    '离为火': [
        '初九：履错然，敬之无咎。',
        '六二：黄离，元吉。',
        '九三：日昃之离，不鼓缶而歌，则大耋之嗟，凶。',
        '九四：突如其来如，焚如，死如，弃如。',
        '六五：出涕沱若，戚嗟若，吉。',
        '上九：王用出征，有嘉折首，获匪其丑，无咎。',
    ],
    '泽山咸': [
        '初六：咸其拇。',
        '六二：咸其腓，凶，居吉。',
        '九三：咸其股，执其随，往吝。',
        '九四：贞吉悔亡，憧憧往来，朋从尔思。',
        '九五：咸其脢，无悔。',
        '上六：咸其辅，颊，舌。',
    ],
    '雷风恒': [
        '初六：浚恒，贞凶，无攸利。',
        '九二：悔亡。',
        '九三：不恒其德，或承之羞，贞吝。',
        '九四：田无禽。',
        '六五：恒其德，贞，妇人吉，夫子凶。',
        '上六：振恒，凶。',
    ],
    '天山遯': [
        '初六：遯尾，厉，勿用有攸往。',
        '六二：执之用黄牛之革，莫之胜说。',
        '九三：系遯，有疾厉，畜臣妾吉。',
        '九四：好遯君子吉，小人否。',
        '九五：嘉遯，贞吉。',
        '上九：肥遯，无不利。',
    ],
    '雷天大壮': [
        '初九：壮于趾，征凶，有孚。',
        '九二：贞吉。',
        '九三：小人用壮，君子用罔，贞厉。羝羊触藩，羸其角。',
        '九四：贞吉悔亡，藩决不羸，壮于大舆之輹。',
        '六五：丧羊于易，无悔。',
        '上六：羝羊触藩，不能退，不能遂，无攸利，艰则吉。',
    ],
    '火地晋': [
        '初六：晋如，摧如，贞吉。罔孚，裕无咎。',
        '六二：晋如，愁如，贞吉。受兹介福，于其王母。',
        '六三：众允，悔亡。',
        '九四：晋如鼫鼠，贞厉。',
        '六五：悔亡，失得勿恤，往吉无不利。',
        '上九：晋其角，维用伐邑，厉吉无咎，贞吝。',
    ],
    '地火明夷': [
        '初九：明夷于飞，垂其翼。君子于行，三日不食。有攸往，主人有言。',
        '六二：明夷，夷于左股，用拯马壮，吉。',
        '九三：明夷于南狩，得其大首，不可疾贞。',
        '六四：入于左腹，获明夷之心，出于门庭。',
        '六五：箕子之明夷，利贞。',
        '上六：不明晦，初登于天，后入于地。',
    ],
    '风火家人': [
        '初九：闲有家，悔亡。',
        '六二：无攸遂，在中馈，贞吉。',
        '九三：家人嗃嗃，悔厉吉；妇子嘻嘻，终吝。',
        '六四：富家，大吉。',
        '九五：王假有家，勿恤吉。',
        '上九：有孚威如，终吉。',
    ],
    '火泽睽': [
        '初九：悔亡，丧马勿逐，自复；见恶人无咎。',
        '九二：遇主于巷，无咎。',
        '六三：见舆曳，其牛掣，其人天且劓，无初有终。',
        '九四：睽孤，遇元夫，交孚，厉无咎。',
        '六五：悔亡，厥宗噬肤，往何咎。',
        '上九：睽孤，见豕负涂，载鬼一车，先张之弧，后说之弧，匪寇婚媾，往遇雨则吉。',
    ],
    '水山蹇': [
        '初六：往蹇，来誉。',
        '六二：王臣蹇蹇，匪躬之故。',
        '九三：往蹇来反。',
        '六四：往蹇来连。',
        '九五：大蹇朋来。',
        '上六：往蹇来硕，吉；利见大人。',
    ],
    '雷水解': [
        '初六：无咎。',
        '九二：田获三狐，得黄矢，贞吉。',
        '六三：负且乘，致寇至，贞吝。',
        '九四：解而拇，朋至斯孚。',
        '六五：君子维有解，吉；有孚于小人。',
        '上六：公用射隼，于高墉之上，获之，无不利。',
    ],
    '山泽损': [
        '初九：已事遄往，无咎，酌损之。',
        '九二：利贞，征凶，弗损益之。',
        '六三：三人行，则损一人；一人行，则得其友。',
        '六四：损其疾，使遄有喜，无咎。',
        '六五：或益之，十朋之龟弗克违，元吉。',
        '上九：弗损益之，无咎，贞吉，利有攸往，得臣无家。',
    ],
    '风雷益': [
        '初九：利用为大作，元吉，无咎。',
        '六二：或益之，十朋之龟弗克违，永贞吉。王用享于帝，吉。',
        '六三：益之用凶事，无咎。有孚中行，告公用圭。',
        '六四：中行，告公从。利用为依迁国。',
        '九五：有孚惠心，勿问元吉。有孚惠我德。',
        '上九：莫益之，或击之，立心勿恒，凶。',
    ],
    '泽天夬': [
        '初九：壮于前趾，往不胜为咎。',
        '九二：惕号，莫夜有戎，勿恤。',
        '九三：壮于頄，有凶。君子夬夬，独行遇雨，若濡有愠，无咎。',
        '九四：臀无肤，其行次且。牵羊悔亡，闻言不信。',
        '九五：苋陆夬夬，中行无咎。',
        '上六：无号，终有凶。',
    ],
    '天风姤': [
        '初六：系于金柅，贞吉，有攸往，见凶，羸豕孚蹢躅。',
        '九二：包有鱼，无咎，不利宾。',
        '九三：臀无肤，其行次且，厉，无大咎。',
        '九四：包无鱼，起凶。',
        '九五：以杞包瓜，含章，有陨自天。',
        '上九：姤其角，吝，无咎。',
    ],
    '泽地萃': [
        '初六：有孚不终，乃乱乃萃，若号一握为笑，勿恤，往无咎。',
        '六二：引吉，无咎，孚乃利用禴。',
        '六三：萃如，嗟如，无攸利，往无咎，小吝。',
        '九四：大吉，无咎。',
        '九五：萃有位，无咎。匪孚，元永贞，悔亡。',
        '上六：赍咨涕洟，无咎。',
    ],
    '地风升': [
        '初六：允升，大吉。',
        '九二：孚乃利用禴，无咎。',
        '九三：升虚邑。',
        '六四：王用亨于岐山，吉无咎。',
        '六五：贞吉，升阶。',
        '上六：冥升，利于不息之贞。',
    ],
    '泽水困': [
        '初六：臀困于株木，入于幽谷，三岁不觌。',
        '九二：困于酒食，朱绂方来，利用享祀，征凶，无咎。',
        '六三：困于石，据于蒺藜，入于其宫，不见其妻，凶。',
        '九四：来徐徐，困于金车，吝，有终。',
        '九五：劓刖，困于赤绂，乃徐有说，利用祭祀。',
        '上六：困于葛藟，于臲卼，曰动悔。有悔，征吉。',
    ],
    '水风井': [
        '初六：井泥不食，旧井无禽。',
        '九二：井谷射鲋，瓮敝漏。',
        '九三：井渫不食，为我心恻，可用汲，王明，并受其福。',
        '六四：井甃，无咎。',
        '九五：井冽，寒泉食。',
        '上六：井收勿幕，有孚元吉。',
    ],
    '泽火革': [
        '初九：巩用黄牛之革。',
        '六二：己日乃革之，征吉，无咎。',
        '九三：征凶，贞厉，革言三就，有孚。',
        '九四：悔亡，有孚改命，吉。',
        '九五：大人虎变，未占有孚。',
        '上六：君子豹变，小人革面，征凶，居贞吉。',
    ],
    '火风鼎': [
        '初六：鼎颠趾，利出否，得妾以其子，无咎。',
        '九二：鼎有实，我仇有疾，不我能即，吉。',
        '九三：鼎耳革，其行塞，雉膏不食，方雨亏悔，终吉。',
        '九四：鼎折足，覆公餗，其形渥，凶。',
        '六五：鼎黄耳金铉，利贞。',
        '上九：鼎玉铉，大吉，无不利。',
    ],
    '震为雷': [
        '初九：震来虩虩，后笑言哑哑，吉。',
        '六二：震来厉，亿丧贝，跻于九陵，勿逐，七日得。',
        '六三：震苏苏，震行无眚。',
        '九四：震遂泥。',
        '六五：震往来厉，亿无丧，有事。',
        '上六：震索索，视矍矍，征凶。震不于其躬，于其邻，无咎。婚媾有言。',
    ],
    '艮为山': [
        '初六：艮其趾，无咎，利永贞。',
        '六二：艮其腓，不拯其随，其心不快。',
        '九三：艮其限，列其夤，厉薰心。',
        '六四：艮其身，无咎。',
        '六五：艮其辅，言有序，悔亡。',
        '上九：敦艮，吉。',
    ],
    '风山渐': [
        '初六：鸿渐于干，小子厉，有言，无咎。',
        '六二：鸿渐于磐，饮食衎衎，吉。',
        '九三：鸿渐于陆，夫征不复，妇孕不育，凶；利御寇。',
        '六四：鸿渐于木，或得其桷，无咎。',
        '九五：鸿渐于陵，妇三岁不孕，终莫之胜，吉。',
        '上九：鸿渐于陆，其羽可用为仪，吉。',
    ],
    '雷泽归妹': [
        '初九：归妹以娣，跛能履，征吉。',
        '九二：眇能视，利幽人之贞。',
        '六三：归妹以须，反归以娣。',
        '九四：归妹愆期，迟归有时。',
        '六五：帝乙归妹，其君之袂，不如其娣之袂良，月几望，吉。',
        '上六：女承筐无实，士刲羊无血，无攸利。',
    ],
    '雷火丰': [
        '初九：遇其配主，虽旬无咎，往有尚。',
        '六二：丰其蔀，日中见斗，往得疑疾，有孚发若，吉。',
        '九三：丰其沛，日中见沬，折其右肱，无咎。',
        '九四：丰其蔀，日中见斗，遇其夷主，吉。',
        '六五：来章，有庆誉，吉。',
        '上六：丰其屋，蔀其家，窥其户，阒其无人，三岁不觌，凶。',
    ],
    '火山旅': [
        '初六：旅琐琐，斯其所取灾。',
        '六二：旅即次，怀其资，得童仆贞。',
        '九三：旅焚其次，丧其童仆，贞厉。',
        '九四：旅于处，得其资斧，我心不快。',
        '六五：射雉一矢亡，终以誉命。',
        '上九：鸟焚其巢，旅人先笑后号啕。丧牛于易，凶。',
    ],
    '巽为风': [
        '初六：进退，利武人之贞。',
        '九二：巽在床下，用史巫纷若，吉无咎。',
        '九三：频巽，吝。',
        '六四：悔亡，田获三品。',
        '九五：贞吉悔亡，无不利。无初有终，先庚三日，后庚三日，吉。',
        '上九：巽在床下，丧其资斧，贞凶。',
    ],
    '兑为泽': [
        '初九：和兑，吉。',
        '九二：孚兑，吉，悔亡。',
        '六三：来兑，凶。',
        '九四：商兑，未宁，介疾有喜。',
        '九五：孚于剥，有厉。',
        '上六：引兑。',
    ],
    '风水涣': [
        '初六：用拯马壮，吉。',
        '九二：涣奔其机，悔亡。',
        '六三：涣其躬，无悔。',
        '六四：涣其群，元吉。涣有丘，匪夷所思。',
        '九五：涣汗其大号，涣王居，无咎。',
        '上九：涣其血，去逖出，无咎。',
    ],
    '水泽节': [
        '初九：不出户庭，无咎。',
        '九二：不出门庭，凶。',
        '六三：不节若，则嗟若，无咎。',
        '六四：安节，亨。',
        '九五：甘节，吉；往有尚。',
        '上六：苦节，贞凶，悔亡。',
    ],
    '风泽中孚': [
        '初九：虞吉，有它不燕。',
        '九二：鸣鹤在阴，其子和之，我有好爵，吾与尔靡之。',
        '六三：得敌，或鼓或罢，或泣或歌。',
        '六四：月几望，马匹亡，无咎。',
        '九五：有孚挛如，无咎。',
        '上九：翰音登于天，贞凶。',
    ],
    '雷山小过': [
        '初六：飞鸟以凶。',
        '六二：过其祖，遇其妣；不及其君，遇其臣；无咎。',
        '九三：弗过防之，从或戕之，凶。',
        '九四：无咎，弗过遇之。往厉必戒，勿用永贞。',
        '六五：密云不雨，自我西郊，公弋取彼在穴。',
        '上六：弗遇过之，飞鸟离之，凶，是谓灾眚。',
    ],
    '水火既济': [
        '初九：曳其轮，濡其尾，无咎。',
        '六二：妇丧其茀，勿逐，七日得。',
        '九三：高宗伐鬼方，三年克之，小人勿用。',
        '六四：繻有衣袽，终日戒。',
        '九五：东邻杀牛，不如西邻之禴祭，实受其福。',
        '上六：濡其首，厉。',
    ],
    '火水未济': [
        '初六：濡其尾，吝。',
        '九二：曳其轮，贞吉。',
        '六三：未济，征凶，利涉大川。',
        '九四：贞吉，悔亡，震用伐鬼方，三年有赏于大国。',
        '六五：贞吉，无悔，君子之光，有孚，吉。',
        '上九：有孚于饮酒，无咎，濡其首，有孚失是。',
    ],
};
// 十二长生顺序
const CHANG_SHENG_ORDER = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
const DI_ZHI_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
// 五行长生起点（阳干顺行，阴干逆行）
const CHANG_SHENG_START = {
    '木': '亥', '火': '寅', '土': '寅', '金': '巳', '水': '申',
};
// 计算十二长生
function getChangSheng(yaoElement, naJia) {
    const startZhi = CHANG_SHENG_START[yaoElement];
    const startIdx = DI_ZHI_ORDER.indexOf(startZhi);
    const naJiaIdx = DI_ZHI_ORDER.indexOf(naJia);
    // 顺行计算
    const offset = (naJiaIdx - startIdx + 12) % 12;
    return CHANG_SHENG_ORDER[offset];
}
// 变爻分析标签
const HUA_TYPE_LABELS = {
    'hua_jin': '化进',
    'hua_tui': '化退',
    'hua_sheng': '化生',
    'hua_ke': '化克',
    'hua_kong': '化空',
    'hua_jue': '化绝',
    'hua_mu': '化墓',
};
// 分析变爻（动爻变化后的状态）
function analyzeYaoChange(originalElement, changedElement, originalNaJia, changedNaJia, kongWang) {
    const order = ['木', '火', '土', '金', '水'];
    const origIdx = order.indexOf(originalElement);
    const changedIdx = order.indexOf(changedElement);
    // 检查化空
    if (kongWang.kongZhi.includes(changedNaJia)) {
        return { huaType: 'hua_kong', huaLabel: HUA_TYPE_LABELS['hua_kong'], isGood: false };
    }
    // 检查化墓
    const muZhi = { '木': '未', '火': '戌', '土': '戌', '金': '丑', '水': '辰' };
    if (changedNaJia === muZhi[originalElement]) {
        return { huaType: 'hua_mu', huaLabel: HUA_TYPE_LABELS['hua_mu'], isGood: false };
    }
    // 检查化绝
    const jueZhi = { '木': '申', '火': '亥', '土': '亥', '金': '寅', '水': '巳' };
    if (changedNaJia === jueZhi[originalElement]) {
        return { huaType: 'hua_jue', huaLabel: HUA_TYPE_LABELS['hua_jue'], isGood: false };
    }
    // 检查化生（变爻五行生原爻五行）
    if ((changedIdx + 1) % 5 === origIdx) {
        return { huaType: 'hua_sheng', huaLabel: HUA_TYPE_LABELS['hua_sheng'], isGood: true };
    }
    // 检查化克（变爻五行克原爻五行）
    if ((changedIdx + 2) % 5 === origIdx) {
        return { huaType: 'hua_ke', huaLabel: HUA_TYPE_LABELS['hua_ke'], isGood: false };
    }
    // 检查化进/化退（同五行地支进退）
    if (originalElement === changedElement) {
        const origNaJiaIdx = DI_ZHI_ORDER.indexOf(originalNaJia);
        const changedNaJiaIdx = DI_ZHI_ORDER.indexOf(changedNaJia);
        // 计算地支前进的步数（顺时针）
        const forwardSteps = (changedNaJiaIdx - origNaJiaIdx + 12) % 12;
        // 如果前进步数在1-6之间，视为化进；否则视为化退
        if (forwardSteps > 0 && forwardSteps <= 6) {
            return { huaType: 'hua_jin', huaLabel: HUA_TYPE_LABELS['hua_jin'], isGood: true };
        }
        else {
            return { huaType: 'hua_tui', huaLabel: HUA_TYPE_LABELS['hua_tui'], isGood: false };
        }
    }
    // 默认化进
    return { huaType: 'hua_jin', huaLabel: HUA_TYPE_LABELS['hua_jin'], isGood: true };
}
// 六冲表
const LIU_CHONG = {
    '子': '午', '丑': '未', '寅': '申', '卯': '酉', '辰': '戌', '巳': '亥',
    '午': '子', '未': '丑', '申': '寅', '酉': '卯', '戌': '辰', '亥': '巳',
};
// 三合表
const SAN_HE_TABLE = [
    { branches: ['申', '子', '辰'], result: '水', name: '申子辰合水局' },
    { branches: ['亥', '卯', '未'], result: '木', name: '亥卯未合木局' },
    { branches: ['寅', '午', '戌'], result: '火', name: '寅午戌合火局' },
    { branches: ['巳', '酉', '丑'], result: '金', name: '巳酉丑合金局' },
];
// 半合表
const BAN_HE_TABLE = [
    { branches: ['申', '子'], result: '水', type: 'sheng' },
    { branches: ['子', '辰'], result: '水', type: 'mu' },
    { branches: ['亥', '卯'], result: '木', type: 'sheng' },
    { branches: ['卯', '未'], result: '木', type: 'mu' },
    { branches: ['寅', '午'], result: '火', type: 'sheng' },
    { branches: ['午', '戌'], result: '火', type: 'mu' },
    { branches: ['巳', '酉'], result: '金', type: 'sheng' },
    { branches: ['酉', '丑'], result: '金', type: 'mu' },
];
// 检查爻的空亡状态
function checkYaoKongWang(naJia, kongWang, monthZhi, dayZhi, isChanging) {
    const isKong = kongWang.kongZhi.includes(naJia);
    if (!isKong)
        return 'not_kong';
    // 日冲空亡
    if (LIU_CHONG[naJia] === dayZhi)
        return 'kong_ri_chong';
    // 月建临空
    if (naJia === monthZhi)
        return 'kong_yue_jian';
    // 动空
    if (isChanging)
        return 'kong_changing';
    // 静空
    return 'kong_static';
}
// 分析三合局
function analyzeSanHe(yaos, monthZhi, dayZhi) {
    const yaoZhis = yaos.map(y => y.naJia);
    const allZhis = [...yaoZhis, monthZhi, dayZhi];
    // 检查完整三合
    for (const sanHe of SAN_HE_TABLE) {
        const positions = [];
        let hasAll = true;
        for (const branch of sanHe.branches) {
            const pos = yaos.findIndex(y => y.naJia === branch);
            if (pos >= 0) {
                positions.push(pos + 1);
            }
            else if (branch !== monthZhi && branch !== dayZhi) {
                hasAll = false;
                break;
            }
        }
        if (hasAll && positions.length >= 2) {
            return {
                hasFullSanHe: true,
                fullSanHe: { name: sanHe.name, result: sanHe.result, positions },
                hasBanHe: false,
            };
        }
    }
    // 检查半合
    const banHeResults = [];
    for (const banHe of BAN_HE_TABLE) {
        const positions = [];
        for (const branch of banHe.branches) {
            const pos = yaos.findIndex(y => y.naJia === branch);
            if (pos >= 0)
                positions.push(pos + 1);
        }
        if (positions.length === 2 || (positions.length === 1 && (allZhis.includes(banHe.branches[0]) && allZhis.includes(banHe.branches[1])))) {
            banHeResults.push({
                branches: banHe.branches,
                result: banHe.result,
                type: banHe.type === 'sheng' ? '生方' : '墓方',
                positions,
            });
        }
    }
    return {
        hasFullSanHe: false,
        hasBanHe: banHeResults.length > 0,
        banHe: banHeResults.length > 0 ? banHeResults : undefined,
    };
}
// 检测六冲卦
function checkLiuChongGua(yaos) {
    // 六冲卦：初爻与四爻冲，二爻与五爻冲，三爻与六爻冲
    const pairs = [[0, 3], [1, 4], [2, 5]];
    let chongCount = 0;
    for (const [i, j] of pairs) {
        if (LIU_CHONG[yaos[i].naJia] === yaos[j].naJia) {
            chongCount++;
        }
    }
    if (chongCount >= 3) {
        return { isLiuChongGua: true, description: '六冲卦（主事散、急）' };
    }
    return { isLiuChongGua: false };
}
// 计算神系（原神、忌神、仇神）
function calculateShenSystem(_yongShenLiuQin, yongShenElement, yaos, gongElement) {
    const order = ['木', '火', '土', '金', '水'];
    const yongIdx = order.indexOf(yongShenElement);
    // 原神：生用神者
    const yuanElement = order[(yongIdx + 4) % 5];
    // 忌神：克用神者
    const jiElement = order[(yongIdx + 3) % 5];
    // 仇神：生忌神者（克原神者）
    const chouElement = order[(yongIdx + 2) % 5];
    const findPositions = (element) => yaos.filter(y => y.wuXing === element).map(y => y.position);
    const yuanPositions = findPositions(yuanElement);
    const jiPositions = findPositions(jiElement);
    const chouPositions = findPositions(chouElement);
    return {
        yuanShen: yuanPositions.length > 0 ? {
            liuQin: getLiuQin(gongElement, yuanElement),
            wuXing: yuanElement,
            positions: yuanPositions,
        } : undefined,
        jiShen: jiPositions.length > 0 ? {
            liuQin: getLiuQin(gongElement, jiElement),
            wuXing: jiElement,
            positions: jiPositions,
        } : undefined,
        chouShen: chouPositions.length > 0 ? {
            liuQin: getLiuQin(gongElement, chouElement),
            wuXing: chouElement,
            positions: chouPositions,
        } : undefined,
    };
}
// 计算时间建议
function calculateTimeRecommendations(yongShen, yaos) {
    const recommendations = [];
    const yongElement = yongShen.element;
    // 找到用神爻
    const yongYao = yaos.find(y => y.position === yongShen.position);
    if (yongYao) {
        // 用神地支对应的日/月
        recommendations.push({
            type: 'favorable',
            timeframe: '特定日',
            earthlyBranch: yongYao.naJia,
            description: `逢${yongYao.naJia}日/月应期，事情易有进展`,
        });
    }
    // 生用神的五行
    const order = ['木', '火', '土', '金', '水'];
    const yongIdx = order.indexOf(yongElement);
    const shengElement = order[(yongIdx + 4) % 5];
    const keElement = order[(yongIdx + 3) % 5];
    recommendations.push({
        type: 'favorable',
        timeframe: '月内',
        description: `${shengElement}旺之时有利，可积极行动`,
    });
    recommendations.push({
        type: 'unfavorable',
        timeframe: '近期',
        description: `${keElement}旺之时不利，宜避开`,
    });
    // 动爻时间
    const changingYaos = yaos.filter(y => y.change === 'changing');
    for (const yao of changingYaos) {
        recommendations.push({
            type: 'critical',
            timeframe: '特定日',
            earthlyBranch: yao.naJia,
            description: `动爻临${yao.naJia}，此时可能有关键变化`,
        });
    }
    return recommendations;
}
// 生成警告信息
function generateWarnings(yongShen, shenSystem, sanHeAnalysis, yaos) {
    const warnings = [];
    // 三合局警告
    if (sanHeAnalysis.hasBanHe && sanHeAnalysis.banHe) {
        for (const banHe of sanHeAnalysis.banHe) {
            warnings.push(`${banHe.branches.join('')}${banHe.type}半合${banHe.result}`);
        }
    }
    // 用神状态警告
    if (!yongShen.isStrong) {
        warnings.push(`用神${yongShen.liuQin}力弱`);
    }
    if (yongShen.kongWangState === 'kong_static') {
        warnings.push('用神空亡');
    }
    // 忌神旺相警告
    if (shenSystem.jiShen && shenSystem.jiShen.positions.length > 0) {
        const jiYao = yaos.find(y => y.position === shenSystem.jiShen.positions[0]);
        if (jiYao && yaos.length > 0) {
            const monthZhi = yaos[0].naJia;
            const jiWangShuai = WANG_SHUAI_TABLE[monthZhi]?.[jiYao.wuXing];
            if (jiWangShuai === 'wang' || jiWangShuai === 'xiang') {
                warnings.push('忌神旺相');
            }
        }
    }
    return warnings;
}
// 计算伏神（当卦中缺少某六亲时，从本宫卦中找）
function calculateFuShen(fullYaos, gongName, gongElement) {
    const allLiuQin = ['父母', '兄弟', '子孙', '妻财', '官鬼'];
    const presentLiuQin = new Set(fullYaos.map(y => y.liuQin));
    const missingLiuQin = allLiuQin.filter(lq => !presentLiuQin.has(lq));
    if (missingLiuQin.length === 0)
        return [];
    // 获取本宫卦的纳甲
    const benGuaCode = BA_GONG_BEN_GUA[gongName];
    if (!benGuaCode)
        return [];
    const benHex = getHexagramByCode(benGuaCode);
    if (!benHex)
        return [];
    const lowerGong = BA_GONG_NA_JIA[benHex.lowerTrigram];
    const upperGong = BA_GONG_NA_JIA[benHex.upperTrigram];
    const fuShenList = [];
    for (const targetLiuQin of missingLiuQin) {
        // 在本宫卦中找到该六亲
        for (let i = 0; i < 6; i++) {
            const isLower = i < 3;
            const gong = isLower ? lowerGong : upperGong;
            const naJiaIdx = i % 3;
            const naJia = (gong?.naJia[isLower ? 0 : 1][naJiaIdx] || '子');
            const wuXing = DIZHI_WUXING[naJia];
            const liuQin = getLiuQin(gongElement, wuXing);
            if (liuQin === targetLiuQin) {
                const feiShenYao = fullYaos[i];
                const isAvailable = feiShenYao?.change === 'changing';
                fuShenList.push({
                    liuQin: targetLiuQin,
                    wuXing,
                    naJia,
                    feiShenPosition: i + 1,
                    isAvailable,
                    availabilityReason: isAvailable ? '飞神发动，伏神可用' : '飞神静，伏神难出',
                });
                break;
            }
        }
    }
    return fuShenList;
}
// ============= 数据表 =============
// 八宫归属表（卦码 -> 宫名和卦序）
// 卦序: 0=本宫, 1=一世, 2=二世, 3=三世, 4=四世, 5=五世, 6=游魂, 7=归魂
const BA_GONG_GUI_SHU = {
    // 乾宫
    '111111': { gong: '乾', order: 0 }, // 乾为天
    '011111': { gong: '乾', order: 1 }, // 天风姤
    '001111': { gong: '乾', order: 2 }, // 天山遁
    '000111': { gong: '乾', order: 3 }, // 天地否
    '000011': { gong: '乾', order: 4 }, // 风地观
    '000001': { gong: '乾', order: 5 }, // 山地剥
    '000101': { gong: '乾', order: 6 }, // 火地晋
    '111101': { gong: '乾', order: 7 }, // 火天大有
    // 坎宫
    '010010': { gong: '坎', order: 0 }, // 坎为水
    '110010': { gong: '坎', order: 1 }, // 水泽节
    '100010': { gong: '坎', order: 2 }, // 水雷屯
    '101010': { gong: '坎', order: 3 }, // 水火既济
    '101110': { gong: '坎', order: 4 }, // 泽火革
    '101100': { gong: '坎', order: 5 }, // 雷火丰
    '101000': { gong: '坎', order: 6 }, // 地火明夷
    '010000': { gong: '坎', order: 7 }, // 地水师
    // 艮宫
    '001001': { gong: '艮', order: 0 }, // 艮为山
    '101001': { gong: '艮', order: 1 }, // 山火贲
    '111001': { gong: '艮', order: 2 }, // 山天大畜
    '110001': { gong: '艮', order: 3 }, // 山泽损
    '110101': { gong: '艮', order: 4 }, // 火泽睽
    '110111': { gong: '艮', order: 5 }, // 天泽履
    '110011': { gong: '艮', order: 6 }, // 风泽中孚
    '001011': { gong: '艮', order: 7 }, // 风山渐
    // 震宫
    '100100': { gong: '震', order: 0 }, // 震为雷
    '000100': { gong: '震', order: 1 }, // 雷地豫
    '010100': { gong: '震', order: 2 }, // 雷水解
    '011100': { gong: '震', order: 3 }, // 雷风恒
    '011000': { gong: '震', order: 4 }, // 地风升
    '011010': { gong: '震', order: 5 }, // 水风井
    '011110': { gong: '震', order: 6 }, // 泽风大过
    '100110': { gong: '震', order: 7 }, // 泽雷随
};
// 八宫归属表（续）
const BA_GONG_GUI_SHU_2 = {
    // 巽宫
    '011011': { gong: '巽', order: 0 }, // 巽为风
    '111011': { gong: '巽', order: 1 }, // 风天小畜
    '101011': { gong: '巽', order: 2 }, // 风火家人
    '100011': { gong: '巽', order: 3 }, // 风雷益
    '100111': { gong: '巽', order: 4 }, // 天雷无妄
    '100101': { gong: '巽', order: 5 }, // 火雷噬嗑
    '100001': { gong: '巽', order: 6 }, // 山雷颐
    '011001': { gong: '巽', order: 7 }, // 山风蛊
    // 离宫
    '101101': { gong: '离', order: 0 }, // 离为火
    '001101': { gong: '离', order: 1 }, // 火山旅
    '011101': { gong: '离', order: 2 }, // 火风鼎
    '010101': { gong: '离', order: 3 }, // 火水未济
    '010001': { gong: '离', order: 4 }, // 山水蒙
    '010011': { gong: '离', order: 5 }, // 风水涣
    '010111': { gong: '离', order: 6 }, // 天水讼
    '101111': { gong: '离', order: 7 }, // 天火同人
    // 坤宫
    '000000': { gong: '坤', order: 0 }, // 坤为地
    '100000': { gong: '坤', order: 1 }, // 地雷复
    '110000': { gong: '坤', order: 2 }, // 地泽临
    '111000': { gong: '坤', order: 3 }, // 地天泰
    '111100': { gong: '坤', order: 4 }, // 雷天大壮
    '111110': { gong: '坤', order: 5 }, // 泽天夬
    '111010': { gong: '坤', order: 6 }, // 水天需
    '000010': { gong: '坤', order: 7 }, // 水地比
    // 兑宫
    '110110': { gong: '兑', order: 0 }, // 兑为泽
    '010110': { gong: '兑', order: 1 }, // 泽水困
    '000110': { gong: '兑', order: 2 }, // 泽地萃
    '001110': { gong: '兑', order: 3 }, // 泽山咸
    '001010': { gong: '兑', order: 4 }, // 水山蹇
    '001000': { gong: '兑', order: 5 }, // 地山谦
    '001100': { gong: '兑', order: 6 }, // 雷山小过
    '110100': { gong: '兑', order: 7 }, // 雷泽归妹
};
// 合并八宫归属表
const ALL_BA_GONG = { ...BA_GONG_GUI_SHU, ...BA_GONG_GUI_SHU_2 };
// 八宫本宫卦码
const BA_GONG_BEN_GUA = {
    '乾': '111111', '坎': '010010', '艮': '001001', '震': '100100',
    '巽': '011011', '离': '101101', '坤': '000000', '兑': '110110',
};
const HEXAGRAMS = [
    { name: '乾为天', code: '111111', upperTrigram: '乾', lowerTrigram: '乾', element: '金', nature: '刚健' },
    { name: '坤为地', code: '000000', upperTrigram: '坤', lowerTrigram: '坤', element: '土', nature: '柔顺' },
    { name: '水雷屯', code: '100010', upperTrigram: '坎', lowerTrigram: '震', element: '水', nature: '初生' },
    { name: '山水蒙', code: '010001', upperTrigram: '艮', lowerTrigram: '坎', element: '土', nature: '启蒙' },
    { name: '水天需', code: '111010', upperTrigram: '坎', lowerTrigram: '乾', element: '水', nature: '等待' },
    { name: '天水讼', code: '010111', upperTrigram: '乾', lowerTrigram: '坎', element: '金', nature: '争讼' },
    { name: '地水师', code: '010000', upperTrigram: '坤', lowerTrigram: '坎', element: '土', nature: '统帅' },
    { name: '水地比', code: '000010', upperTrigram: '坎', lowerTrigram: '坤', element: '水', nature: '亲比' },
    { name: '风天小畜', code: '111011', upperTrigram: '巽', lowerTrigram: '乾', element: '木', nature: '蓄养' },
    { name: '天泽履', code: '110111', upperTrigram: '乾', lowerTrigram: '兑', element: '金', nature: '践行' },
    { name: '地天泰', code: '111000', upperTrigram: '坤', lowerTrigram: '乾', element: '土', nature: '通泰' },
    { name: '天地否', code: '000111', upperTrigram: '乾', lowerTrigram: '坤', element: '金', nature: '闭塞' },
    { name: '天火同人', code: '101111', upperTrigram: '乾', lowerTrigram: '离', element: '金', nature: '和同' },
    { name: '火天大有', code: '111101', upperTrigram: '离', lowerTrigram: '乾', element: '火', nature: '大有' },
    { name: '地山谦', code: '001000', upperTrigram: '坤', lowerTrigram: '艮', element: '土', nature: '谦逊' },
    { name: '雷地豫', code: '000100', upperTrigram: '震', lowerTrigram: '坤', element: '木', nature: '愉悦' },
    { name: '泽雷随', code: '100110', upperTrigram: '兑', lowerTrigram: '震', element: '金', nature: '随从' },
    { name: '山风蛊', code: '011001', upperTrigram: '艮', lowerTrigram: '巽', element: '土', nature: '整治' },
    { name: '地泽临', code: '110000', upperTrigram: '坤', lowerTrigram: '兑', element: '土', nature: '临近' },
    { name: '风地观', code: '000011', upperTrigram: '巽', lowerTrigram: '坤', element: '木', nature: '观察' },
    { name: '火雷噬嗑', code: '100101', upperTrigram: '离', lowerTrigram: '震', element: '火', nature: '决断' },
    { name: '山火贲', code: '101001', upperTrigram: '艮', lowerTrigram: '离', element: '土', nature: '文饰' },
    { name: '山地剥', code: '000001', upperTrigram: '艮', lowerTrigram: '坤', element: '土', nature: '剥落' },
    { name: '地雷复', code: '100000', upperTrigram: '坤', lowerTrigram: '震', element: '土', nature: '复归' },
    { name: '天雷无妄', code: '100111', upperTrigram: '乾', lowerTrigram: '震', element: '金', nature: '无妄' },
    { name: '山天大畜', code: '111001', upperTrigram: '艮', lowerTrigram: '乾', element: '土', nature: '大畜' },
    { name: '山雷颐', code: '100001', upperTrigram: '艮', lowerTrigram: '震', element: '土', nature: '颐养' },
    { name: '泽风大过', code: '011110', upperTrigram: '兑', lowerTrigram: '巽', element: '金', nature: '大过' },
    { name: '坎为水', code: '010010', upperTrigram: '坎', lowerTrigram: '坎', element: '水', nature: '险陷' },
    { name: '离为火', code: '101101', upperTrigram: '离', lowerTrigram: '离', element: '火', nature: '附丽' },
    { name: '泽山咸', code: '001110', upperTrigram: '兑', lowerTrigram: '艮', element: '金', nature: '感应' },
    { name: '雷风恒', code: '011100', upperTrigram: '震', lowerTrigram: '巽', element: '木', nature: '恒久' },
    { name: '天山遯', code: '001111', upperTrigram: '乾', lowerTrigram: '艮', element: '金', nature: '退避' },
    { name: '雷天大壮', code: '111100', upperTrigram: '震', lowerTrigram: '乾', element: '木', nature: '壮大' },
    { name: '火地晋', code: '000101', upperTrigram: '离', lowerTrigram: '坤', element: '火', nature: '晋升' },
    { name: '地火明夷', code: '101000', upperTrigram: '坤', lowerTrigram: '离', element: '土', nature: '晦暗' },
    { name: '风火家人', code: '101011', upperTrigram: '巽', lowerTrigram: '离', element: '木', nature: '家人' },
    { name: '火泽睽', code: '110101', upperTrigram: '离', lowerTrigram: '兑', element: '火', nature: '乖离' },
    { name: '水山蹇', code: '001010', upperTrigram: '坎', lowerTrigram: '艮', element: '水', nature: '蹇难' },
    { name: '雷水解', code: '010100', upperTrigram: '震', lowerTrigram: '坎', element: '木', nature: '解除' },
    { name: '山泽损', code: '110001', upperTrigram: '艮', lowerTrigram: '兑', element: '土', nature: '减损' },
    { name: '风雷益', code: '100011', upperTrigram: '巽', lowerTrigram: '震', element: '木', nature: '增益' },
    { name: '泽天夬', code: '111110', upperTrigram: '兑', lowerTrigram: '乾', element: '金', nature: '决断' },
    { name: '天风姤', code: '011111', upperTrigram: '乾', lowerTrigram: '巽', element: '金', nature: '遇合' },
    { name: '泽地萃', code: '000110', upperTrigram: '兑', lowerTrigram: '坤', element: '金', nature: '聚集' },
    { name: '地风升', code: '011000', upperTrigram: '坤', lowerTrigram: '巽', element: '土', nature: '上升' },
    { name: '泽水困', code: '010110', upperTrigram: '兑', lowerTrigram: '坎', element: '金', nature: '困顿' },
    { name: '水风井', code: '011010', upperTrigram: '坎', lowerTrigram: '巽', element: '水', nature: '井养' },
    { name: '泽火革', code: '101110', upperTrigram: '兑', lowerTrigram: '离', element: '金', nature: '变革' },
    { name: '火风鼎', code: '011101', upperTrigram: '离', lowerTrigram: '巽', element: '火', nature: '鼎新' },
    { name: '震为雷', code: '100100', upperTrigram: '震', lowerTrigram: '震', element: '木', nature: '震动' },
    { name: '艮为山', code: '001001', upperTrigram: '艮', lowerTrigram: '艮', element: '土', nature: '止静' },
    { name: '风山渐', code: '001011', upperTrigram: '巽', lowerTrigram: '艮', element: '木', nature: '渐进' },
    { name: '雷泽归妹', code: '110100', upperTrigram: '震', lowerTrigram: '兑', element: '木', nature: '归妹' },
    { name: '雷火丰', code: '101100', upperTrigram: '震', lowerTrigram: '离', element: '木', nature: '丰盛' },
    { name: '火山旅', code: '001101', upperTrigram: '离', lowerTrigram: '艮', element: '火', nature: '旅行' },
    { name: '巽为风', code: '011011', upperTrigram: '巽', lowerTrigram: '巽', element: '木', nature: '顺入' },
    { name: '兑为泽', code: '110110', upperTrigram: '兑', lowerTrigram: '兑', element: '金', nature: '喜悦' },
    { name: '风水涣', code: '010011', upperTrigram: '巽', lowerTrigram: '坎', element: '木', nature: '涣散' },
    { name: '水泽节', code: '110010', upperTrigram: '坎', lowerTrigram: '兑', element: '水', nature: '节制' },
    { name: '风泽中孚', code: '110011', upperTrigram: '巽', lowerTrigram: '兑', element: '木', nature: '诚信' },
    { name: '雷山小过', code: '001100', upperTrigram: '震', lowerTrigram: '艮', element: '木', nature: '小过' },
    { name: '水火既济', code: '101010', upperTrigram: '坎', lowerTrigram: '离', element: '水', nature: '完成' },
    { name: '火水未济', code: '010101', upperTrigram: '离', lowerTrigram: '坎', element: '火', nature: '未完' },
];
const DIZHI_LIST = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const TIANGAN_LIST = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DIZHI_WUXING = {
    '子': '水', '丑': '土', '寅': '木', '卯': '木',
    '辰': '土', '巳': '火', '午': '火', '未': '土',
    '申': '金', '酉': '金', '戌': '土', '亥': '水',
};
// 六神配置（根据日干）
const LIU_SHEN_CONFIG = {
    '甲乙': ['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'],
    '丙丁': ['朱雀', '勾陈', '螣蛇', '白虎', '玄武', '青龙'],
    '戊': ['勾陈', '螣蛇', '白虎', '玄武', '青龙', '朱雀'],
    '己': ['螣蛇', '白虎', '玄武', '青龙', '朱雀', '勾陈'],
    '庚辛': ['白虎', '玄武', '青龙', '朱雀', '勾陈', '螣蛇'],
    '壬癸': ['玄武', '青龙', '朱雀', '勾陈', '螣蛇', '白虎'],
};
// 旬空表
const XUN_KONG_TABLE = {
    '甲子旬': ['戌', '亥'],
    '甲戌旬': ['申', '酉'],
    '甲申旬': ['午', '未'],
    '甲午旬': ['辰', '巳'],
    '甲辰旬': ['寅', '卯'],
    '甲寅旬': ['子', '丑'],
};
// 月令旺衰表
const WANG_SHUAI_TABLE = {
    '寅': { '木': 'wang', '火': 'xiang', '水': 'xiu', '金': 'qiu', '土': 'si' },
    '卯': { '木': 'wang', '火': 'xiang', '水': 'xiu', '金': 'qiu', '土': 'si' },
    '辰': { '土': 'wang', '金': 'xiang', '火': 'xiu', '木': 'qiu', '水': 'si' },
    '巳': { '火': 'wang', '土': 'xiang', '木': 'xiu', '水': 'qiu', '金': 'si' },
    '午': { '火': 'wang', '土': 'xiang', '木': 'xiu', '水': 'qiu', '金': 'si' },
    '未': { '土': 'wang', '金': 'xiang', '火': 'xiu', '木': 'qiu', '水': 'si' },
    '申': { '金': 'wang', '水': 'xiang', '土': 'xiu', '火': 'qiu', '木': 'si' },
    '酉': { '金': 'wang', '水': 'xiang', '土': 'xiu', '火': 'qiu', '木': 'si' },
    '戌': { '土': 'wang', '金': 'xiang', '火': 'xiu', '木': 'qiu', '水': 'si' },
    '亥': { '水': 'wang', '木': 'xiang', '金': 'xiu', '土': 'qiu', '火': 'si' },
    '子': { '水': 'wang', '木': 'xiang', '金': 'xiu', '土': 'qiu', '火': 'si' },
    '丑': { '土': 'wang', '金': 'xiang', '火': 'xiu', '木': 'qiu', '水': 'si' },
};
// 八宫纳甲表
const BA_GONG_NA_JIA = {
    '乾': { element: '金', naJia: [['子', '寅', '辰'], ['午', '申', '戌']] },
    '坎': { element: '水', naJia: [['寅', '辰', '午'], ['申', '戌', '子']] },
    '艮': { element: '土', naJia: [['辰', '午', '申'], ['戌', '子', '寅']] },
    '震': { element: '木', naJia: [['子', '寅', '辰'], ['午', '申', '戌']] },
    '巽': { element: '木', naJia: [['丑', '亥', '酉'], ['未', '巳', '卯']] },
    '离': { element: '火', naJia: [['卯', '丑', '亥'], ['酉', '未', '巳']] },
    '坤': { element: '土', naJia: [['未', '巳', '卯'], ['丑', '亥', '酉']] },
    '兑': { element: '金', naJia: [['巳', '卯', '丑'], ['亥', '酉', '未']] },
};
// 世应位置表（按卦序）
const SHI_YING_TABLE = {
    0: [6, 3], // 本宫卦
    1: [1, 4], // 一世卦
    2: [2, 5], // 二世卦
    3: [3, 6], // 三世卦
    4: [4, 1], // 四世卦
    5: [5, 2], // 五世卦
    6: [4, 1], // 游魂卦
    7: [3, 6], // 归魂卦
};
// ============= 核心函数 =============
// 根据卦名查找卦象
function getHexagramByName(name) {
    return HEXAGRAMS.find(h => h.name === name || h.name.includes(name));
}
// 根据卦码查找卦象
function getHexagramByCode(code) {
    return HEXAGRAMS.find(h => h.code === code);
}
// 根据卦名或卦码查找卦象
function findHexagram(input) {
    if (/^[01]{6}$/.test(input)) {
        return getHexagramByCode(input);
    }
    return getHexagramByName(input);
}
// 计算两个卦码之间的变爻位置
function calculateChangedLines(mainCode, changedCode) {
    const lines = [];
    for (let i = 0; i < 6; i++) {
        if (mainCode[i] !== changedCode[i]) {
            lines.push(i + 1);
        }
    }
    return lines;
}
// 自动起卦（模拟铜钱法）
function divine(rng) {
    const yaos = [];
    const changedLines = [];
    for (let i = 0; i < 6; i++) {
        const coins = [
            rng() > 0.5 ? 3 : 2,
            rng() > 0.5 ? 3 : 2,
            rng() > 0.5 ? 3 : 2,
        ];
        const sum = coins.reduce((a, b) => a + b, 0);
        let yaoType;
        let isChanging = false;
        if (sum === 6) { // 老阴
            yaoType = 0;
            isChanging = true;
        }
        else if (sum === 7) { // 少阳
            yaoType = 1;
        }
        else if (sum === 8) { // 少阴
            yaoType = 0;
        }
        else { // 9 = 老阳
            yaoType = 1;
            isChanging = true;
        }
        if (isChanging) {
            changedLines.push(i + 1);
        }
        yaos.push({
            type: yaoType,
            change: isChanging ? 'changing' : 'stable',
            position: i + 1,
        });
    }
    return {
        yaos,
        hexagramCode: yaos.map(y => y.type).join(''),
        changedLines,
    };
}
// 计算变卦码
function calculateChangedHexagram(code, changedLines) {
    const chars = code.split('');
    for (const line of changedLines) {
        const idx = line - 1;
        chars[idx] = chars[idx] === '1' ? '0' : '1';
    }
    return chars.join('');
}
// 获取干支时间
function getGanZhiTime(date) {
    const solar = Solar.fromDate(date);
    const lunar = solar.getLunar();
    const eightChar = lunar.getEightChar();
    return {
        year: { gan: eightChar.getYearGan(), zhi: eightChar.getYearZhi() },
        month: { gan: eightChar.getMonthGan(), zhi: eightChar.getMonthZhi() },
        day: { gan: eightChar.getDayGan(), zhi: eightChar.getDayZhi() },
        hour: { gan: eightChar.getTimeGan(), zhi: eightChar.getTimeZhi() },
    };
}
// 计算旬空
function getKongWang(dayGan, dayZhi) {
    const ganIdx = TIANGAN_LIST.indexOf(dayGan);
    const zhiIdx = DIZHI_LIST.indexOf(dayZhi);
    const xunStart = (zhiIdx - ganIdx + 12) % 12;
    const xunNames = ['甲子旬', '甲戌旬', '甲申旬', '甲午旬', '甲辰旬', '甲寅旬'];
    const xunStartZhi = ['子', '戌', '申', '午', '辰', '寅'];
    const xunIdx = xunStartZhi.indexOf(DIZHI_LIST[xunStart]);
    const xun = xunNames[xunIdx] || '甲子旬';
    return {
        xun,
        kongZhi: XUN_KONG_TABLE[xun],
    };
}
// 获取六神
function getLiuShen(dayGan) {
    if ('甲乙'.includes(dayGan))
        return LIU_SHEN_CONFIG['甲乙'];
    if ('丙丁'.includes(dayGan))
        return LIU_SHEN_CONFIG['丙丁'];
    if (dayGan === '戊')
        return LIU_SHEN_CONFIG['戊'];
    if (dayGan === '己')
        return LIU_SHEN_CONFIG['己'];
    if ('庚辛'.includes(dayGan))
        return LIU_SHEN_CONFIG['庚辛'];
    return LIU_SHEN_CONFIG['壬癸'];
}
// 五行相生相克关系
function getWuXingRelation(from, to) {
    const order = ['木', '火', '土', '金', '水'];
    const fromIdx = order.indexOf(from);
    const toIdx = order.indexOf(to);
    if (from === to)
        return 'same';
    if ((fromIdx + 1) % 5 === toIdx)
        return 'produce';
    if ((toIdx + 1) % 5 === fromIdx)
        return 'produced';
    if ((fromIdx + 2) % 5 === toIdx)
        return 'control';
    return 'controlled';
}
// 计算六亲
function getLiuQin(gongElement, yaoElement) {
    const relation = getWuXingRelation(gongElement, yaoElement);
    const map = {
        'same': '兄弟',
        'produce': '子孙',
        'produced': '父母',
        'control': '妻财',
        'controlled': '官鬼',
    };
    return map[relation];
}
// 计算爻的旺衰
function getYaoStrength(yaoElement, monthZhi) {
    const wangShuai = WANG_SHUAI_TABLE[monthZhi][yaoElement];
    const isStrong = wangShuai === 'wang' || wangShuai === 'xiang';
    return { wangShuai, isStrong };
}
// 根据问题类型判断用神
function determineYongShen(question) {
    const q = question.toLowerCase();
    if (q.includes('财') || q.includes('钱') || q.includes('投资')) {
        return { type: '求财', liuQin: '妻财' };
    }
    if (q.includes('工作') || q.includes('事业') || q.includes('官') || q.includes('升')) {
        return { type: '求官/事业', liuQin: '官鬼' };
    }
    if (q.includes('考试') || q.includes('学业') || q.includes('文书') || q.includes('合同')) {
        return { type: '求学/文书', liuQin: '父母' };
    }
    if (q.includes('婚') || q.includes('感情') || q.includes('恋爱') || q.includes('对象')) {
        return { type: '婚姻感情', liuQin: '妻财' };
    }
    if (q.includes('子') || q.includes('孩') || q.includes('怀孕')) {
        return { type: '子女', liuQin: '子孙' };
    }
    if (q.includes('病') || q.includes('健康') || q.includes('身体')) {
        return { type: '疾病健康', liuQin: '子孙' };
    }
    return { type: '综合', liuQin: '兄弟' };
}
// 查找卦宫（使用八宫归属表）
function findPalace(code) {
    const guiShu = ALL_BA_GONG[code];
    if (!guiShu)
        return undefined;
    const gong = BA_GONG_NA_JIA[guiShu.gong];
    return gong ? { name: guiShu.gong, element: gong.element, order: guiShu.order } : undefined;
}
// 计算完整爻信息
function calculateFullYaoInfo(yaos, hexagramCode, dayGan, gongElement, guaOrder) {
    const hex = getHexagramByCode(hexagramCode);
    if (!hex)
        return [];
    const liuShenList = getLiuShen(dayGan);
    const lowerGong = BA_GONG_NA_JIA[hex.lowerTrigram];
    const upperGong = BA_GONG_NA_JIA[hex.upperTrigram];
    // 根据卦序获取世应位置
    const [shiPos, yingPos] = SHI_YING_TABLE[guaOrder] || [6, 3];
    return yaos.map((yao, idx) => {
        const isLower = idx < 3;
        const gong = isLower ? lowerGong : upperGong;
        const naJiaIdx = idx % 3;
        const naJia = (gong?.naJia[isLower ? 0 : 1][naJiaIdx] || '子');
        const wuXing = DIZHI_WUXING[naJia];
        const liuQin = getLiuQin(gongElement, wuXing);
        return {
            ...yao,
            liuQin,
            liuShen: liuShenList[idx],
            naJia,
            wuXing,
            isShiYao: yao.position === shiPos,
            isYingYao: yao.position === yingPos,
        };
    });
}
// ============= 主处理函数 =============
export async function handleLiuyaoAnalyze(input) {
    const { question, method = 'auto', hexagramName, changedHexagramName, date } = input;
    // 解析日期
    let divDate;
    if (date) {
        if (date.includes('T')) {
            divDate = new Date(date);
        }
        else {
            const [y, m, d] = date.split('-').map(Number);
            divDate = new Date(y, m - 1, d);
        }
    }
    else {
        divDate = new Date();
    }
    const dateKey = `${divDate.getFullYear()}-${String(divDate.getMonth() + 1).padStart(2, '0')}-${String(divDate.getDate()).padStart(2, '0')}`;
    const seed = resolveSeed(input.seed, `${question}|${method}|${dateKey}|${hexagramName || ''}|${changedHexagramName || ''}`);
    const rng = createSeededRng(seed);
    let yaos;
    let hexagramCode;
    let changedCode;
    let changedLines = [];
    let mainHexagramName;
    let finalChangedHexagramName;
    // 起卦方式
    if (method === 'select' && hexagramName) {
        const hexagram = findHexagram(hexagramName);
        if (!hexagram) {
            throw new Error(`未找到卦象：${hexagramName}`);
        }
        hexagramCode = hexagram.code;
        mainHexagramName = hexagram.name;
        // 通过变卦名计算变爻
        if (changedHexagramName) {
            const changedHex = findHexagram(changedHexagramName);
            if (changedHex) {
                changedCode = changedHex.code;
                finalChangedHexagramName = changedHex.name;
                changedLines = calculateChangedLines(hexagramCode, changedCode);
            }
        }
        yaos = hexagramCode.split('').map((char, idx) => ({
            type: parseInt(char),
            change: changedLines.includes(idx + 1) ? 'changing' : 'stable',
            position: idx + 1,
        }));
    }
    else {
        const result = divine(rng);
        yaos = result.yaos;
        hexagramCode = result.hexagramCode;
        changedLines = result.changedLines;
        const mainHex = getHexagramByCode(hexagramCode);
        mainHexagramName = mainHex?.name || hexagramCode;
        if (changedLines.length > 0) {
            changedCode = calculateChangedHexagram(hexagramCode, changedLines);
            const changedHex = getHexagramByCode(changedCode);
            finalChangedHexagramName = changedHex?.name;
        }
    }
    // 获取干支时间
    const ganZhiTime = getGanZhiTime(divDate);
    const dayGan = ganZhiTime.day.gan;
    const monthZhi = ganZhiTime.month.zhi;
    // 计算旬空
    const kongWang = getKongWang(dayGan, ganZhiTime.day.zhi);
    // 获取卦宫
    const palace = findPalace(hexagramCode);
    const gongElement = (palace?.element || '土');
    const guaOrder = palace?.order ?? 0;
    const mainHex = getHexagramByCode(hexagramCode);
    const changedHex = changedCode ? getHexagramByCode(changedCode) : undefined;
    // 计算完整爻信息
    const fullYaos = calculateFullYaoInfo(yaos, hexagramCode, dayGan, gongElement, guaOrder);
    const dayZhi = ganZhiTime.day.zhi;
    // 判断用神
    const yongShenInfo = determineYongShen(question);
    const yongShenYao = fullYaos.find(y => y.liuQin === yongShenInfo.liuQin);
    const yongShenStrength = yongShenYao
        ? getYaoStrength(yongShenYao.wuXing, monthZhi)
        : { wangShuai: 'xiu', isStrong: false };
    // 检查用神空亡状态
    const yongKongWangState = yongShenYao
        ? checkYaoKongWang(yongShenYao.naJia, kongWang, monthZhi, dayZhi, yongShenYao.change === 'changing')
        : 'not_kong';
    // 计算神系
    const shenSystem = yongShenYao
        ? calculateShenSystem(yongShenInfo.liuQin, yongShenYao.wuXing, fullYaos, gongElement)
        : { yuanShen: undefined, jiShen: undefined, chouShen: undefined };
    // 分析三合局
    const sanHeAnalysis = analyzeSanHe(fullYaos, monthZhi, dayZhi);
    // 检测六冲卦
    const liuChongGuaInfo = checkLiuChongGua(fullYaos);
    // 计算时间建议
    const timeRecommendations = yongShenYao
        ? calculateTimeRecommendations({ liuQin: yongShenInfo.liuQin, element: yongShenYao.wuXing, position: yongShenYao.position }, fullYaos)
        : [];
    // 生成警告信息
    const warnings = generateWarnings({
        liuQin: yongShenInfo.liuQin,
        element: yongShenYao?.wuXing || '土',
        position: yongShenYao?.position || 1,
        isStrong: yongShenStrength.isStrong,
        kongWangState: yongKongWangState,
    }, shenSystem, sanHeAnalysis, fullYaos);
    // 计算伏神
    const fuShen = calculateFuShen(fullYaos, palace?.name || '乾', gongElement);
    // 获取变卦卦宫
    const changedPalace = changedCode ? findPalace(changedCode) : undefined;
    // 获取变爻爻辞
    const changedYaoCi = [];
    if (changedLines.length > 0 && YAO_CI[mainHexagramName]) {
        for (const linePos of changedLines) {
            const yaoCi = YAO_CI[mainHexagramName][linePos - 1];
            if (yaoCi)
                changedYaoCi.push(yaoCi);
        }
    }
    // 计算变爻详情
    let changedYaosInfo;
    if (changedCode && changedLines.length > 0) {
        const changedHexInfo = getHexagramByCode(changedCode);
        if (changedHexInfo) {
            const changedLowerGong = BA_GONG_NA_JIA[changedHexInfo.lowerTrigram];
            const changedUpperGong = BA_GONG_NA_JIA[changedHexInfo.upperTrigram];
            changedYaosInfo = changedLines.map(pos => {
                const idx = pos - 1;
                const isLower = idx < 3;
                const gong = isLower ? changedLowerGong : changedUpperGong;
                const naJiaIdx = idx % 3;
                const naJia = (gong?.naJia[isLower ? 0 : 1][naJiaIdx] || '子');
                const wuXing = DIZHI_WUXING[naJia];
                const liuQin = getLiuQin(gongElement, wuXing);
                const changedType = parseInt(changedCode[idx]);
                return {
                    position: pos,
                    type: changedType,
                    liuQin,
                    naJia,
                    wuXing,
                };
            });
        }
    }
    // 构建输出
    return {
        seed,
        question,
        // 本卦信息
        hexagramName: mainHexagramName,
        hexagramGong: palace?.name || '',
        hexagramElement: mainHex?.element || '',
        hexagramBrief: HEXAGRAM_BRIEF[mainHexagramName] || '',
        guaCi: GUA_CI[mainHexagramName],
        xiangCi: XIANG_CI[mainHexagramName],
        // 变卦信息
        changedHexagramName: finalChangedHexagramName,
        changedHexagramGong: changedPalace?.name,
        changedHexagramElement: changedHex?.element,
        changedLines,
        changedYaoCi: changedYaoCi.length > 0 ? changedYaoCi : undefined,
        // 时间信息
        ganZhiTime,
        kongWang,
        // 爻信息
        fullYaos: fullYaos.map((y) => {
            const yaoWangShuai = WANG_SHUAI_TABLE[monthZhi]?.[y.wuXing] || 'xiu';
            const yaoKongWang = checkYaoKongWang(y.naJia, kongWang, monthZhi, dayZhi, y.change === 'changing');
            const yaoStrength = getYaoStrength(y.wuXing, monthZhi);
            const strengthFactors = [];
            if (yaoStrength.isStrong)
                strengthFactors.push('月令生扶');
            if (y.change === 'changing')
                strengthFactors.push('动爻');
            if (yaoKongWang !== 'not_kong')
                strengthFactors.push(KONG_WANG_LABELS[yaoKongWang]);
            // 计算十二长生
            const changSheng = getChangSheng(y.wuXing, y.naJia);
            // 计算变爻分析（仅动爻有）
            let changeAnalysis;
            if (y.change === 'changing' && changedYaosInfo) {
                const changedYao = changedYaosInfo.find(cy => cy.position === y.position);
                if (changedYao) {
                    const analysis = analyzeYaoChange(y.wuXing, changedYao.wuXing, y.naJia, changedYao.naJia, kongWang);
                    changeAnalysis = analysis;
                }
            }
            return {
                position: y.position,
                type: y.type,
                change: y.change,
                liuQin: y.liuQin,
                liuShen: y.liuShen,
                naJia: y.naJia,
                wuXing: y.wuXing,
                isShiYao: y.isShiYao,
                isYingYao: y.isYingYao,
                wangShuai: yaoWangShuai,
                wangShuaiLabel: WANG_SHUAI_LABELS[yaoWangShuai],
                kongWangState: yaoKongWang,
                kongWangLabel: KONG_WANG_LABELS[yaoKongWang],
                strengthScore: yaoStrength.isStrong ? 70 : 30,
                isStrong: yaoStrength.isStrong,
                strengthFactors: strengthFactors.length > 0 ? strengthFactors : undefined,
                changSheng,
                changeAnalysis,
            };
        }),
        // 用神系统
        yongShen: {
            type: yongShenInfo.type,
            liuQin: yongShenInfo.liuQin,
            element: yongShenYao?.wuXing || '土',
            position: yongShenYao?.position || 1,
            strengthScore: yongShenStrength.isStrong ? 70 : 30,
            isStrong: yongShenStrength.isStrong,
            strengthLabel: yongShenStrength.isStrong ? '旺相' : '休囚',
            kongWangState: yongKongWangState !== 'not_kong' ? KONG_WANG_LABELS[yongKongWangState] : undefined,
        },
        shenSystem,
        // 变爻详情
        changedYaos: changedYaosInfo,
        // 伏神
        fuShen: fuShen.length > 0 ? fuShen : undefined,
        // 分析结果
        liuChongGuaInfo,
        sanHeAnalysis,
        warnings: warnings.length > 0 ? warnings : undefined,
        timeRecommendations: timeRecommendations.length > 0 ? timeRecommendations : undefined,
        summary: {
            overallTrend: yongShenStrength.isStrong ? 'favorable' : 'unfavorable',
            keyFactors: [
                liuChongGuaInfo.isLiuChongGua ? '六冲卦（主事散、急）' : '',
                sanHeAnalysis.hasFullSanHe ? `${sanHeAnalysis.fullSanHe?.name}（合力强大）` : '',
                `用神${yongShenInfo.liuQin}${yongShenStrength.isStrong ? '旺相有力' : '休囚无力'}`,
                yongKongWangState !== 'not_kong' ? `用神${KONG_WANG_LABELS[yongKongWangState]}` : '',
                `月令${monthZhi}`,
            ].filter(Boolean),
        },
    };
}
