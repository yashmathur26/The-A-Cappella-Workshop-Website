import { useEffect } from 'react';
import { Link } from 'wouter';
import { useQuery } from "@tanstack/react-query";
import { Users, GraduationCap, Star, Phone, Mail, MapPin, Clock, Play, User, CreditCard, DollarSign } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GradientButton } from '@/components/ui/gradient-button';
import { Badge } from "@/components/ui/badge";
import { useLocation } from '@/contexts/LocationContext';

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  notes?: string;
  createdAt: string;
}

interface Registration {
  id: string;
  studentId: string;
  weekId: string;
  status: string;
  paymentType?: string;
  amountPaidCents?: number;
  balanceDueCents?: number;
  createdAt: string;
}

interface Payment {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  receivedAt: string;
}

export default function Home() {
  const { currentLocation, setLocation, locationData } = useLocation();

  // Fetch user data for profile summary (only if authenticated)
  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ["/api/students"],
    enabled: false,
  });

  const { data: registrations = [] } = useQuery<Registration[]>({
    queryKey: ["/api/registrations"],
    enabled: false,
  });

  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
    enabled: false,
  });

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
        <div className={`absolute inset-0 ${currentLocation === 'lexington' 
          ? 'bg-gradient-to-r from-indigo-custom/20 to-teal-custom/20' 
          : 'bg-gradient-to-r from-emerald-600/20 to-green-500/20'
        }`}></div>
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center reveal-in">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight text-white">
              {currentLocation === 'lexington' ? (
                <><span className="gradient-text">Lexington</span> A Cappella Workshop</>
              ) : (
                <><span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">Newton</span> A Cappella Workshop</>
              )}
            </h1>
            <p className="text-xl lg:text-2xl text-white/80 mb-4 max-w-3xl mx-auto">
              {locationData[currentLocation].heroSubtitle}
            </p>
            <p className="text-lg text-white/70 mb-8 max-w-3xl mx-auto">
              A modern a cappella camp for rising 6th–9th graders.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <GradientButton size="lg">Register Now</GradientButton>
              </Link>
              {currentLocation === 'lexington' ? (
                <button 
                  onClick={() => setLocation('newton-wellesley')}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-full font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25"
                >
                  Explore Newton
                </button>
              ) : (
                <button 
                  onClick={() => setLocation('lexington')}
                  className="bg-gradient-to-r from-emerald-700 to-green-600 hover:from-emerald-800 hover:to-green-700 text-white px-8 py-3 rounded-full font-medium transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-emerald-500/25"
                >
                  Back to Lexington
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Profile Summary Section - Only shown when authenticated */}
      {false && user && (
        <section className="py-8">
          <div className="max-w-6xl mx-auto px-6">
            <GlassCard className="p-8 reveal-in" hover>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-custom to-teal-custom flex items-center justify-center">
                    <User className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Welcome back, {user.firstName}!
                    </h2>
                    <p className="text-white/60">{user.email}</p>
                  </div>
                </div>
                <Link href="/account">
                  <GradientButton variant="ghost">View Account</GradientButton>
                </Link>
              </div>

              <div className="grid md:grid-cols-4 gap-6">
                {/* Students Count */}
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{students.length}</p>
                  <p className="text-white/60 text-sm">Students</p>
                </div>

                {/* Active Registrations */}
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <GraduationCap className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-white">{registrations.length}</p>
                  <p className="text-white/60 text-sm">Registrations</p>
                </div>

                {/* Total Paid */}
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <DollarSign className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-400">
                    ${registrations.reduce((total, reg) => total + (reg.amountPaidCents ?? 0) / 100, 0).toFixed(2)}
                  </p>
                  <p className="text-white/60 text-sm">Total Paid</p>
                </div>

                {/* Outstanding Balance */}
                <div className="text-center p-4 bg-white/5 rounded-lg">
                  <CreditCard className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-orange-400">
                    ${registrations.reduce((total, reg) => total + (reg.balanceDueCents ?? 0) / 100, 0).toFixed(2)}
                  </p>
                  <p className="text-white/60 text-sm">Balance Due</p>
                </div>
              </div>

              {/* Recent Students with Registration Status */}
              {students.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-white mb-3">Your Students</h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {students.slice(0, 6).map((student) => {
                      const studentRegistrations = registrations.filter(reg => reg.studentId === student.id);
                      const hasActiveRegistration = studentRegistrations.some(reg => 
                        reg.status === 'paid' || reg.status === 'deposit_paid'
                      );
                      
                      return (
                        <div key={student.id} className="bg-white/5 rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="text-white font-medium">
                                {student.firstName} {student.lastName}
                              </p>
                              {studentRegistrations.length > 0 ? (
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    hasActiveRegistration 
                                      ? 'text-green-400 border-green-400' 
                                      : 'text-orange-400 border-orange-400'
                                  }`}
                                >
                                  {studentRegistrations.length} registration{studentRegistrations.length !== 1 ? 's' : ''}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-white/60 border-white/30">
                                  No registrations
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </GlassCard>
          </div>
        </section>
      )}

      {/* Welcome Video Section */}
      <section className="py-6">
        <div className="max-w-4xl mx-auto px-6">
          {currentLocation === 'lexington' ? (
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
          ) : (
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
          )}
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-custom/10 via-sky-custom/5 to-teal-custom/10"></div>
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-16 gradient-text">What Makes Us Special</h2>
          <div className="grid md:grid-cols-3 gap-12">
            <GlassCard className="p-10 reveal-in animate-slide-up relative group overflow-hidden" hover>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-custom/20 to-sky-custom/20 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative z-10">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-custom to-sky-custom flex items-center justify-center mb-8 animate-float shadow-lg shadow-indigo-custom/30">
                  <Users className="text-white" size={36} />
                </div>
                <h3 className="text-2xl font-bold mb-6 text-teal-custom group-hover:text-sky-custom transition-colors duration-300">Teacher-guided small-group singing</h3>
                <p className="text-white/90 leading-relaxed">Build confidence through harmony, blend, and teamwork in supportive peer groups.</p>
              </div>
            </GlassCard>
            
            <GlassCard className="p-10 reveal-in animate-slide-up relative group overflow-hidden" hover>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-sky-custom/20 to-teal-custom/20 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative z-10">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-custom to-teal-custom flex items-center justify-center mb-8 animate-pulse-soft shadow-lg shadow-sky-custom/30">
                  <GraduationCap className="text-white" size={36} />
                </div>
                <h3 className="text-2xl font-bold mb-6 text-sky-custom group-hover:text-teal-custom transition-colors duration-300">Skills that last</h3>
                <p className="text-white/90 leading-relaxed">Beatboxing, arranging, music theory, and rehearsal strategies you'll use forever.</p>
              </div>
            </GlassCard>
            
            <GlassCard className="p-10 reveal-in animate-slide-up relative group overflow-hidden" hover>
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-custom/20 to-indigo-custom/20 rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-700"></div>
              <div className="relative z-10">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-custom to-indigo-custom flex items-center justify-center mb-8 animate-float shadow-lg shadow-teal-custom/30">
                  <Star className="text-white" size={36} />
                </div>
                <h3 className="text-2xl font-bold mb-6 text-indigo-custom group-hover:text-teal-custom transition-colors duration-300">End-of-week performance</h3>
                <p className="text-white/90 leading-relaxed">Families invited Friday at 4:00 PM to celebrate your musical journey.</p>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>


      {/* Get in Touch Section */}
      <section className="py-6">
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
                <div className="h-96 rounded-lg overflow-hidden border border-white/20">
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
      <section className="py-6">
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
      <section className="py-6">
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
