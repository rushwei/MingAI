import type { DerivedHexagramJSON } from '../shared/json-types.js';
export interface MeihuaCanonicalJSON {
    起卦信息: {
        问题: string;
        方法: string;
        方法系: '经典' | '扩展';
        实际子方式?: string;
        起卦时间?: string;
        原始文本?: string;
        分句?: string[];
        取用文本?: string;
        取句方式?: '首句' | '末句';
        原始输入?: {
            日期: string;
            数量?: number;
            数量类别?: 'item' | 'sound';
            文本?: string;
            分句?: string[];
            取用文本?: string;
            取句方式?: '首句' | '末句';
            左半笔画?: number;
            右半笔画?: number;
            量法?: string;
            大单位?: number;
            小单位?: number;
            上卦类象?: string;
            上卦类象类别?: string;
            下卦类象?: string;
            下卦类象类别?: string;
            指定卦名?: string;
            指定上卦?: string;
            指定下卦?: string;
            指定动爻?: number;
            数字序列?: number[];
        };
        输入摘要: string[];
        警告?: string[];
    };
    卦盘: {
        本卦: {
            卦名: string;
            上卦: string;
            下卦: string;
            五行: string;
            卦辞?: string;
            象辞?: string;
        };
        动爻: string;
        变卦: DerivedHexagramJSON;
        互卦?: DerivedHexagramJSON;
        错卦?: DerivedHexagramJSON;
        综卦?: DerivedHexagramJSON;
        体卦: {
            卦名: string;
            五行: string;
            所属: '上卦' | '下卦';
        };
        用卦: {
            卦名: string;
            五行: string;
            所属: '上卦' | '下卦';
        };
    };
    干支时间: Array<{
        柱: string;
        干支: string;
    }>;
    体用分析: {
        关系: string;
        判定: string;
        月令旺衰: {
            月支: string;
            体卦: string;
            用卦: string;
            体互?: string;
            用互?: string;
            变卦?: string;
        };
    };
    克应分析: Array<{
        层级: string;
        关系: string;
        吉凶: '吉' | '凶';
        说明: string;
    }>;
    应期提示: Array<{
        阶段: string;
        触发: string;
        说明: string;
    }>;
    结论: {
        结果: '吉' | '平' | '凶';
        总结: string;
        依据: string[];
    };
}
//# sourceMappingURL=json-types.d.ts.map