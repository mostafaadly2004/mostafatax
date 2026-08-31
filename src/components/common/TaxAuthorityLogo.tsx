import React from 'react';

interface TaxAuthorityLogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
  alt?: string;
}

export const TaxAuthorityLogo: React.FC<TaxAuthorityLogoProps> = ({
  className = 'w-8 h-8',
  size,
  showText = false,
  alt = 'شعار مصلحة الضرائب العقارية - وزارة المالية'
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <div className={`inline-flex items-center justify-center shrink-0 select-none ${className}`} style={style}>
      <img
        src="/tax-authority-logo.png"
        alt={alt}
        className="w-full h-full object-contain rounded-full drop-shadow-xs"
        loading="eager"
        decoding="async"
      />
      {showText && (
        <div className="mr-2 text-right">
          <div className="font-bold text-xs leading-none">مصلحة الضرائب العقارية</div>
          <div className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">وزارة المالية</div>
        </div>
      )}
    </div>
  );
};

