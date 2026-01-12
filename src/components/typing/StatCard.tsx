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

export function StatCard({
  label,
  value,
  suffix,
  variant = 'default',
  size = 'md',
  animate = true,
}: StatCardProps) {
  const Container = animate ? motion.div : 'div';
  
  return (
    <Container
      className="stat-card flex flex-col items-center justify-center gap-2 text-center"
      initial={animate ? { opacity: 0, y: 20 } : undefined}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.3 }}
    >
      <span className="stat-label">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={cn('stat-value', variantStyles[variant], sizeStyles[size])}>
          {value}
        </span>
        {suffix && (
          <span className="text-sm text-muted-foreground">{suffix}</span>
        )}
      </div>
    </Container>
  );
}
