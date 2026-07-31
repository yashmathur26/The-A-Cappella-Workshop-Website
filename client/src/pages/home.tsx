import { useEffect } from 'react';
import { Link } from 'wouter';
import { Phone, Mail, MapPin, ArrowRight, ArrowUpRight } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GradientButton } from '@/components/ui/gradient-button';
import { Eyebrow } from '@/components/ui/eyebrow';
import { useLocation } from '@/contexts/LocationContext';
import { ROSTER } from '@/lib/staff-roster';

// Web-optimized camp photography (see Website Pictures Lexington/home).
import heroImg from "@gallery/home/hero.jpg";
import aboutImg from "@gallery/home/about.jpg";
import ctaImg from "@gallery/home/cta.jpg";
import moment1 from "@gallery/home/m1.jpg";
import moment2 from "@gallery/home/m2.jpg";
import moment3 from "@gallery/home/m3.jpg";
import moment4 from "@gallery/home/m4.jpg";

// A few real teacher/TA faces for the staff teaser (unique, photo only).
function teaserFaces() {
  const seen = new Set<string>();
  const out: { key: string; name: string; photo?: string }[] = [];
  for (const wk of ROSTER) {
    for (const p of [...wk.teachers, ...wk.tas]) {
      if (p.photo && !seen.has(p.key)) {
        seen.add(p.key);
        out.push(p);
      }
    }
  }
  return out;
}

export default function Home() {
  const { currentLocation, locationData } = useLocation();
  const isLex = currentLocation === 'lexington';
  const weeks = locationData[currentLocation].weeks;

  const getRegistrationUrl = () => {
    if (currentLocation === 'newton-wellesley') return '/newton/register';
    if (currentLocation === 'wayland') return '/wayland/register';
    return '/camp-registration';
  };

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal-in').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [currentLocation]);

  const accentTitle = currentLocation === 'wayland' ? 'gradient-text-purple' : 'gradient-text';
  const faces = teaserFaces();
  const extraFaces = Math.max(0, faces.length - 7);

  const stats = [
    { value: 'Est. 2015', label: 'A community tradition' },
    { value: 'Grades 6–9', label: 'Rising students' },
    { value: `${weeks.length} ${weeks.length === 1 ? 'week' : 'weeks'}`, label: 'Summer 2026' },
    { value: 'Friday', label: 'Showcase each week' },
  ];

  return (
    <div className="min-h-screen">
      {/* ============================= HERO ============================= */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="A Cappella Workshop campers performing" className="w-full h-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0b1220]/80 via-[#0b1220]/78 to-[#0b1220]" />
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-custom/25 via-transparent to-teal-custom/20" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-16 lg:pt-28 lg:pb-24 text-center">
          <div className="reveal-in">
            <Eyebrow>Summer 2026 · Lexington, Massachusetts</Eyebrow>
            <h1 className="mt-5 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.02] text-white text-balance">
              {isLex ? (
                <><span className="gradient-text">Lexington</span> A&nbsp;Cappella Workshop</>
              ) : currentLocation === 'newton-wellesley' ? (
                <><span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">Newton</span> A&nbsp;Cappella Workshop</>
              ) : (
                <><span className="bg-gradient-to-r from-purple-300 to-violet-300 bg-clip-text text-transparent">Wayland</span> A&nbsp;Cappella Workshop</>
              )}
            </h1>
            <p className="mt-6 text-lg lg:text-xl text-white/80 max-w-2xl mx-auto text-pretty">
              {locationData[currentLocation].heroSubtitle}
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link href={getRegistrationUrl()} className="w-full sm:w-auto flex justify-center">
                <GradientButton size="lg" variant={currentLocation === 'wayland' ? 'purple' : 'primary'}>Register Now</GradientButton>
              </Link>
              {isLex && (
                <Link
                  href="/staff"
                  className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-medium text-white/90 border border-white/15 hover:bg-white/5 transition-colors"
                >
                  Meet the teachers
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
            </div>
          </div>

          {/* stat row */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden ring-1 ring-inset ring-white/10 bg-white/5 reveal-in">
            {stats.map((s) => (
              <div key={s.label} className="bg-[#0b1220]/40 px-4 py-5 text-center backdrop-blur-sm">
                <p className="text-xl lg:text-2xl font-bold text-white tracking-tight">{s.value}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-white/50">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================= WHAT IS ============================= */}
      <section className="py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="reveal-in order-2 lg:order-1">
            <Eyebrow>About The 'Shop</Eyebrow>
            <h2 className="mt-3 text-3xl lg:text-4xl font-bold text-white tracking-tight text-balance">
              A week of music, friendship, and growth.
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-white/75 text-pretty">
              Founded in 2015 by a group of Lexington High School students, The A Cappella Workshop (The 'Shop) is a beloved community program where rising 6th-9th grade students dive into the world of a cappella through large group performances while exploring musicality, vocal technique, music theory, and more! Our environment is friendly and high-energy and guides students through learning how to listen, blend, keep time, lead, and perform with confidence.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-white/75 text-pretty">
              Taught by exceptional student teachers from local high school a cappella programs, The 'Shop guides both beginners and experienced singers through a week of making music, learning new skills, and having fun. Each week ends with a performance for families, friends, and community members to showcase the students' work.
            </p>
            <Link href="/about" className="mt-6 inline-flex items-center gap-1.5 font-medium text-sky-custom hover:text-teal-custom transition-colors">
              More about the program <ArrowRight size={16} />
            </Link>
          </div>
          <div className="reveal-in order-1 lg:order-2">
            <div className="relative">
              <img src={aboutImg} alt="Students rehearsing at the workshop" className="w-full aspect-[4/3] object-cover rounded-3xl ring-1 ring-inset ring-white/10" />
              <div className="absolute -bottom-4 -left-4 hidden sm:block rounded-2xl px-5 py-4 glass-card">
                <p className="text-2xl font-bold gradient-text leading-none">Summer 2026</p>
                <p className="mt-1 text-xs text-white/60">Registration open</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================= MOMENTS (Lexington photos) ============================= */}
      {isLex && (
        <section className="py-8 lg:py-12">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-end justify-between gap-4 mb-8 reveal-in">
              <div>
                <Eyebrow>From past summers</Eyebrow>
                <h2 className={`mt-3 text-3xl lg:text-4xl font-bold ${accentTitle}`}>Moments from the 'Shop</h2>
              </div>
              <Link href="/gallery" className="hidden sm:inline-flex items-center gap-1.5 font-medium text-white/70 hover:text-white transition-colors whitespace-nowrap">
                View gallery <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 auto-rows-[150px] sm:auto-rows-[200px] reveal-in">
              <img src={moment1} alt="Camp performance" loading="lazy" className="col-span-2 row-span-2 w-full h-full object-cover rounded-2xl ring-1 ring-inset ring-white/10" />
              <img src={moment2} alt="Students singing" loading="lazy" className="w-full h-full object-cover rounded-2xl ring-1 ring-inset ring-white/10" />
              <img src={moment3} alt="Group rehearsal" loading="lazy" className="w-full h-full object-cover rounded-2xl ring-1 ring-inset ring-white/10" />
              <img src={moment4} alt="Workshop discussion" loading="lazy" className="col-span-2 w-full h-full object-cover rounded-2xl ring-1 ring-inset ring-white/10" />
            </div>
          </div>
        </section>
      )}

      {/* ============================= WEEKS ============================= */}
      <section className="py-16 lg:py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10 reveal-in">
            <Eyebrow>Sessions</Eyebrow>
            <h2 className={`mt-3 text-3xl lg:text-4xl font-bold ${accentTitle}`}>Weeks Running</h2>
            <p className="mt-3 text-white/60">Each session runs Monday–Friday, 9:00 AM – 4:00 PM.</p>
          </div>
          <div className="space-y-3 reveal-in">
            {weeks.map((week, i) => (
              <div key={week.id} className="group flex items-center gap-5 p-5 rounded-2xl staff-card transition-colors hover:bg-white/[0.06]">
                <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-sky-custom/10 border border-sky-custom/20 text-sky-custom font-bold tabular-nums">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-semibold text-white tabular-nums">{week.label}</p>
                  {week.venue && (
                    <p className="mt-0.5 text-sm text-white/55 flex items-center gap-1.5">
                      <MapPin size={13} className="text-white/40" /> {week.venue.name}
                    </p>
                  )}
                </div>
                <Link
                  href={getRegistrationUrl()}
                  className="shrink-0 inline-flex items-center gap-1.5 text-sm font-medium text-sky-custom opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Register <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================= TEACHERS TEASER (Lexington) ============================= */}
      {isLex && faces.length > 0 && (
        <section className="py-8 lg:py-12">
          <div className="max-w-4xl mx-auto px-6">
            <GlassCard className="p-8 lg:p-12 text-center reveal-in">
              <Eyebrow>Our Staff</Eyebrow>
              <h2 className="mt-3 text-2xl lg:text-3xl font-bold text-white tracking-tight text-balance">
                Taught by exceptional student musicians
              </h2>
              <div className="mt-7 flex justify-center">
                <div className="flex -space-x-3">
                  {faces.slice(0, 7).map((p) => (
                    <img
                      key={p.key}
                      src={p.photo}
                      alt={p.name}
                      loading="lazy"
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover ring-2 ring-[#12233f]"
                    />
                  ))}
                  {extraFaces > 0 && (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full ring-2 ring-[#12233f] bg-sky-custom/15 text-sky-custom flex items-center justify-center text-sm font-semibold">
                      +{extraFaces}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-8">
                <Link
                  href="/staff"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-medium text-white border border-white/15 hover:bg-white/5 transition-colors"
                >
                  Meet all teachers &amp; TAs <ArrowRight size={16} />
                </Link>
              </div>
            </GlassCard>
          </div>
        </section>
      )}

      {/* ============================= FIND US ============================= */}
      <section className="py-16 lg:py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-10 reveal-in">
            <Eyebrow>Visit &amp; Contact</Eyebrow>
            <h2 className={`mt-3 text-3xl lg:text-4xl font-bold ${accentTitle}`}>Find Us</h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <GlassCard className="p-7 reveal-in">
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-sky-custom/10 border border-sky-custom/20 text-sky-custom"><Phone size={18} /></div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">Phone</h4>
                    <p className="mt-0.5 text-white/90">{locationData[currentLocation].phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 pt-5 border-t border-white/8">
                  <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-sky-custom/10 border border-sky-custom/20 text-sky-custom"><Mail size={18} /></div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">Email</h4>
                    <p className="mt-0.5 text-white/90 break-all">theacappellaworkshop@gmail.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 pt-5 border-t border-white/8">
                  <div className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-sky-custom/10 border border-sky-custom/20 text-sky-custom"><MapPin size={18} /></div>
                  <div className="flex-1">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-white/50">Address</h4>
                    {isLex ? (
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
              {isLex ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-white font-semibold">Temple Emunah</h4>
                    <p className="text-white/40 text-xs mt-1 mb-3">Weeks: July 27–31, August 10–14, August 17–21</p>
                    <div className="h-56 rounded-xl overflow-hidden ring-1 ring-inset ring-white/10">
                      <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2944.123456789!2d-71.2271715!3d42.4208445!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89e39da7cf60964d%3A0xb9185605b60e37d8!2sTemple%20Emunah!5e0!3m2!1sen!2sus!4v1692820800000!5m2!1sen!2sus" width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Temple Emunah Location" />
                    </div>
                  </div>
                  <div className="pt-6 border-t border-white/8">
                    <h4 className="text-white font-semibold">Follen Church</h4>
                    <p className="text-white/40 text-xs mt-1 mb-3">Weeks: August 3–7, August 24–28</p>
                    <div className="h-56 rounded-xl overflow-hidden ring-1 ring-inset ring-white/10">
                      <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d5889.806471077892!2d-71.20957172382262!3d42.4297945306929!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89e39d9180f2a243%3A0xcb6c786189931c66!2sFollen%20Church!5e0!3m2!1sen!2sus!4v1768470391604!5m2!1sen!2sus" width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title="Follen Church Location" />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-white/90 font-medium">{locationData[currentLocation].address}</p>
                  <p className="text-white/60 text-sm mb-3">{locationData[currentLocation].addressLine2}</p>
                  <div className="h-96 rounded-xl overflow-hidden ring-1 ring-inset ring-white/10">
                    <iframe src={locationData[currentLocation].mapUrl} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" title={`${locationData[currentLocation].name} Location`} />
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </section>

      {/* ============================= CTA ============================= */}
      <section className="pb-20 lg:pb-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="relative overflow-hidden rounded-3xl reveal-in">
            <img src={ctaImg} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0b1220]/92 via-[#0b1220]/85 to-[#0f3b47]/80" />
            <div className="relative z-10 px-8 py-16 lg:px-16 lg:py-20 text-center">
              <h2 className="text-3xl lg:text-5xl font-bold tracking-tight text-white text-balance">Ready to sing?</h2>
              <p className="mt-4 text-lg text-white/80 max-w-xl mx-auto text-pretty">Join us for an unforgettable week of music, friendship, and growth.</p>
              <div className="mt-8 flex justify-center">
                <Link href={getRegistrationUrl()} className="w-full sm:w-auto flex justify-center">
                  <GradientButton size="lg" variant={currentLocation === 'wayland' ? 'purple' : 'primary'}>Register Now</GradientButton>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
