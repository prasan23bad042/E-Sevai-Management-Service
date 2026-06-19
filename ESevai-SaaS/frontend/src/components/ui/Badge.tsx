import React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'primary', ...props }) => {
  const baseStyles = 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none';
  
  const variants = {
    primary: 'border-transparent bg-blue-600/15 text-blue-400 border-blue-600/30',
    secondary: 'border-transparent bg-slate-800 text-slate-300',
    success: 'border-transparent bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    warning: 'border-transparent bg-amber-500/15 text-amber-400 border-amber-500/30',
    destructive: 'border-transparent bg-red-500/15 text-red-400 border-red-500/30',
    outline: 'text-slate-400 border-slate-700',
  };

  return <span className={cn(baseStyles, variants[variant], className)} {...props} />;
};
