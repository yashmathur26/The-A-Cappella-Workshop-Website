import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { useLocation } from '@/contexts/LocationContext';

export default function FAQ() {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const { currentLocation } = useLocation();

  const getFAQSections = () => [
    {
      id: 'general',
      title: 'General Camp Information',
      content: (
        <div>
          <h4 className="font-semibold mb-3 text-white text-lg">Who is the camp for?</h4>
          <p className="text-white text-base">This camp is designed for rising 6th, 7th, 8th, and 9th graders who are passionate about singing and want to explore the exciting world of contemporary a cappella music. Whether you're a seasoned choir member or just beginning your musical journey, our program welcomes all skill levels. We believe that every student has a unique voice worth celebrating, and our experienced instructors are skilled at meeting each participant where they are in their musical development.</p>
        </div>
      )
    },
    {
      id: 'schedule',
      title: 'Schedule & Logistics',
      content: (
        <div className="space-y-4">
          {currentLocation === 'lexington' ? (
            <>
              <div>
                <h4 className="font-semibold mb-2 text-white text-lg">Location:</h4>
                <p className="text-white text-base">Temple Emunah, 9 Piper Rd, Lexington, MA 02421</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-white text-lg">Dates:</h4>
                <p className="text-white text-base">Multiple week options available throughout the summer</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-white text-lg">Times:</h4>
                <p className="text-white text-base">Monday through Friday, 9:00 AM – 4:00 PM</p>
                <p className="text-white text-sm mt-2">Each day is carefully structured to balance intensive vocal training, creative collaboration, and fun activities. Students will participate in small group rehearsals, skill-building workshops, and individual coaching sessions throughout the week.</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <h4 className="font-semibold mb-2 text-white text-lg">Where:</h4>
                <p className="text-white text-base">Hebrew College, 1860 Washington St, Newton, MA</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-white text-lg">Dates:</h4>
                <p className="text-white text-base">Week of August 18th</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-white text-lg">Times:</h4>
                <p className="text-white text-base">9am to 4pm, Monday through Friday</p>
                <p className="text-white text-sm mt-2">Each day is carefully structured to balance intensive vocal training, creative collaboration, and fun activities. Students will participate in small group rehearsals, skill-building workshops, and individual coaching sessions throughout the week.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-white text-lg">Who:</h4>
                <p className="text-white text-base">For rising 6th, 7th, 8th, and 9th graders</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2 text-white text-lg">Price:</h4>
                <p className="text-white text-base">$600 for one week of the workshop</p>
              </div>
            </>
          )}
          <div>
            <h4 className="font-semibold mb-2 text-white">Drop-off & Pick-up:</h4>
            <p className="text-white">Our welcoming staff will be available at the main entrance each morning to greet students and ensure a smooth start to each day. Parents and guardians can expect prompt communication about pick-up procedures and any daily updates.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2 text-white">Weekly Showcase:</h4>
            <p className="text-white">Every week culminates in an exciting performance showcase on Friday at 4:00 PM, where family and friends are warmly invited to celebrate the incredible musical growth and achievements of our students. This performance represents the collaborative work and individual progress made throughout the week.</p>
          </div>
        </div>
      )
    },
    {
      id: 'curriculum',
      title: 'Curriculum & Experience',
      content: (
        <div>
          <p className="text-white text-base">Students spend the week learning how to sing contemporary a cappella. Day one focuses on bonding, vocal range checks, and song selection. Throughout the week, students rehearse for the showcase, rotate through beatboxing, arranging, and music theory tracks, and prepare short mock solos for supportive feedback. We're always amazed by the growth students show by Friday!</p>
        </div>
      )
    },
    {
      id: 'payment',
      title: 'Registration & Payment',
      content: (
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2 text-white">Tuition:</h4>
            <p className="text-white">{currentLocation === 'lexington' ? '$500 per week.' : '$600 for one week of the workshop.'}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2 text-white">Payment Options:</h4>
            <p className="text-white">You can choose to pay the full tuition amount upfront, or secure your spot with a $150 non-refundable deposit and pay the remaining balance ({currentLocation === 'lexington' ? '$350' : '$450'}) via invoice prior to the start of the program.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2 text-white">Refunds:</h4>
            <p className="text-white">Once a session starts, tuition is non-refundable.</p>
          </div>
          {currentLocation === 'lexington' && (
            <div>
              <h4 className="font-semibold mb-2 text-white">Multiple weeks:</h4>
              <p className="text-white">Families may enroll in one or multiple weeks.</p>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'safety',
      title: 'Supervision & Safety',
      content: (
        <div>
          <p className="text-white">{currentLocation === 'lexington' ? 'Each week is led by 2 teachers with 3–4 teaching assistants, all experienced members of the Lexington High School a cappella and choral programs.' : 'Each week is led by experienced instructors and teaching assistants with extensive background in a cappella and choral programs.'} Students are supervised throughout the day in a positive, inclusive environment. During registration, families can share allergies or health needs; our staff carefully accommodates these to help every student feel comfortable and included.</p>
        </div>
      )
    }
  ];

  const FAQ_SECTIONS = getFAQSections();

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
  }, [currentLocation]);

  const toggleSection = (sectionId: string) => {
    setOpenSection(openSection === sectionId ? null : sectionId);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className={`text-4xl lg:text-5xl font-bold text-center mb-8 ${currentLocation === 'wayland' ? 'gradient-text-purple' : currentLocation === 'newton-wellesley' ? 'gradient-text-green' : 'gradient-text'}`}>Frequently Asked Questions</h1>
        
        <div className="space-y-4">
          {FAQ_SECTIONS.map((section) => (
            <GlassCard key={section.id} className="overflow-hidden">
              <div 
                className="flex justify-between items-center p-6 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => toggleSection(section.id)}
              >
                <h3 className="text-2xl font-semibold text-white">{section.title}</h3>
                <ChevronDown 
                  className={`text-white transition-all duration-500 ease-out ${
                    openSection === section.id ? `rotate-180 ${currentLocation === 'wayland' ? 'text-purple-400' : currentLocation === 'newton-wellesley' ? 'text-emerald-400' : 'text-sky-custom'}` : 'text-white/70'
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
            className={`${currentLocation === 'wayland' ? 'text-purple-400 hover:text-violet-400' : currentLocation === 'newton-wellesley' ? 'text-emerald-400 hover:text-green-400' : 'text-sky-custom hover:text-teal-custom'} transition-colors font-semibold`}
          >
            Email us!
          </a>
        </div>
      </div>
    </div>
  );
}