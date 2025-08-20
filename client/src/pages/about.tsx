import { useEffect } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { STAFF_BIOS } from '@/lib/constants';

export default function About() {
  useEffect(() => {
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
      <div className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-4xl lg:text-5xl font-bold text-center mb-16 gradient-text">About The A Cappella Workshop</h1>
        
        {/* What is section */}
        <section className="mb-16">
          <GlassCard className="p-8 lg:p-12 reveal-in">
            <h2 className="text-2xl lg:text-3xl font-bold mb-6 text-white">What is The A Cappella Workshop?</h2>
            <p className="text-lg text-white/90 leading-relaxed">
              Running since 2015, The A Cappella Workshop is a summer program for middle-school singers who want to explore contemporary a cappella in a friendly, high-energy environment. We focus on student-led, small-group singing: learning how to listen, blend, arrange, keep time, and perform with confidence. Our sessions are welcoming to both beginners and experienced singers, and every week ends with a performance for family and friends.
            </p>
          </GlassCard>
        </section>

        {/* How the week works */}
        <section className="mb-16">
          <GlassCard className="p-8 lg:p-12 reveal-in">
            <h2 className="text-2xl lg:text-3xl font-bold mb-6 text-white">How the week works</h2>
            <p className="text-lg text-white/90 leading-relaxed">
              The first day centers on group bonding, vocal range checks, and song selection — setting the foundation for a fun, successful week. From there, students rehearse repertoire for the Friday showcase, rotate through skill "tracks" (beatboxing, arranging, and music theory), and prepare short mock solos to receive supportive feedback from teachers.
            </p>
          </GlassCard>
        </section>

        {/* Meet the Co-Presidents */}
        <section>
          <h2 className="text-2xl lg:text-3xl font-bold text-center mb-12 text-white">Meet the Co-Presidents</h2>
          <div className="space-y-8">
            {STAFF_BIOS.map((staff) => (
              <GlassCard key={staff.id} className="p-8 reveal-in" hover>
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                  <img 
                    src={staff.imageUrl}
                    alt={`${staff.name} headshot`}
                    className="w-32 h-32 rounded-2xl object-cover mx-auto lg:mx-0 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2 gradient-text">{staff.name} — {staff.title}</h3>
                    <p className="text-white/90 leading-relaxed">
                      {staff.bio}
                    </p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
