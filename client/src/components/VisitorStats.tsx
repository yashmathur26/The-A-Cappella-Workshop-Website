import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

interface VisitorStats {
  totalVisits: number;
  visitsToday: number;
}

/**
 * Component to display visitor statistics
 * Shows total visits and visits today
 */
export function VisitorStats() {
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/visits/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch visitor stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading || !stats) {
    return null; // Don't show anything while loading
  }

  return (
    <GlassCard className="p-3 lg:p-4 inline-block backdrop-blur-md">
      <div className="flex items-center gap-2 lg:gap-3">
        <Users className="text-teal-custom" size={16} />
        <div className="text-xs lg:text-sm">
          <div className="text-white/90">
            <span className="font-semibold">{stats.totalVisits.toLocaleString()}</span> <span className="hidden sm:inline">unique visitors</span><span className="sm:hidden">visitors</span>
          </div>
          {stats.visitsToday > 0 && (
            <div className="text-white/70 text-xs">
              {stats.visitsToday} today
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
