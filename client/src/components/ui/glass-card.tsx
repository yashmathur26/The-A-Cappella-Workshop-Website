import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className, hover = false }: GlassCardProps) {
  return (
    <div 
      className={cn(
        'glass-card rounded-2xl',
        hover && 'card-hover',
        className
      )}
    >
      {children}
    </div>
  );
}
