import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

const variantStyles = {
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-destructive',
};

const sizeStyles = {
  sm: 'text-xl md:text-2xl',
  md: 'text-3xl md:text-4xl',
  lg: 'text-4xl md:text-5xl',
};

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(({
  label,
  value,
  suffix,
  variant = 'default',
  size = 'md',
  animate = true,
}, ref) => {
  const content = (
    <>
      <span className="stat-label">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={cn('stat-value', variantStyles[variant], sizeStyles[size])}>
          {value}
        </span>
        {suffix && (
          <span className="text-sm text-muted-foreground">{suffix}</span>
        )}
      </div>
    </>
  );

  if (animate) {
    return (
      <motion.div
        ref={ref}
        className="stat-card flex flex-col items-center justify-center gap-2 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {content}
      </motion.div>
    );
  }
  
  return (
    <div ref={ref} className="stat-card flex flex-col items-center justify-center gap-2 text-center">
      {content}
    </div>
  );
});

StatCard.displayName = 'StatCard';
