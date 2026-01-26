import { useEffect } from 'react';
import { Link } from 'wouter';
import { Users, GraduationCap, Star, Phone, Mail, MapPin, Calendar } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GradientButton } from '@/components/ui/gradient-button';
import { useLocation } from '@/contexts/LocationContext';

// Import welcome image from Lexington gallery
import welcomePhoto from "@gallery/photo1.JPG";

export default function Home() {
  const { currentLocation, setLocation, locationData } = useLocation();

  const getRegistrationUrl = () => {
    if (currentLocation === 'newton-wellesley') {
      return '/newton/register';
    } else if (currentLocation === 'wayland') {
      return '/wayland/register';
    }
    return '/camp-registration';
  };

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
  }, [currentLocation]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-8 lg:py-12 overflow-hidden">
        <div className={`absolute inset-0 ${
          currentLocation === 'lexington' 
            ? 'bg-gradient-to-r from-indigo-custom/20 to-teal-custom/20' 
            : currentLocation === 'newton-wellesley'
            ? 'bg-gradient-to-r from-emerald-700/20 via-green-600/15 to-teal-500/20'
            : 'bg-gradient-to-r from-purple-300/20 via-violet-300/15 to-fuchsia-300/20'
        }`}></div>
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center reveal-in">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight text-white">
              {currentLocation === 'lexington' ? (
                <><span className="gradient-text">Lexington</span> A Cappella Workshop</>
              ) : currentLocation === 'newton-wellesley' ? (
                <><span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">Newton</span> A Cappella Workshop</>
              ) : (
                <><span className="bg-gradient-to-r from-purple-300 to-violet-300 bg-clip-text text-transparent">Wayland</span> A Cappella Workshop</>
              )}
            </h1>
            <p className="text-xl lg:text-2xl text-white/80 mb-8 max-w-3xl mx-auto">
              {locationData[currentLocation].heroSubtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
              <Link href={getRegistrationUrl()}>
                <GradientButton size="lg" variant={currentLocation === 'wayland' ? 'purple' : 'primary'}>Register Now</GradientButton>
              </Link>
              <div className="flex gap-3 flex-wrap justify-center">
                {currentLocation !== 'lexington' && (
                  <Link 
                    href="/"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-full font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25 text-center flex items-center justify-center"
                  >
                    Lexington
                  </Link>
                )}
                {currentLocation !== 'newton-wellesley' && (
                  <Link 
                    href="/newton"
                    className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-6 py-3 rounded-full font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-emerald-500/25 text-center flex items-center justify-center"
                  >
                    Newton
                  </Link>
                )}
                {currentLocation !== 'wayland' && (
                  <Link 
                    href="/wayland"
                    className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white px-6 py-3 rounded-full font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-purple-500/25 text-center flex items-center justify-center"
                  >
                    Wayland
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Welcome Section */}
      <section className="py-6">
        <div className="max-w-4xl mx-auto px-6">
          <GlassCard className="p-8 reveal-in" hover>
            <div className="text-center mb-8">
              <h2 className={`text-3xl lg:text-4xl font-bold mb-4 ${currentLocation === 'wayland' ? 'gradient-text-purple' : 'gradient-text'}`}>The A Cappella Workshop</h2>
              <p className="text-xl text-white/80">Welcome video coming soon!!!</p>
            </div>
            
            <div className="aspect-video rounded-lg overflow-hidden border border-white/20">
              <img 
                src={welcomePhoto} 
                alt="A Cappella Workshop campers" 
                className="w-full h-full object-cover"
              />
            </div>
          </GlassCard>
        </div>
      </section>

      {/* What is The A Cappella Workshop Section */}
      <section className="py-16 relative overflow-hidden">
        <div className={`absolute inset-0 ${
          currentLocation === 'lexington'
            ? 'bg-gradient-to-r from-indigo-custom/10 via-sky-custom/5 to-teal-custom/10'
            : currentLocation === 'newton-wellesley'
            ? 'bg-gradient-to-r from-emerald-600/10 via-green-500/5 to-teal-400/10'
            : 'bg-gradient-to-r from-purple-300/10 via-violet-300/5 to-fuchsia-300/10'
        }`}></div>
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <GlassCard className="p-8 lg:p-12 reveal-in">
            <h2 className={`text-2xl lg:text-3xl font-bold mb-6 ${currentLocation === 'wayland' ? 'text-purple-400' : currentLocation === 'newton-wellesley' ? 'text-emerald-400' : 'text-teal-custom'}`}>What is The A Cappella Workshop?</h2>
            <p className="text-lg text-white/90 leading-relaxed">
              {currentLocation === 'lexington' ?
                'Founded in 2015 by a group of Lexington High School students, The A Cappella Workshop (The \'Shop) is a beloved community program where rising 6th-9th grade students dive into the world of a cappella through large group performances while exploring musicality, vocal technique, music theory, and more! Our environment is friendly and high-energy and guides students through learning how to listen, blend, keep time, lead, and perform with confidence. Taught by exceptional student teachers from local high school a cappella programs, The \'Shop guides both beginners and experienced singers through a week of making music, learning new skills, and having fun. Each week ends with a performance for families, friends, and community members to showcase the students\' work. Secure your spot for summer 2026 TODAY!' :
                currentLocation === 'newton-wellesley' ? 
                'Building on nearly a decade of success in Lexington, The A Cappella Workshop is excited to bring our innovative program to Newton! Our Newton location offers the same high-quality, student-centered approach that has made us a beloved summer tradition. We focus on small-group, collaborative singing where students learn to listen, blend, arrange, keep time, and perform with confidence. Whether you\'re a beginner or an experienced singer, our welcoming environment in Newton provides the perfect setting to discover your voice and create lasting musical memories. The week concludes with a special showcase performance for family and friends.' :
                'Running since 2015, The A Cappella Workshop is a summer program for middle-school singers who want to explore contemporary a cappella in a friendly, high-energy environment. We focus on student-led, small-group singing: learning how to listen, blend, arrange, keep time, and perform with confidence. Our sessions are welcoming to both beginners and experienced singers, and every week ends with a performance for family and friends.'
              }
            </p>
          </GlassCard>
        </div>
      </section>


      {/* Get in Touch Section */}
      <section className="py-6">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className={`text-3xl lg:text-4xl font-bold text-center mb-12 reveal-in ${currentLocation === 'wayland' ? 'gradient-text-purple' : 'gradient-text'}`}>Get in Touch</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column - Contact Info */}
            <div className="space-y-8">
              <GlassCard className="p-6 reveal-in animate-slide-up" hover>
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center animate-pulse-soft ${currentLocation === 'wayland' ? 'bg-gradient-to-br from-purple-300 to-violet-300' : 'bg-gradient-to-br from-indigo-custom to-sky-custom'}`}>
                    <Phone className="text-white" size={20} />
                  </div>
                  <div>
                    <h4 className={`text-lg font-semibold mb-2 ${currentLocation === 'wayland' ? 'text-violet-300' : 'text-sky-custom'}`}>Phone</h4>
                    <p className="text-white/90">{locationData[currentLocation].phone}</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6 reveal-in animate-slide-up" hover>
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center animate-pulse-soft ${currentLocation === 'wayland' ? 'bg-gradient-to-br from-violet-300 to-fuchsia-300' : 'bg-gradient-to-br from-sky-custom to-teal-custom'}`}>
                    <Mail className="text-white" size={20} />
                  </div>
                  <div>
                    <h4 className={`text-lg font-semibold mb-2 ${currentLocation === 'wayland' ? 'text-purple-300' : 'text-sky-custom'}`}>Email</h4>
                    <p className="text-white/90">theacappellaworkshop@gmail.com</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6 reveal-in animate-slide-up" hover>
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center animate-pulse-soft ${currentLocation === 'wayland' ? 'bg-gradient-to-br from-fuchsia-300 to-purple-300' : 'bg-gradient-to-br from-teal-custom to-indigo-custom'}`}>
                    <MapPin className="text-white" size={20} />
                  </div>
                  <div>
                    <h4 className={`text-lg font-semibold mb-2 ${currentLocation === 'wayland' ? 'text-fuchsia-300' : 'text-sky-custom'}`}>Address</h4>
                    {currentLocation === 'lexington' ? (
                      <div className="space-y-4">
                        <div>
                          <p className="text-white/90 font-medium text-base">Temple Emunah</p>
                          <p className="text-white/70 text-sm">9 Piper Rd, Lexington, MA 02421</p>
                        </div>
                        <div className="pt-3 border-t border-white/20">
                          <p className="text-white/90 font-medium text-base">Follen Church</p>
                          <p className="text-white/70 text-sm">755 Massachusetts Avenue, Lexington, MA 02420</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-white/90">{locationData[currentLocation].address}</p>
                        <p className="text-white/90">{locationData[currentLocation].addressLine2}</p>
                      </>
                    )}
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6 reveal-in animate-slide-up" hover>
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center animate-pulse-soft ${currentLocation === 'wayland' ? 'bg-gradient-to-br from-purple-300 to-violet-300' : 'bg-gradient-to-br from-indigo-custom to-teal-custom'}`}>
                    <Calendar className="text-white" size={20} />
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-lg font-semibold mb-3 ${currentLocation === 'wayland' ? 'text-violet-300' : 'text-sky-custom'}`}>Weeks Running</h4>
                    <div className="space-y-2">
                      {locationData[currentLocation].weeks.map((week) => (
                        <div key={week.id} className="text-white/90">
                          <div className="flex items-start gap-2">
                            <span className="font-medium">• {week.label}</span>
                            <span className="text-white/70">(9:00 AM - 4:00 PM)</span>
                          </div>
                          {week.venue && (
                            <div className="text-white/60 text-xs ml-4 mt-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {week.venue.name}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>

            </div>

            {/* Right Column - Location Maps */}
            <div className="space-y-6">
              <GlassCard className="p-8 reveal-in animate-slide-up">
                <h3 className={`text-2xl font-bold mb-6 ${currentLocation === 'wayland' ? 'text-violet-300' : 'text-teal-custom'}`}>Find Us</h3>
                
                {currentLocation === 'lexington' ? (
                  <div className="space-y-8">
                    {/* Temple Emunah */}
                    <div>
                      <h4 className="text-xl font-bold text-sky-custom mb-2">Temple Emunah</h4>
                      <p className="text-white/80 mb-1">9 Piper Rd, Lexington, MA 02421</p>
                      <p className="text-white/60 text-sm mb-4">Weeks: July 27–31, August 10–14, August 17–21</p>
                      <div className="h-64 rounded-lg overflow-hidden border border-white/20">
                        <iframe
                          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2944.123456789!2d-71.2271715!3d42.4208445!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89e39da7cf60964d%3A0xb9185605b60e37d8!2sTemple%20Emunah!5e0!3m2!1sen!2sus!4v1692820800000!5m2!1sen!2sus"
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          allowFullScreen
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          title="Temple Emunah Location"
                        />
                      </div>
                    </div>
                    
                    {/* Follen Church */}
                    <div className="pt-6 border-t border-white/20">
                      <h4 className="text-xl font-bold text-sky-custom mb-2">Follen Church</h4>
                      <p className="text-white/80 mb-1">755 Massachusetts Avenue, Lexington, MA 02420</p>
                      <p className="text-white/60 text-sm mb-4">Weeks: August 3–7, August 24–28</p>
                      <div className="h-64 rounded-lg overflow-hidden border border-white/20">
                        <iframe
                          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d5889.806471077892!2d-71.20957172382262!3d42.4297945306929!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89e39d9180f2a243%3A0xcb6c786189931c66!2sFollen%20Church!5e0!3m2!1sen!2sus!4v1768470391604!5m2!1sen!2sus"
                          width="100%"
                          height="100%"
                          style={{ border: 0 }}
                          allowFullScreen
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          title="Follen Church Location"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-white/90 font-medium">{locationData[currentLocation].address}</p>
                    <p className="text-white/70 mb-4">{locationData[currentLocation].addressLine2}</p>
                    <div className="h-96 rounded-lg overflow-hidden border border-white/20">
                      <iframe
                        src={locationData[currentLocation].mapUrl}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title={`${locationData[currentLocation].name} Location`}
                      />
                    </div>
                  </div>
                )}
              </GlassCard>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-6">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <GlassCard className="p-12 reveal-in">
            <h2 className={`text-3xl lg:text-4xl font-bold mb-6 ${currentLocation === 'wayland' ? 'gradient-text-purple' : 'gradient-text'}`}>Ready to sing?</h2>
            <p className="text-xl text-white/80 mb-8">Join us for an unforgettable week of music, friendship, and growth.</p>
            <div className="flex justify-center">
              <Link href={getRegistrationUrl()}>
                <GradientButton size="lg" variant={currentLocation === 'wayland' ? 'purple' : 'primary'}>Register Now</GradientButton>
              </Link>
            </div>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
