import { useEffect } from 'react';
import { Link } from 'wouter';
import { Users, GraduationCap, Star, Phone, Mail, MapPin, Clock, Play } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GradientButton } from '@/components/ui/gradient-button';
import { useLocation } from '@/contexts/LocationContext';

export default function Home() {
  const { currentLocation, setLocation, locationData } = useLocation();

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
            ? 'bg-gradient-to-r from-emerald-600/20 to-green-500/20'
            : 'bg-gradient-to-r from-purple-300/20 to-violet-300/20'
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
            <p className="text-xl lg:text-2xl text-white/80 mb-4 max-w-3xl mx-auto">
              {locationData[currentLocation].heroSubtitle}
            </p>
            <p className="text-lg text-white/70 mb-8 max-w-3xl mx-auto">
              A modern a cappella camp for rising 6th–9th graders.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
              <Link href="/camp-registration">
                <GradientButton size="lg" variant={currentLocation === 'wayland' ? 'purple' : 'primary'}>Register Now</GradientButton>
              </Link>
              <div className="flex gap-3 flex-wrap justify-center">
                {currentLocation !== 'lexington' && (
                  <button 
                    onClick={() => setLocation('lexington')}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-full font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25"
                  >
                    Lexington
                  </button>
                )}
                {currentLocation !== 'newton-wellesley' && (
                  <button 
                    onClick={() => setLocation('newton-wellesley')}
                    className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white px-6 py-3 rounded-full font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-emerald-500/25"
                  >
                    Newton
                  </button>
                )}
                {currentLocation !== 'wayland' && (
                  <button 
                    onClick={() => setLocation('wayland')}
                    className="bg-purple-300 hover:bg-purple-400 text-gray-900 px-6 py-3 rounded-full font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-purple-300/25"
                  >
                    Wayland
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Welcome Video Section */}
      <section className="py-6">
        <div className="max-w-4xl mx-auto px-6">
          <GlassCard className="p-8 reveal-in" hover>
            <div className="text-center mb-8">
              <h2 className={`text-3xl lg:text-4xl font-bold mb-4 ${currentLocation === 'wayland' ? 'gradient-text-purple' : 'gradient-text'}`}>Welcome to Camp</h2>
              <p className="text-xl text-white/80">Watch our welcome message and see what makes The A Cappella Workshop special</p>
            </div>
            
            <div className={`aspect-video rounded-lg flex items-center justify-center relative overflow-hidden border border-white/20 ${
              currentLocation === 'wayland' 
                ? 'bg-gradient-to-br from-purple-300/30 to-violet-300/30' 
                : 'bg-gradient-to-br from-indigo-custom/30 to-teal-custom/30'
            }`}>
              <div className="absolute inset-0 bg-black/20"></div>
              <div className="relative z-10 text-center">
                <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6 mx-auto hover:bg-white/30 transition-colors cursor-pointer">
                  <Play className="text-white ml-2" size={40} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Welcome Video</h3>
                <p className="text-white/80">Click here when your welcome video is ready to upload</p>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-16 relative overflow-hidden">
        <div className={`absolute inset-0 ${currentLocation === 'wayland' ? 'bg-gradient-to-r from-purple-300/10 via-violet-300/5 to-fuchsia-300/10' : 'bg-gradient-to-r from-indigo-custom/10 via-sky-custom/5 to-teal-custom/10'}`}></div>
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <h2 className={`text-3xl lg:text-4xl font-bold text-center mb-16 ${currentLocation === 'wayland' ? 'gradient-text-purple' : 'gradient-text'}`}>What Makes Us Special</h2>
          <div className="grid md:grid-cols-3 gap-12">
            <GlassCard className="p-10 reveal-in animate-slide-up relative group overflow-hidden" hover>
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-700 ${currentLocation === 'wayland' ? 'bg-gradient-to-br from-purple-300/20 to-violet-300/20' : 'bg-gradient-to-br from-indigo-custom/20 to-sky-custom/20'}`}></div>
              <div className="relative z-10">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-8 animate-float shadow-lg ${currentLocation === 'wayland' ? 'bg-gradient-to-br from-purple-300 to-violet-300 shadow-purple-300/30' : 'bg-gradient-to-br from-indigo-custom to-sky-custom shadow-indigo-custom/30'}`}>
                  <Users className="text-white" size={36} />
                </div>
                <h3 className={`text-2xl font-bold mb-6 transition-colors duration-300 ${currentLocation === 'wayland' ? 'text-violet-300 group-hover:text-purple-300' : 'text-teal-custom group-hover:text-sky-custom'}`}>Teacher-guided small-group singing</h3>
                <p className="text-white/90 leading-relaxed">Build confidence through harmony, blend, and teamwork in supportive peer groups.</p>
              </div>
            </GlassCard>
            
            <GlassCard className="p-10 reveal-in animate-slide-up relative group overflow-hidden" hover>
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-700 ${currentLocation === 'wayland' ? 'bg-gradient-to-br from-violet-300/20 to-fuchsia-300/20' : 'bg-gradient-to-br from-sky-custom/20 to-teal-custom/20'}`}></div>
              <div className="relative z-10">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-8 animate-pulse-soft shadow-lg ${currentLocation === 'wayland' ? 'bg-gradient-to-br from-violet-300 to-fuchsia-300 shadow-violet-300/30' : 'bg-gradient-to-br from-sky-custom to-teal-custom shadow-sky-custom/30'}`}>
                  <GraduationCap className="text-white" size={36} />
                </div>
                <h3 className={`text-2xl font-bold mb-6 transition-colors duration-300 ${currentLocation === 'wayland' ? 'text-purple-300 group-hover:text-violet-300' : 'text-sky-custom group-hover:text-teal-custom'}`}>Skills that last</h3>
                <p className="text-white/90 leading-relaxed">Beatboxing, arranging, music theory, and rehearsal strategies you'll use forever.</p>
              </div>
            </GlassCard>
            
            <GlassCard className="p-10 reveal-in animate-slide-up relative group overflow-hidden" hover>
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-700 ${currentLocation === 'wayland' ? 'bg-gradient-to-br from-fuchsia-300/20 to-purple-300/20' : 'bg-gradient-to-br from-teal-custom/20 to-indigo-custom/20'}`}></div>
              <div className="relative z-10">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-8 animate-float shadow-lg ${currentLocation === 'wayland' ? 'bg-gradient-to-br from-fuchsia-300 to-purple-300 shadow-fuchsia-300/30' : 'bg-gradient-to-br from-teal-custom to-indigo-custom shadow-teal-custom/30'}`}>
                  <Star className="text-white" size={36} />
                </div>
                <h3 className={`text-2xl font-bold mb-6 transition-colors duration-300 ${currentLocation === 'wayland' ? 'text-fuchsia-300 group-hover:text-purple-300' : 'text-indigo-custom group-hover:text-teal-custom'}`}>End-of-week performance</h3>
                <p className="text-white/90 leading-relaxed">Families invited Friday at 4:00 PM to celebrate your musical journey.</p>
              </div>
            </GlassCard>
          </div>
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
                    <p className="text-white/90">{locationData[currentLocation].address}</p>
                    <p className="text-white/90">{locationData[currentLocation].addressLine2}</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6 reveal-in animate-slide-up" hover>
                <div className="flex items-start space-x-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center animate-pulse-soft ${currentLocation === 'wayland' ? 'bg-gradient-to-br from-purple-300 to-violet-300' : 'bg-gradient-to-br from-indigo-custom to-teal-custom'}`}>
                    <Clock className="text-white" size={20} />
                  </div>
                  <div>
                    <h4 className={`text-lg font-semibold mb-2 ${currentLocation === 'wayland' ? 'text-violet-300' : 'text-sky-custom'}`}>Camp Hours</h4>
                    <p className="text-white/90">Monday - Friday: 9:00 AM - 4:00 PM</p>
                    <p className="text-white/90">Weekend: Closed</p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Right Column - Location Map */}
            <div className="space-y-8">
              <GlassCard className="p-8 h-full reveal-in animate-slide-up">
                <h3 className={`text-2xl font-bold mb-6 ${currentLocation === 'wayland' ? 'text-violet-300' : 'text-teal-custom'}`}>Find Us</h3>
                <div className="mb-4">
                  <p className="text-white/90 font-medium">{locationData[currentLocation].address}</p>
                  <p className="text-white/70">{locationData[currentLocation].addressLine2}</p>
                </div>
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
              </GlassCard>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-6">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className={`text-3xl lg:text-4xl font-bold text-center mb-12 reveal-in ${currentLocation === 'wayland' ? 'gradient-text-purple' : 'gradient-text'}`}>Experience the Magic</h2>
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
      <section className="py-6">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <GlassCard className="p-12 reveal-in">
            <h2 className={`text-3xl lg:text-4xl font-bold mb-6 ${currentLocation === 'wayland' ? 'gradient-text-purple' : 'gradient-text'}`}>Ready to sing?</h2>
            <p className="text-xl text-white/80 mb-8">Join us for an unforgettable week of music, friendship, and growth.</p>
            <Link href="/camp-registration">
              <GradientButton size="lg" variant={currentLocation === 'wayland' ? 'purple' : 'primary'}>Register Now</GradientButton>
            </Link>
          </GlassCard>
        </div>
      </section>
    </div>
  );
}
