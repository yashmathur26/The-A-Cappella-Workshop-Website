import { useEffect } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { STAFF_BIOS } from '@/lib/constants';
import { useLocation } from '@/contexts/LocationContext';
import { Users, GraduationCap, Star } from 'lucide-react';
import adamPhoto from "@assets/Screenshot_2025-12-23_at_10.08.52_PM_1766545735728.png";

const ADAM_STAFF = [
  {
    id: "adam",
    name: "Adam Bernstein",
    title: "Newton and Wayland Director",
    bio: "Adam Bernstein is a singer, pianist, music educator, and vocal/instrumental arranger from Lexington, MA. He graduated from Tufts University with a BA in Music, where he sang with the internationally-recognized a cappella group the Beelzebubs, ran varsity track, and studied abroad in Madrid. Now, Adam plays keys in a local band called Sunnydaze, leads an 80-person choir called Rock Voices Newton, and daylights as a private lessons instructor at The Real School of Music. He is a proud alum of the Lexington High School Madrigal Singers and Rock, Paper, Scissors, and couldn't be more excited to be bringing the workshop to a new audience in Newton this summer!",
    imageUrl: adamPhoto,
    imageClassName: "",
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
              Founded in 2015 by a group of Lexington High School students, The A Cappella Workshop (The \'Shop) is a beloved community program where rising 6th-9th grade students dive into the world of a cappella through large group performances while exploring musicality, vocal technique, music theory, and more! Our environment is friendly and high-energy and guides students through learning how to listen, blend, keep time, lead, and perform with confidence. Taught by exceptional student teachers from local high school a cappella programs, The \'Shop guides both beginners and experienced singers through a week of making music, learning new skills, and having fun. Each week ends with a performance for families, friends, and community members to showcase the students\' work. Secure your spot for summer 2026 TODAY!
            </p>
          </GlassCard>
        </section>

        {/* What Makes Us Special */}
        {(
          <section className="mb-6">
            <h2 className={`text-3xl lg:text-4xl font-bold text-center mb-12 ${currentLocation === 'wayland' ? 'gradient-text-purple' : 'gradient-text'}`}>What Makes Us Special</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <GlassCard className="p-8 reveal-in animate-slide-up relative group overflow-hidden" hover>
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-700 bg-gradient-to-br from-indigo-custom/20 to-sky-custom/20"></div>
                <div className="relative z-10">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mb-8 animate-float shadow-lg bg-gradient-to-br from-indigo-custom to-sky-custom shadow-indigo-custom/30">
                    <Users className="text-white" size={36} />
                  </div>
                  <h3 className="text-2xl font-bold mb-6 transition-colors duration-300 text-teal-custom group-hover:text-sky-custom">Teacher-guided rehearsal and performance</h3>
                  <p className="text-white/90 leading-relaxed">Build confidence and explore musicality, vocal technique, and leadership.</p>
                </div>
              </GlassCard>
              
              <GlassCard className="p-8 reveal-in animate-slide-up relative group overflow-hidden" hover>
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-700 bg-gradient-to-br from-sky-custom/20 to-teal-custom/20"></div>
                <div className="relative z-10">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mb-8 animate-pulse-soft shadow-lg bg-gradient-to-br from-sky-custom to-teal-custom shadow-sky-custom/30">
                    <GraduationCap className="text-white" size={36} />
                  </div>
                  <h3 className="text-2xl font-bold mb-6 transition-colors duration-300 text-sky-custom group-hover:text-teal-custom">Skills that last</h3>
                  <p className="text-white/90 leading-relaxed">Beatboxing, music theory, arranging, songwriting, and solo singing technique to grow students into stronger musicians.</p>
                </div>
              </GlassCard>
              
              <GlassCard className="p-8 reveal-in animate-slide-up relative group overflow-hidden" hover>
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-700 bg-gradient-to-br from-teal-custom/20 to-indigo-custom/20"></div>
                <div className="relative z-10">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mb-8 animate-float shadow-lg bg-gradient-to-br from-teal-custom to-indigo-custom shadow-teal-custom/30">
                    <Star className="text-white" size={36} />
                  </div>
                  <h3 className="text-2xl font-bold mb-6 transition-colors duration-300 text-indigo-custom group-hover:text-teal-custom">End-of-week performance</h3>
                  <p className="text-white/90 leading-relaxed">Families, friends, and community members invited on Friday to celebrate students' work and musical journey.</p>
                </div>
              </GlassCard>
            </div>
          </section>
        )

        {/* How the week works */}
        <section className="mb-6">
          <GlassCard className="p-8 lg:p-12 reveal-in">
            <h2 className={`text-2xl lg:text-3xl font-bold mb-6 ${currentLocation === 'wayland' ? 'text-violet-400' : currentLocation === 'newton-wellesley' ? 'text-green-400' : 'text-sky-custom'}`}>
              Our Program
            </h2>
            <p className="text-lg text-white/90 leading-relaxed">
              The first day of the workshop centers around group bonding between students and staff, vocal range testing, and song selection, setting the stage for a fun and successful week! From there, students learn, rehearse, and workshop repertoire for the Friday showcase, rotate through skill specific "tracks" (beatboxing, a cappella arranging, music theory, songwriting, and more), and prepare short mock solos to receive supportive, helpful feedback from our experienced teachers.
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
                  <div className="w-32 h-32 rounded-2xl overflow-hidden mx-auto lg:mx-0 flex-shrink-0">
                    <img 
                      src={staff.imageUrl}
                      alt={`${staff.name} headshot`}
                      className={`w-full h-full object-cover ${staff.imageClassName || ''}`}
                    />
                  </div>
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
