import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Check, X } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GradientButton } from '@/components/ui/gradient-button';

export default function Status() {
  const [location] = useLocation();
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('ok') === '1';
    setIsSuccess(success);
  }, [location]);

  return (
    <div className="min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        {isSuccess ? (
          <GlassCard className="p-12">
            <div className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6">
              <Check className="text-white" size={48} />
            </div>
            <h1 className="text-3xl font-bold mb-4 text-white">Payment worked ✅</h1>
            <p className="text-white/80 mb-8">Thank you for registering! We'll send confirmation details to your email shortly.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/">
                <GradientButton>Back to Home</GradientButton>
              </Link>
              <Link href="/register">
                <GradientButton variant="ghost">Register Another</GradientButton>
              </Link>
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="p-12">
            <div className="w-24 h-24 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-6">
              <X className="text-white" size={48} />
            </div>
            <h1 className="text-3xl font-bold mb-4 text-white">Payment canceled or failed</h1>
            <p className="text-white/80 mb-8">Please try again or contact us if you continue to experience issues.</p>
            <Link href="/register">
              <GradientButton size="lg">Try Again</GradientButton>
            </Link>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
