'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, X, ChevronDown } from 'lucide-react';
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
        <div className="relative">
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
                    className="w-full px-4 py-3 pl-10 pr-16 rounded-lg bg-background border border-border
                         focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                         transition-all duration-200"
                    autoComplete="off"
                />
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />

                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {inputValue && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-1 rounded hover:bg-background-tertiary transition-colors"
                        >
                            <X className="w-4 h-4 text-foreground-secondary" />
                        </button>
                    )}
                    <ChevronDown
                        className={`w-4 h-4 text-foreground-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                </div>
            </div>

            {/* 下拉建议列表 */}
            {isOpen && suggestions.length > 0 && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-1 py-1 rounded-lg bg-background border border-border shadow-lg max-h-60 overflow-y-auto"
                >
                    {suggestions.map((city, index) => (
                        <button
                            key={`${city.province}-${city.name}`}
                            type="button"
                            onClick={() => handleSelect(city)}
                            onMouseEnter={() => setHighlightedIndex(index)}
                            className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${index === highlightedIndex
                                    ? 'bg-accent/10 text-accent'
                                    : 'hover:bg-background-tertiary'
                                }`}
                        >
                            <MapPin className="w-4 h-4 flex-shrink-0 text-foreground-secondary" />
                            <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{city.name}</div>
                                <div className="text-xs text-foreground-secondary truncate">
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
