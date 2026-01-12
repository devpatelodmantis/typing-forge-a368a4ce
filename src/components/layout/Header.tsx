import { Keyboard, BarChart3, Settings, Trophy, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function Header() {
  const location = useLocation();
  
  const navItems = [
    { href: '/', label: 'Type', icon: Keyboard },
    { href: '/stats', label: 'Stats', icon: BarChart3 },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  ];
  
  return (
    <header className="sticky top-0 z-50 glass border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <motion.div
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Keyboard className="w-5 h-5" />
            </motion.div>
            <span className="text-xl font-bold tracking-tight">
              typing<span className="text-primary">master</span>
            </span>
          </Link>
          
          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          
          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <button className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
