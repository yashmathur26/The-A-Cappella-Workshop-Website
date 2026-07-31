import { useEffect } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { Eyebrow } from '@/components/ui/eyebrow';
import { STAFF_BIOS } from '@/lib/constants';
import { useLocation } from '@/contexts/LocationContext';
import { Users, GraduationCap, Star } from 'lucide-react';
import adamPhoto from "@assets/Screenshot_2025-12-23_at_10.08.52_PM_1766545735728.png";

const ADAM_STAFF = [
  {
    id: "adam",
    name: "Adam Bernstein",
    title: "Director",
    bio: "Adam Bernstein is a singer, pianist, music educator, and vocal and instrumental arranger from Lexington, MA. He graduated from Tufts University with a BA in Music, where he sang with the internationally-recognized a cappella group the Beelzebubs, ran varsity track, and studied abroad in Madrid. Now, Adam plays keys in a local band called Sunnydaze, leads an 80-person choir called Rock Voices Newton, and daylights as a private lessons instructor at The Real School of Music. He is a proud alum of the Lexington High School Madrigal Singers and Rock, Paper, Scissors, and couldn't be more excited to be bringing the workshop to new audiences this summer!",
    imageUrl: adamPhoto,
    imageClassName: "",
  }
];

const FEATURES = [
  {
    icon: Users,
    title: "Teacher-guided rehearsal and performance",
    body: "Build confidence and explore musicality, vocal technique, and leadership.",
  },
  {
    icon: GraduationCap,
    title: "Skills that last",
    body: "Beatboxing, music theory, arranging, songwriting, and solo singing technique to grow students into stronger musicians.",
  },
  {
    icon: Star,
    title: "End-of-week performance",
    body: "Families, friends, and community members invited on Friday to celebrate students' work and musical journey.",
  },
];

export default function About() {
  const { currentLocation } = useLocation();

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal-in').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const accentTitle = currentLocation === 'wayland' ? 'gradient-text-purple' : currentLocation === 'newton-wellesley' ? 'gradient-text-green' : 'gradient-text';
  const isLeadershipPlural = !(currentLocation === 'newton-wellesley' || currentLocation === 'wayland');

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
        {/* Page header */}
        <header className="text-center mb-14 reveal-in">
          <Eyebrow>About Us</Eyebrow>
          <h1 className={`mt-3 text-4xl lg:text-5xl font-bold tracking-tight ${accentTitle}`}>
            About The A Cappella Workshop{currentLocation === 'newton-wellesley' ? ' — Newton' : currentLocation === 'wayland' ? ' — Wayland' : ''}
          </h1>
        </header>

        {/* What is */}
        <section className="mb-16 reveal-in">
          <Eyebrow>About The 'Shop</Eyebrow>
          <h2 className="mt-3 text-2xl lg:text-3xl font-bold text-white">What is The A Cappella Workshop?</h2>
          <p className="mt-5 text-lg leading-relaxed text-white/80 text-pretty">
            Founded in 2015 by a group of Lexington High School students, The A Cappella Workshop (The 'Shop) is a beloved community program where rising 6th-9th grade students dive into the world of a cappella through large group performances while exploring musicality, vocal technique, music theory, and more! Our environment is friendly and high-energy and guides students through learning how to listen, blend, keep time, lead, and perform with confidence. Taught by exceptional student teachers from local high school a cappella programs, The 'Shop guides both beginners and experienced singers through a week of making music, learning new skills, and having fun. Each week ends with a performance for families, friends, and community members to showcase the students' work. Secure your spot for summer 2026 TODAY!
          </p>
        </section>

        {/* What Makes Us Special */}
        <section className="mb-16">
          <div className="text-center mb-10 reveal-in">
            <Eyebrow>Why The 'Shop</Eyebrow>
            <h2 className={`mt-3 text-3xl lg:text-4xl font-bold ${accentTitle}`}>What Makes Us Special</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <GlassCard key={title} className="p-7 reveal-in" hover>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-sky-custom/10 border border-sky-custom/20 text-sky-custom">
                  <Icon size={22} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 text-balance">{title}</h3>
                <p className="text-white/70 leading-relaxed text-sm">{body}</p>
              </GlassCard>
            ))}
          </div>
        </section>

        {/* Our Program */}
        <section className="mb-16 reveal-in">
          <Eyebrow>How the Week Works</Eyebrow>
          <h2 className="mt-3 text-2xl lg:text-3xl font-bold text-white">Our Program</h2>
          <p className="mt-5 text-lg leading-relaxed text-white/80 text-pretty">
            The first day of the workshop centers around group bonding between students and staff, vocal range testing, and song selection, setting the stage for a fun and successful week! From there, students learn, rehearse, and workshop repertoire for the Friday showcase, rotate through skill specific "tracks" (beatboxing, a cappella arranging, music theory, songwriting, and more), and prepare short mock solos to receive supportive, helpful feedback from our experienced teachers.
          </p>
        </section>

        {/* Meet the Leadership */}
        <section>
          <div className="text-center mb-10 reveal-in">
            <Eyebrow>Leadership</Eyebrow>
            <h2 className={`mt-3 text-3xl lg:text-4xl font-bold ${accentTitle}`}>{isLeadershipPlural ? 'Meet the Co-Presidents' : 'Meet the President'}</h2>
          </div>
          <div className="space-y-5">
            {(isLeadershipPlural ? STAFF_BIOS : ADAM_STAFF).map((staff) => (
              <GlassCard key={staff.id} className="p-7 reveal-in">
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  <img
                    src={staff.imageUrl}
                    alt={`${staff.name} headshot`}
                    className={`w-28 h-28 rounded-2xl object-cover ring-1 ring-inset ring-white/10 mx-auto sm:mx-0 flex-shrink-0 ${staff.imageClassName || ''}`}
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white">{staff.name}</h3>
                    <p className={`text-sm font-medium mb-3 ${currentLocation === 'wayland' ? 'text-purple-300' : currentLocation === 'newton-wellesley' ? 'text-emerald-300' : 'text-sky-custom'}`}>{staff.title}</p>
                    <p className="text-white/75 leading-relaxed text-pretty">{staff.bio}</p>
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
