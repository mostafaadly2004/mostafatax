import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Eye, Check, ChevronDown } from 'lucide-react';
import { useTheme, ThemeMode } from '../../context/ThemeContext.tsx';

interface ThemeToggleProps {
  variant?: 'compact' | 'expanded' | 'dropdown';
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'dropdown', className = '' }) => {
  const { theme, setTheme, cycleTheme, isDark, isLight, isHighContrast } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options: { id: ThemeMode; label: string; icon: React.FC<{ className?: string }>; desc: string }[] = [
    {
      id: 'dark',
      label: 'الوضع الليلي (داكن)',
      icon: Moon,
      desc: 'مريح للعين وخلفية داكنة حديثة'
    },
    {
      id: 'light',
      label: 'الوضع النهاري (فاتح)',
      icon: Sun,
      desc: 'خلفية بيضاء نقية وإضاءة واضحة'
    },
    {
      id: 'high-contrast',
      label: 'تباين عالي (High Contrast)',
      icon: Eye,
      desc: 'أقصى درجات الوضوح والحدود الصريحة'
    }
  ];

  const currentOption = options.find(o => o.id === theme) || options[0];
  const CurrentIcon = currentOption.icon;

  if (variant === 'compact') {
    return (
      <button
        onClick={cycleTheme}
        className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
          isLight
            ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300 shadow-2xs'
            : isHighContrast
            ? 'bg-black text-yellow-400 border-2 border-white font-bold'
            : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10 hover:text-white backdrop-blur-md'
        } ${className}`}
        title={`الوضع الحالي: ${currentOption.label} (انقر للتغيير)`}
        aria-label="تبديل وضع التباين والإضاءة"
      >
        <CurrentIcon className="w-4 h-4" />
      </button>
    );
  }

  if (variant === 'expanded') {
    return (
      <div className={`inline-flex items-center p-1 rounded-2xl border ${
        isLight
          ? 'bg-slate-100 border-slate-200'
          : isHighContrast
          ? 'bg-black border-2 border-white'
          : 'bg-white/5 border-white/10'
      } ${className}`}>
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = theme === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                isActive
                  ? isLight
                    ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                    : isHighContrast
                    ? 'bg-white text-black font-bold'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  : isHighContrast
                  ? 'text-white hover:bg-zinc-800'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title={opt.desc}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{opt.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Dropdown Mode (Default)
  return (
    <div className={`relative ${className}`} ref={dropdownRef} dir="rtl">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
          isLight
            ? 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300 shadow-2xs'
            : isHighContrast
            ? 'bg-black text-yellow-300 border-2 border-white hover:bg-zinc-900'
            : 'bg-white/5 hover:bg-white/10 text-slate-200 border-white/10 hover:text-white backdrop-blur-md'
        }`}
        title="تغيير مستوى التباين والإضاءة (فاتح / داكن / تباين عالي)"
        aria-label="تغيير مستوى التباين"
      >
        <CurrentIcon className={`w-3.5 h-3.5 ${
          isLight 
            ? 'text-amber-500' 
            : isHighContrast 
            ? 'text-yellow-400' 
            : 'text-emerald-400'
        }`} />
        <span className="hidden sm:inline">{currentOption.label.split(' ')[0]}</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {isOpen && (
        <div className={`absolute left-0 mt-2 w-56 rounded-2xl shadow-2xl border p-2 z-50 animate-in fade-in zoom-in-95 duration-100 ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50'
            : isHighContrast
            ? 'bg-black border-2 border-white text-white'
            : 'bg-slate-900/95 backdrop-blur-2xl border-white/15 text-slate-100 shadow-black/60'
        }`}>
          <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200/20 mb-1">
            مستوى التباين والإضاءة
          </div>

          <div className="space-y-1">
            {options.map((opt) => {
              const Icon = opt.icon;
              const isSelected = theme === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    setTheme(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-right flex items-center justify-between p-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                    isSelected
                      ? isLight
                        ? 'bg-emerald-50 text-emerald-900 font-bold border border-emerald-200'
                        : isHighContrast
                        ? 'bg-white text-black font-bold border-2 border-white'
                        : 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                      : isLight
                      ? 'hover:bg-slate-100 text-slate-700 hover:text-slate-900'
                      : isHighContrast
                      ? 'hover:bg-zinc-800 text-white'
                      : 'hover:bg-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg ${
                      isSelected
                        ? isLight
                          ? 'bg-emerald-100 text-emerald-700'
                          : isHighContrast
                          ? 'bg-black text-white'
                          : 'bg-emerald-500/30 text-emerald-300'
                        : isLight
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-white/5 text-slate-400'
                    }`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-bold leading-tight">{opt.label}</div>
                      <div className="text-[10px] text-slate-400 font-normal mt-0.5">{opt.desc}</div>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className={`w-4 h-4 shrink-0 ${
                      isLight ? 'text-emerald-700' : isHighContrast ? 'text-black' : 'text-emerald-400'
                    }`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
