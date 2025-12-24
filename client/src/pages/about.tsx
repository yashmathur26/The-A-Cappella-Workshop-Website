import { useEffect } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { STAFF_BIOS } from '@/lib/constants';
import { useLocation } from '@/contexts/LocationContext';
import adamPhoto from "@assets/Screenshot_2025-12-23_at_10.08.52_PM_1766545735728.png";

const ADAM_STAFF = [
  {
    id: "adam",
    name: "Adam Bernstein",
    title: "President",
    bio: "Adam Bernstein is a singer, pianist, music educator, and vocal/instrumental arranger from Lexington, MA. He graduated from Tufts University with a BA in Music, where he sang with the internationally-recognized a cappella group the Beelzebubs, ran varsity track, and studied abroad in Madrid. Now, Adam plays keys in a local band called Sunnydaze, leads an 80-person choir called Rock Voices Newton, and daylights as a private lessons instructor at The Real School of Music. He is a proud alum of the Lexington High School Madrigal Singers and Rock, Paper, Scissors, and couldn't be more excited to be bringing the workshop to a new audience in Newton this summer!",
    imageUrl: adamPhoto
  }
];

export default function About() {
  const { currentLocation } = useLocation();
  
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
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className={`text-4xl lg:text-5xl font-bold text-center mb-8 ${currentLocation === 'wayland' ? 'gradient-text-purple' : currentLocation === 'newton-wellesley' ? 'gradient-text-green' : 'gradient-text'}`}>About The A Cappella Workshop{currentLocation === 'newton-wellesley' ? ' - Newton' : currentLocation === 'wayland' ? ' - Wayland' : ''}</h1>
        
        {/* What is section */}
        <section className="mb-3">
          <GlassCard className="p-8 lg:p-12 reveal-in">
            <h2 className={`text-2xl lg:text-3xl font-bold mb-6 ${currentLocation === 'wayland' ? 'text-purple-400' : currentLocation === 'newton-wellesley' ? 'text-emerald-400' : 'text-teal-custom'}`}>What is The A Cappella Workshop?</h2>
            <p className="text-lg text-white/90 leading-relaxed">
              {currentLocation === 'newton-wellesley' ? 
                'Building on nearly a decade of success in Lexington, The A Cappella Workshop is excited to bring our innovative program to Newton! Our Newton location offers the same high-quality, student-centered approach that has made us a beloved summer tradition. We focus on small-group, collaborative singing where students learn to listen, blend, arrange, keep time, and perform with confidence. Whether you\'re a beginner or an experienced singer, our welcoming environment in Newton provides the perfect setting to discover your voice and create lasting musical memories. The week concludes with a special showcase performance for family and friends.' :
                'Running since 2015, The A Cappella Workshop is a summer program for middle-school singers who want to explore contemporary a cappella in a friendly, high-energy environment. We focus on student-led, small-group singing: learning how to listen, blend, arrange, keep time, and perform with confidence. Our sessions are welcoming to both beginners and experienced singers, and every week ends with a performance for family and friends.'
              }
            </p>
          </GlassCard>
        </section>

        {/* How the week works */}
        <section className="mb-6">
          <GlassCard className="p-8 lg:p-12 reveal-in">
            <h2 className={`text-2xl lg:text-3xl font-bold mb-6 ${currentLocation === 'wayland' ? 'text-violet-400' : currentLocation === 'newton-wellesley' ? 'text-green-400' : 'text-sky-custom'}`}>How the week works</h2>
            <p className="text-lg text-white/90 leading-relaxed">
              The first day centers on group bonding, vocal range checks, and song selection — setting the foundation for a fun, successful week. From there, students rehearse repertoire for the Friday showcase, rotate through skill "tracks" (beatboxing, arranging, and music theory), and prepare short mock solos to receive supportive feedback from teachers.
            </p>
          </GlassCard>
        </section>

        {/* Meet the Leadership */}
        <section>
          <h2 className={`text-2xl lg:text-3xl font-bold text-center mb-6 ${currentLocation === 'wayland' ? 'gradient-text-purple' : currentLocation === 'newton-wellesley' ? 'gradient-text-green' : 'gradient-text'}`}>{(currentLocation === 'newton-wellesley' || currentLocation === 'wayland') ? 'Meet the President' : 'Meet the Co-Presidents'}</h2>
          <div className="space-y-8">
            {((currentLocation === 'newton-wellesley' || currentLocation === 'wayland') ? ADAM_STAFF : STAFF_BIOS).map((staff) => (
              <GlassCard key={staff.id} className="p-8 reveal-in" hover>
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                  <img 
                    src={staff.imageUrl}
                    alt={`${staff.name} headshot`}
                    className="w-32 h-32 rounded-2xl object-cover mx-auto lg:mx-0 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <h3 className={`text-xl font-bold mb-2 ${currentLocation === 'wayland' ? 'text-purple-400' : currentLocation === 'newton-wellesley' ? 'text-emerald-400' : 'text-sky-custom'}`}>{staff.name} — {staff.title}</h3>
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
