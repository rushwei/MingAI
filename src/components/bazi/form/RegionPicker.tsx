/**
 * 省市县三级联动选择组件
 *
 * 'use client' 标记说明：
 * - 使用 useState 管理选择状态
 * - 包含交互式下拉选择
 */
'use client';

import { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { CHINA_REGIONS } from '@/lib/china-regions';

interface RegionPickerProps {
    value: string;
    onChange: (value: string) => void;
}

export function RegionPicker({ value, onChange }: RegionPickerProps) {
    // 解析当前值为省/市/区
    const parseValue = (val: string): [string, string, string] => {
        if (!val) return ['', '', ''];
        const parts = val.split(/[,，\s]+/).filter(Boolean);
        return [parts[0] || '', parts[1] || '', parts[2] || ''];
    };

    const [province, city, district] = parseValue(value);
    const [selectedProvince, setSelectedProvince] = useState(province);
    const [selectedCity, setSelectedCity] = useState(city);
    const [selectedDistrict, setSelectedDistrict] = useState(district);

    // 同步外部值变化（使用条件更新代替 useEffect）
    const [lastValue, setLastValue] = useState(value);
    if (value !== lastValue) {
        const [p, c, d] = parseValue(value);
        setSelectedProvince(p);
        setSelectedCity(c);
        setSelectedDistrict(d);
        setLastValue(value);
    }

    // 获取当前省份的城市列表
    const cities = useMemo(() => {
        if (!selectedProvince) return [];
        const prov = CHINA_REGIONS.find(r => r.name === selectedProvince);
        return prov?.children || [];
    }, [selectedProvince]);

    // 获取当前城市的区县列表
    const districts = useMemo(() => {
        if (!selectedCity || !cities.length) return [];
        const city = cities.find(c => c.name === selectedCity);
        return city?.children || [];
    }, [selectedCity, cities]);

    // 构建完整地址并通知父组件
    const updateValue = (prov: string, city: string, dist: string) => {
        const parts = [prov, city, dist].filter(Boolean);
        onChange(parts.join(' '));
    };

    // 处理省份变化
    const handleProvinceChange = (prov: string) => {
        setSelectedProvince(prov);
        setSelectedCity('');
        setSelectedDistrict('');
        updateValue(prov, '', '');
    };

    // 处理城市变化
    const handleCityChange = (city: string) => {
        setSelectedCity(city);
        setSelectedDistrict('');
        updateValue(selectedProvince, city, '');
    };

    // 处理区县变化
    const handleDistrictChange = (dist: string) => {
        setSelectedDistrict(dist);
        updateValue(selectedProvince, selectedCity, dist);
    };

    return (
        <div className="grid grid-cols-3 gap-2">
            {/* 省份选择 */}
            <div>
                <label className="block text-xs text-foreground-secondary mb-1">省/直辖市</label>
                <div className="relative">
                    <select
                        value={selectedProvince}
                        onChange={(e) => handleProvinceChange(e.target.value)}
                        className="w-full px-2 py-2 pr-6 border border-border rounded-lg bg-background text-sm
                            focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent
                            appearance-none cursor-pointer"
                    >
                        <option value="">省份</option>
                        {CHINA_REGIONS.map((region) => (
                            <option key={region.name} value={region.name}>
                                {region.name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary pointer-events-none" />
                </div>
            </div>

            {/* 城市选择 */}
            <div>
                <label className="block text-xs text-foreground-secondary mb-1">市/区</label>
                <div className="relative">
                    <select
                        value={selectedCity}
                        onChange={(e) => handleCityChange(e.target.value)}
                        disabled={cities.length === 0}
                        className="w-full px-2 py-2 pr-6 border border-border rounded-lg bg-background text-sm
                            focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent
                            appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <option value="">城市</option>
                        {cities.map((city) => (
                            <option key={city.name} value={city.name}>
                                {city.name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary pointer-events-none" />
                </div>
            </div>

            {/* 区县选择 */}
            <div>
                <label className="block text-xs text-foreground-secondary mb-1">区/县</label>
                <div className="relative">
                    <select
                        value={selectedDistrict}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        disabled={districts.length === 0}
                        className="w-full px-2 py-2 pr-6 border border-border rounded-lg bg-background text-sm
                            focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent
                            appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <option value="">区县</option>
                        {districts.map((dist) => (
                            <option key={dist.name} value={dist.name}>
                                {dist.name}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary pointer-events-none" />
                </div>
            </div>
        </div>
    );
}
