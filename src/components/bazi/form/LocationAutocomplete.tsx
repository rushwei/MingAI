/**
 * 地点自动补全组件
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useState, useRef, useEffect, useCallback)
 * - 有输入框交互和下拉建议列表功能
 */
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, X } from 'lucide-react';
import { searchCities, type CityInfo } from '@/lib/cities';

interface LocationAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function LocationAutocomplete({
    value,
    onChange,
    placeholder = '请输入出生地点',
}: LocationAutocompleteProps) {
    const [inputValue, setInputValue] = useState(value);
    const [isOpen, setIsOpen] = useState(false);
    const [suggestions, setSuggestions] = useState<CityInfo[]>([]);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 同步外部 value 变化
    useEffect(() => {
        setInputValue(value);
    }, [value]);

    // 处理输入变化
    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        onChange(newValue);

        if (newValue.trim()) {
            const results = searchCities(newValue, 8);
            setSuggestions(results);
            setIsOpen(results.length > 0);
            setHighlightedIndex(-1);
        } else {
            setSuggestions([]);
            setIsOpen(false);
        }
    }, [onChange]);

    // 选择城市
    const handleSelect = useCallback((city: CityInfo) => {
        setInputValue(city.fullName);
        onChange(city.fullName);
        setIsOpen(false);
        setSuggestions([]);
        setHighlightedIndex(-1);
    }, [onChange]);

    // 清除输入
    const handleClear = useCallback(() => {
        setInputValue('');
        onChange('');
        setSuggestions([]);
        setIsOpen(false);
        inputRef.current?.focus();
    }, [onChange]);

    // 键盘导航
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!isOpen || suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < suggestions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev > 0 ? prev - 1 : suggestions.length - 1
                );
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
                    handleSelect(suggestions[highlightedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setHighlightedIndex(-1);
                break;
        }
    }, [isOpen, suggestions, highlightedIndex, handleSelect]);

    // 点击外部关闭
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node) &&
                inputRef.current &&
                !inputRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 失去焦点时更新父组件
    const handleBlur = useCallback(() => {
        // 延迟执行以允许点击选择
        setTimeout(() => {
            if (inputValue !== value) {
                onChange(inputValue);
            }
        }, 150);
    }, [inputValue, value, onChange]);

    return (
        <div className="relative group/input">
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        if (inputValue.trim()) {
                            const results = searchCities(inputValue, 8);
                            setSuggestions(results);
                            setIsOpen(results.length > 0);
                        }
                    }}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    className="w-full px-4 py-3 pl-10 pr-10 rounded-lg bg-background border border-border
                         focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent
                         group-hover/input:border-accent/50
                         transition-all duration-200 placeholder:text-foreground-tertiary"
                    autoComplete="off"
                />
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-tertiary group-focus-within/input:text-accent transition-colors duration-200" />

                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {inputValue && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-1 rounded-full hover:bg-background-tertiary text-foreground-tertiary hover:text-foreground transition-all duration-200"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* 下拉建议列表 */}
            {isOpen && suggestions.length > 0 && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-2 py-2 rounded-xl bg-background border border-border shadow-xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200"
                >
                    {suggestions.map((city, index) => (
                        <button
                            key={`${city.province}-${city.name}`}
                            type="button"
                            onClick={() => handleSelect(city)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${index === highlightedIndex
                                ? 'bg-accent/10 text-accent'
                                : 'hover:bg-background-tertiary text-foreground-secondary hover:text-foreground'
                                }`}
                        >
                            <MapPin className={`w-4 h-4 flex-shrink-0 ${index === highlightedIndex ? 'text-accent' : 'text-foreground-tertiary'}`} />
                            <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{city.name}</div>
                                <div className={`text-xs truncate ${index === highlightedIndex ? 'text-accent/70' : 'text-foreground-tertiary'}`}>
                                    {city.fullName}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
