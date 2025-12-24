import { useEffect } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { Play, Video, Camera } from 'lucide-react';

export default function Gallery() {
  useEffect(() => {
    // Scroll reveal animation
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    document.querySelectorAll('.reveal-in').forEach(el => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen pt-20">
      {/* Hero Section */}
      <section className="py-8 lg:py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center reveal-in">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight text-white">
              Gallery & <span className="gradient-text">Videos</span>
            </h1>
            <p className="text-xl lg:text-2xl text-white/80 mb-8 max-w-3xl mx-auto">
              Experience the magic of The A Cappella Workshop through our collection of videos, performances, and memorable moments.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Videos Section */}
      <section className="py-6">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12 reveal-in gradient-text">Featured Videos</h2>
          
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Main Featured Video */}
            <GlassCard className="p-8 reveal-in" hover>
              <div className="aspect-video bg-gradient-to-br from-indigo-custom/30 to-teal-custom/30 rounded-lg flex items-center justify-center mb-6 relative overflow-hidden border border-white/10">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="relative z-10 text-center">
                  <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 mx-auto">
                    <Play className="text-white ml-1" size={32} />
                  </div>
                  <p className="text-white/90 font-medium">2025 Summer Camp Highlights</p>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-teal-custom">Camp Highlights</h3>
              <p className="text-white/80">See what an amazing week at The A Cappella Workshop looks like! From rehearsals to performances, watch our students grow and shine.</p>
            </GlassCard>

            <GlassCard className="p-8 reveal-in" hover>
              <div className="aspect-video bg-gradient-to-br from-sky-custom/30 to-indigo-custom/30 rounded-lg flex items-center justify-center mb-6 relative overflow-hidden border border-white/10">
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="relative z-10 text-center">
                  <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 mx-auto">
                    <Play className="text-white ml-1" size={32} />
                  </div>
                  <p className="text-white/90 font-medium">Student Performance</p>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-sky-custom">Final Performance</h3>
              <p className="text-white/80">Watch our talented students perform the songs they've been working on all week in their end-of-camp showcase.</p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Photo Gallery */}
      <section className="py-6">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12 reveal-in gradient-text">Photo Gallery</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }, (_, index) => (
              <GlassCard key={index} className="overflow-hidden reveal-in" hover>
                <div className="aspect-video bg-gradient-to-br from-indigo-custom/20 to-sky-custom/20 flex items-center justify-center relative">
                  <Camera className="text-white/60" size={32} />
                </div>
                <div className="p-4">
                  <p className="text-white/70 text-sm text-center">Photo {index + 1}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}