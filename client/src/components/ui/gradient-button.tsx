import { ReactNode, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface GradientButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'ghost' | 'purple' | 'aqua';
  size?: 'sm' | 'md' | 'lg';
}

export function GradientButton({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className,
  ...props 
}: GradientButtonProps) {
  const baseClasses = 'rounded-full font-semibold transition-all text-center flex items-center justify-center';
  
  const variantClasses = {
    primary: 'btn-gradient text-white',
    ghost: 'glass-card text-white hover:bg-white/20',
    purple: 'bg-purple-400 hover:bg-purple-500 text-gray-900 shadow-lg shadow-purple-400/30 hover:shadow-purple-400/50',
    aqua: 'text-white bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-500 bg-[length:200%_100%] bg-left hover:bg-right ring-1 ring-inset ring-white/25 shadow-lg shadow-sky-500/30 hover:shadow-sky-400/50 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.45),0_10px_25px_rgba(14,165,233,0.3)] hover:-translate-y-0.5 transition-all duration-500 disabled:opacity-60'
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
