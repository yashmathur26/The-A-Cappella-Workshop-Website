import { useEffect } from 'react';
import { Link } from 'wouter';
import { Users, GraduationCap, Star } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GradientButton } from '@/components/ui/gradient-button';

export default function Home() {
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
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-custom/20 to-teal-custom/20"></div>
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center reveal-in">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight text-white">
              Sing. <span className="gradient-text">Collaborate.</span> Perform.
            </h1>
            <p className="text-xl lg:text-2xl text-white/80 mb-8 max-w-3xl mx-auto">
              A modern a cappella camp for rising 6th–9th graders — running since 2015 in Lexington, MA.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <GradientButton size="lg">Register Now</GradientButton>
              </Link>
              <Link href="/about">
                <GradientButton variant="ghost" size="lg">Learn More</GradientButton>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <GlassCard className="p-8" hover>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-custom to-sky-custom flex items-center justify-center mb-6">
                <Users className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Student-led small-group singing</h3>
              <p className="text-white/80">Build confidence through harmony, blend, and teamwork in supportive peer groups.</p>
            </GlassCard>
            
            <GlassCard className="p-8 reveal-in" hover>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-custom to-teal-custom flex items-center justify-center mb-6">
                <GraduationCap className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Skills that last</h3>
              <p className="text-white/80">Beatboxing, arranging, music theory, and rehearsal strategies you'll use forever.</p>
            </GlassCard>
            
            <GlassCard className="p-8 reveal-in" hover>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-custom to-indigo-custom flex items-center justify-center mb-6">
                <Star className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">End-of-week performance</h3>
              <p className="text-white/80">Families invited Friday at 4:00 PM to celebrate your musical journey.</p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Info Stripe */}
      <section className="py-16 bg-black/20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            <div className="reveal-in">
              <h4 className="text-lg font-semibold text-sky-custom mb-2">Dates (2026)</h4>
              <p className="text-white/80">June 22–26 • July 27–31<br />Aug 3–7 • Aug 10–14 • Aug 17–21</p>
            </div>
            <div className="reveal-in">
              <h4 className="text-lg font-semibold text-sky-custom mb-2">Daily Schedule</h4>
              <p className="text-white/80">9:00 AM – 4:00 PM</p>
            </div>
            <div className="reveal-in">
              <h4 className="text-lg font-semibold text-sky-custom mb-2">Location</h4>
              <p className="text-white/80">Temple Emunah<br />9 Piper Rd, Lexington, MA</p>
            </div>
            <div className="reveal-in">
              <h4 className="text-lg font-semibold text-sky-custom mb-2">Tuition</h4>
              <p className="text-white/80 text-2xl font-bold">$500 per week</p>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12 reveal-in text-white">Experience the Magic</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
              "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
              "https://images.unsplash.com/photo-1516280440614-37939bbacd81?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
              "https://images.unsplash.com/photo-1511735111819-9a3f7709049c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
              "https://images.unsplash.com/photo-1493612276216-ee3925520721?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
              "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
            ].map((src, index) => (
              <GlassCard key={index} className="overflow-hidden reveal-in" hover>
                <img 
                  src={src}
                  alt={`Music camp activity ${index + 1}`}
                  className="w-full h-48 object-cover"
                />
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <GlassCard className="p-12 reveal-in">
            <h2 className="text-3xl lg:text-4xl font-bold mb-6 text-white">Ready to sing?</h2>
            <p className="text-xl text-white/80 mb-8">Join us for an unforgettable week of music, friendship, and growth.</p>
            <Link href="/register">
              <GradientButton size="lg">Register Now</GradientButton>
            </Link>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
