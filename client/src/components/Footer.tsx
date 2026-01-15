import { Mail, Instagram, Linkedin, Facebook } from 'lucide-react';
import { useLocation } from '@/contexts/LocationContext';

export function Footer() {
  const { currentLocation } = useLocation();

  const socialLinks = [
    {
      name: 'Email',
      icon: Mail,
      href: 'mailto:theacappellaworkshop@gmail.com',
      label: 'theacappellaworkshop@gmail.com',
    },
    {
      name: 'Facebook',
      icon: Facebook,
      href: 'https://www.facebook.com/theacappellaworkshop/',
      label: 'Facebook',
    },
    {
      name: 'Instagram',
      icon: Instagram,
      href: 'https://www.instagram.com/theacappellaworkshop/',
      label: 'Instagram',
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      href: 'https://www.linkedin.com/company/the-a-cappella-workshop',
      label: 'LinkedIn',
    },
  ];

  return (
    <footer className={`mt-auto py-8 border-t ${
      currentLocation === 'wayland' 
        ? 'border-purple-500/20' 
        : currentLocation === 'newton-wellesley'
        ? 'border-emerald-500/20'
        : 'border-sky-500/20'
    }`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8">
          {socialLinks.map((social) => {
            const Icon = social.icon;
            return (
              <a
                key={social.name}
                href={social.href}
                target={social.name !== 'Email' ? '_blank' : undefined}
                rel={social.name !== 'Email' ? 'noopener noreferrer' : undefined}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all hover:scale-105 ${
                  currentLocation === 'wayland'
                    ? 'text-purple-300 hover:text-purple-200 hover:bg-purple-500/10'
                    : currentLocation === 'newton-wellesley'
                    ? 'text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10'
                    : 'text-sky-300 hover:text-sky-200 hover:bg-sky-500/10'
                }`}
              >
                <Icon size={20} />
                <span className="text-sm font-medium">{social.label}</span>
              </a>
            );
          })}
        </div>
        <div className="mt-6 text-center">
          <p className={`text-sm ${
            currentLocation === 'wayland'
              ? 'text-purple-300/70'
              : currentLocation === 'newton-wellesley'
              ? 'text-emerald-300/70'
              : 'text-sky-300/70'
          }`}>
            © {new Date().getFullYear()} The A Cappella Workshop. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
