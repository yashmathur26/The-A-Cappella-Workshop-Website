import { useEffect } from 'react';
import { Link } from 'wouter';
import { Users, GraduationCap, Star, Phone, Mail, MapPin, Clock, Play } from 'lucide-react';
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
      <section className="relative py-12 lg:py-20 overflow-hidden">
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

      {/* Welcome Video Section */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-6">
          <GlassCard className="p-8 reveal-in" hover>
            <div className="text-center mb-8">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4 gradient-text">Welcome to Camp</h2>
              <p className="text-xl text-white/80">Watch our welcome message and see what makes The A Cappella Workshop special</p>
            </div>
            
            <div className="aspect-video bg-gradient-to-br from-indigo-custom/30 to-teal-custom/30 rounded-lg flex items-center justify-center relative overflow-hidden border border-white/20">
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
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <GlassCard className="p-8 reveal-in animate-slide-up" hover>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-custom to-sky-custom flex items-center justify-center mb-6 animate-float">
                <Users className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-teal-custom">Student-led small-group singing</h3>
              <p className="text-white/80">Build confidence through harmony, blend, and teamwork in supportive peer groups.</p>
            </GlassCard>
            
            <GlassCard className="p-8 reveal-in animate-slide-up" hover>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-custom to-teal-custom flex items-center justify-center mb-6 animate-pulse-soft">
                <GraduationCap className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-sky-custom">Skills that last</h3>
              <p className="text-white/80">Beatboxing, arranging, music theory, and rehearsal strategies you'll use forever.</p>
            </GlassCard>
            
            <GlassCard className="p-8 reveal-in animate-slide-up" hover>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-custom to-indigo-custom flex items-center justify-center mb-6 animate-float">
                <Star className="text-white" size={32} />
              </div>
              <h3 className="text-2xl font-bold mb-4 text-indigo-custom">End-of-week performance</h3>
              <p className="text-white/80">Families invited Friday at 4:00 PM to celebrate your musical journey.</p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Info Stripe */}
      <section className="py-10 bg-black/20">
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
              <p className="text-teal-custom text-2xl font-bold">$500 per week</p>
            </div>
          </div>
        </div>
      </section>

      {/* Get in Touch Section */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12 reveal-in gradient-text">Get in Touch</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Column - Contact Info */}
            <div className="space-y-8">
              <GlassCard className="p-6 reveal-in animate-slide-up" hover>
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-custom to-sky-custom flex items-center justify-center animate-pulse-soft">
                    <Phone className="text-white" size={20} />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-sky-custom mb-2">Phone</h4>
                    <p className="text-white/90">(339) 223-4581</p>
                    <p className="text-white/90">(555) 123-CAMP</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6 reveal-in animate-slide-up" hover>
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-custom to-teal-custom flex items-center justify-center animate-pulse-soft">
                    <Mail className="text-white" size={20} />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-sky-custom mb-2">Email</h4>
                    <p className="text-white/90">theacappellaworkshop@gmail.com</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6 reveal-in animate-slide-up" hover>
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-custom to-indigo-custom flex items-center justify-center animate-pulse-soft">
                    <MapPin className="text-white" size={20} />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-sky-custom mb-2">Address</h4>
                    <p className="text-white/90">Temple Emunah</p>
                    <p className="text-white/90">9 Piper Rd, Lexington, MA</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard className="p-6 reveal-in animate-slide-up" hover>
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-custom to-teal-custom flex items-center justify-center animate-pulse-soft">
                    <Clock className="text-white" size={20} />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-sky-custom mb-2">Camp Hours</h4>
                    <p className="text-white/90">Monday - Friday: 9:00 AM - 4:00 PM</p>
                    <p className="text-white/90">Weekend: Closed</p>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Right Column - Location Map */}
            <div className="space-y-8">
              <GlassCard className="p-8 h-full reveal-in animate-slide-up">
                <h3 className="text-2xl font-bold mb-6 text-teal-custom">Find Us</h3>
                <div className="mb-4">
                  <p className="text-white/90 font-medium">Temple Emunah</p>
                  <p className="text-white/70">9 Piper Rd, Lexington, MA</p>
                </div>
                <div className="aspect-video rounded-lg overflow-hidden border border-white/20">
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
              </GlassCard>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12 reveal-in gradient-text">Experience the Magic</h2>
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
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <GlassCard className="p-12 reveal-in">
            <h2 className="text-3xl lg:text-4xl font-bold mb-6 gradient-text">Ready to sing?</h2>
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
