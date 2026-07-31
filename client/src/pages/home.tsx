import { useEffect } from 'react';
import { Link } from 'wouter';
import { Phone, Mail, MapPin, Calendar } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GradientButton } from '@/components/ui/gradient-button';
import { Eyebrow } from '@/components/ui/eyebrow';
import { useLocation } from '@/contexts/LocationContext';

// Import welcome image from Lexington gallery
import welcomePhoto from "@gallery/photo1.JPG";

export default function Home() {
  const { currentLocation, locationData } = useLocation();

  const getRegistrationUrl = () => {
    if (currentLocation === 'newton-wellesley') {
      return '/newton/register';
    } else if (currentLocation === 'wayland') {
      return '/wayland/register';
    }
    return '/camp-registration';
  };

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.reveal-in').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [currentLocation]);

  const accentTitle = currentLocation === 'wayland' ? 'gradient-text-purple' : 'gradient-text';

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden py-16 lg:py-24">
        <div className={`absolute inset-0 ${
          currentLocation === 'lexington'
            ? 'bg-gradient-to-b from-indigo-custom/15 via-transparent to-transparent'
            : currentLocation === 'newton-wellesley'
            ? 'bg-gradient-to-b from-emerald-700/15 via-transparent to-transparent'
            : 'bg-gradient-to-b from-purple-300/15 via-transparent to-transparent'
        }`}></div>
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <div className="text-center reveal-in">
            <Eyebrow>Summer 2026 · Lexington, Massachusetts</Eyebrow>
            <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight text-white text-balance">
              {currentLocation === 'lexington' ? (
                <><span className="gradient-text">Lexington</span> A&nbsp;Cappella Workshop</>
              ) : currentLocation === 'newton-wellesley' ? (
                <><span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">Newton</span> A&nbsp;Cappella Workshop</>
              ) : (
                <><span className="bg-gradient-to-r from-purple-300 to-violet-300 bg-clip-text text-transparent">Wayland</span> A&nbsp;Cappella Workshop</>
              )}
            </h1>
            <p className="mt-5 text-lg lg:text-xl text-white/70 max-w-2xl mx-auto text-pretty">
              {locationData[currentLocation].heroSubtitle}
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center items-center flex-wrap">
              <Link href={getRegistrationUrl()} className="w-full sm:w-auto flex justify-center">
                <GradientButton size="lg" variant={currentLocation === 'wayland' ? 'purple' : 'primary'}>Register Now</GradientButton>
              </Link>
              {/* Cross-location link: only on the (dormant) non-Lexington pages. */}
              {currentLocation !== 'lexington' && (
                <Link
                  href="/"
                  className="w-full sm:w-auto text-center px-6 py-3 rounded-full font-medium text-white/90 border border-white/15 hover:bg-white/5 transition-colors"
                >
                  Lexington
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Welcome */}
      <section className="py-10">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-8 reveal-in">
            <Eyebrow>Welcome</Eyebrow>
            <h2 className={`mt-3 text-3xl lg:text-4xl font-bold ${accentTitle}`}>The A Cappella Workshop</h2>
            <p className="mt-3 text-white/60">Welcome video coming soon!!!</p>
          </div>
          <div className="aspect-video rounded-2xl overflow-hidden ring-1 ring-inset ring-white/10 reveal-in">
            <img
              src={welcomePhoto}
              alt="A Cappella Workshop campers"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* What is The A Cappella Workshop */}
      <section className="py-12 lg:py-16">
        <div className="max-w-3xl mx-auto px-6">
          <div className="reveal-in">
            <Eyebrow>About The 'Shop</Eyebrow>
            <h2 className={`mt-3 text-2xl lg:text-3xl font-bold ${currentLocation === 'wayland' ? 'text-purple-300' : currentLocation === 'newton-wellesley' ? 'text-emerald-300' : 'text-white'}`}>
              What is The A Cappella Workshop?
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-white/80 text-pretty">
              Founded in 2015 by a group of Lexington High School students, The A Cappella Workshop (The 'Shop) is a beloved community program where rising 6th-9th grade students dive into the world of a cappella through large group performances while exploring musicality, vocal technique, music theory, and more! Our environment is friendly and high-energy and guides students through learning how to listen, blend, keep time, lead, and perform with confidence. Taught by exceptional student teachers from local high school a cappella programs, The 'Shop guides both beginners and experienced singers through a week of making music, learning new skills, and having fun. Each week ends with a performance for families, friends, and community members to showcase the students' work. Secure your spot for summer 2026 TODAY!
            </p>
          </div>
        </div>
      </section>

      {/* Get in Touch */}
      <section className="py-12 lg:py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10 reveal-in">
            <Eyebrow>Visit &amp; Contact</Eyebrow>
            <h2 className={`mt-3 text-3xl lg:text-4xl font-bold ${accentTitle}`}>Get in Touch</h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Contact + weeks */}
            <div className="space-y-6">
              <GlassCard className="p-7 reveal-in">
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-sky-custom/10 border border-sky-custom/20 text-sky-custom">
                      <Phone size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">Phone</h4>
                      <p className="mt-0.5 text-white/90">{locationData[currentLocation].phone}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 pt-5 border-t border-white/8">
                    <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-sky-custom/10 border border-sky-custom/20 text-sky-custom">
                      <Mail size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">Email</h4>
                      <p className="mt-0.5 text-white/90 break-all">theacappellaworkshop@gmail.com</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 pt-5 border-t border-white/8">
                    <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-sky-custom/10 border border-sky-custom/20 text-sky-custom">
                      <MapPin size={18} />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">Address</h4>
                      {currentLocation === 'lexington' ? (
                        <div className="mt-2 space-y-3">
                          <div>
                            <p className="text-white/90 font-medium">Temple Emunah</p>
                            <p className="text-white/60 text-sm">9 Piper Rd, Lexington, MA 02421</p>
                          </div>
                          <div>
                            <p className="text-white/90 font-medium">Follen Church</p>
                            <p className="text-white/60 text-sm">755 Massachusetts Avenue, Lexington, MA 02420</p>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1">
                          <p className="text-white/90">{locationData[currentLocation].address}</p>
                          <p className="text-white/70">{locationData[currentLocation].addressLine2}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-7 reveal-in">
                <div className="flex items-center gap-3 mb-5">
                  <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-sky-custom/10 border border-sky-custom/20 text-sky-custom">
                    <Calendar size={18} />
                  </div>
                  <h4 className="text-lg font-semibold text-white">Weeks Running</h4>
                </div>
                <ul className="space-y-3">
                  {locationData[currentLocation].weeks.map((week) => (
                    <li key={week.id} className="flex items-baseline justify-between gap-3 border-l-2 border-sky-custom/40 pl-3">
                      <div>
                        <span className="text-white/90 font-medium tabular-nums">{week.label}</span>
                        {week.venue && (
                          <span className="block text-white/50 text-xs mt-0.5">{week.venue.name}</span>
                        )}
                      </div>
                      <span className="text-white/50 text-sm whitespace-nowrap tabular-nums">9:00 AM – 4:00 PM</span>
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </div>

            {/* Find Us */}
            <GlassCard className="p-7 reveal-in">
              <h3 className="text-lg font-semibold text-white mb-5">Find Us</h3>
              {currentLocation === 'lexington' ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-white font-semibold">Temple Emunah</h4>
                    <p className="text-white/60 text-sm">9 Piper Rd, Lexington, MA 02421</p>
                    <p className="text-white/40 text-xs mt-1 mb-3">Weeks: July 27–31, August 10–14, August 17–21</p>
                    <div className="h-56 rounded-xl overflow-hidden ring-1 ring-inset ring-white/10">
                      <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2944.123456789!2d-71.2271715!3d42.4208445!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89e39da7cf60964d%3A0xb9185605b60e37d8!2sTemple%20Emunah!5e0!3m2!1sen!2sus!4v1692820800000!5m2!1sen!2sus"
                        width="100%" height="100%" style={{ border: 0 }}
                        allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                        title="Temple Emunah Location"
                      />
                    </div>
                  </div>
                  <div className="pt-6 border-t border-white/8">
                    <h4 className="text-white font-semibold">Follen Church</h4>
                    <p className="text-white/60 text-sm">755 Massachusetts Avenue, Lexington, MA 02420</p>
                    <p className="text-white/40 text-xs mt-1 mb-3">Weeks: August 3–7, August 24–28</p>
                    <div className="h-56 rounded-xl overflow-hidden ring-1 ring-inset ring-white/10">
                      <iframe
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d5889.806471077892!2d-71.20957172382262!3d42.4297945306929!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89e39d9180f2a243%3A0xcb6c786189931c66!2sFollen%20Church!5e0!3m2!1sen!2sus!4v1768470391604!5m2!1sen!2sus"
                        width="100%" height="100%" style={{ border: 0 }}
                        allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                        title="Follen Church Location"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-white/90 font-medium">{locationData[currentLocation].address}</p>
                  <p className="text-white/60 text-sm mb-3">{locationData[currentLocation].addressLine2}</p>
                  <div className="h-96 rounded-xl overflow-hidden ring-1 ring-inset ring-white/10">
                    <iframe
                      src={locationData[currentLocation].mapUrl}
                      width="100%" height="100%" style={{ border: 0 }}
                      allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                      title={`${locationData[currentLocation].name} Location`}
                    />
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 lg:py-20">
        <div className="max-w-3xl mx-auto px-6">
          <GlassCard className="p-10 lg:p-14 text-center reveal-in">
            <h2 className={`text-3xl lg:text-4xl font-bold ${accentTitle}`}>Ready to sing?</h2>
            <p className="mt-4 text-lg text-white/70 text-pretty">Join us for an unforgettable week of music, friendship, and growth.</p>
            <div className="mt-8 flex justify-center">
              <Link href={getRegistrationUrl()} className="w-full sm:w-auto flex justify-center">
                <GradientButton size="lg" variant={currentLocation === 'wayland' ? 'purple' : 'primary'}>Register Now</GradientButton>
              </Link>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
