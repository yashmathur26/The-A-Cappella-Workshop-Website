import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

const FAQ_SECTIONS = [
  {
    id: 'general',
    title: 'General Camp Information',
    content: (
      <div>
        <h4 className="font-semibold mb-3 text-sky-custom text-lg">Who is the camp for?</h4>
        <p className="text-white/90 text-base">This camp is for rising 6th, 7th, 8th, and 9th graders who love to sing. Prior choir or singing experience is recommended, but beginners are absolutely welcome.</p>
      </div>
    )
  },
  {
    id: 'schedule',
    title: 'Schedule & Logistics',
    content: (
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2 text-sky-custom text-lg">Where:</h4>
          <p className="text-white/90 text-base">Temple Emunah, 9 Piper Rd, Lexington, MA 02421</p>
        </div>
        <div>
          <h4 className="font-semibold mb-2 text-sky-custom text-lg">When:</h4>
          <p className="text-white/90 text-base">Monday–Friday, 9:00 AM – 4:00 PM</p>
        </div>
        <div>
          <h4 className="font-semibold mb-2 text-sky-custom">Welcome:</h4>
          <p className="text-white/90">A staff member will greet students at the main entrance each morning.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-2 text-sky-custom">Showcase:</h4>
          <p className="text-white/90">On Friday at 4:00 PM, friends and family are invited to a final performance.</p>
        </div>
      </div>
    )
  },
  {
    id: 'curriculum',
    title: 'Curriculum & Experience',
    content: (
      <div>
        <p className="text-white/90 text-base">Students spend the week learning how to sing contemporary a cappella. Day one focuses on bonding, vocal range checks, and song selection. Throughout the week, students rehearse for the showcase, rotate through beatboxing, arranging, and music theory tracks, and prepare short mock solos for supportive feedback. We're always amazed by the growth students show by Friday!</p>
      </div>
    )
  },
  {
    id: 'payment',
    title: 'Registration & Payment',
    content: (
      <div className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2 text-sky-custom">Tuition:</h4>
          <p className="text-white/90">$500 per week.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-2 text-sky-custom">Deposit & balance:</h4>
          <p className="text-white/90">A $150 non-refundable deposit is required to secure a spot; the remaining $350 is due one week before the session begins.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-2 text-sky-custom">Refunds:</h4>
          <p className="text-white/90">Once a session starts, tuition is non-refundable.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-2 text-sky-custom">Multiple weeks:</h4>
          <p className="text-white/90">Families may enroll in one or multiple weeks.</p>
        </div>
      </div>
    )
  },
  {
    id: 'safety',
    title: 'Supervision & Safety',
    content: (
      <div>
        <p className="text-white/90">Each week is led by 2 teachers with 3–4 teaching assistants, all experienced members of the Lexington High School a cappella and choral programs. Students are supervised throughout the day in a positive, inclusive environment. During registration, families can share allergies or health needs; our staff carefully accommodates these to help every student feel comfortable and included.</p>
      </div>
    )
  }
];

export default function FAQ() {
  const [openSection, setOpenSection] = useState<string | null>(null);

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

  const toggleSection = (sectionId: string) => {
    setOpenSection(openSection === sectionId ? null : sectionId);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-4xl lg:text-5xl font-bold text-center mb-8 gradient-text">Frequently Asked Questions</h1>
        
        <div className="space-y-4">
          {FAQ_SECTIONS.map((section) => (
            <GlassCard key={section.id} className="overflow-hidden">
              <div 
                className="flex justify-between items-center p-6 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => toggleSection(section.id)}
              >
                <h3 className="text-2xl font-semibold text-teal-custom">{section.title}</h3>
                <ChevronDown 
                  className={`text-white transition-all duration-500 ease-out ${
                    openSection === section.id ? 'rotate-180 text-sky-custom' : 'text-white/70'
                  }`}
                  size={20}
                />
              </div>
              <div className={`accordion-content ${openSection === section.id ? 'open' : ''} bg-white/5`}>
                <div className="p-6">
                  {section.content}
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        <div className="text-center mt-6">
          <p className="text-white/80">Still have questions?</p>
          <a 
            href="mailto:info@acappellaworkshop.com" 
            className="text-sky-custom hover:text-teal-custom transition-colors font-semibold"
          >
            Email us!
          </a>
        </div>
      </div>
    </div>
  );
}
