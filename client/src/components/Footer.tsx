import { Mail, Instagram, Linkedin, Facebook } from 'lucide-react';

export function Footer() {
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
    <footer className="mt-auto py-10 border-t border-white/8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6">
          {socialLinks.map((social) => {
            const Icon = social.icon;
            return (
              <a
                key={social.name}
                href={social.href}
                target={social.name !== 'Email' ? '_blank' : undefined}
                rel={social.name !== 'Email' ? 'noopener noreferrer' : undefined}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-white/55 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Icon size={17} />
                <span className="text-sm font-medium">{social.label}</span>
              </a>
            );
          })}
        </div>
        <div className="mt-6 text-center">
          <p className="text-xs text-white/40">
            © {new Date().getFullYear()} The A Cappella Workshop. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
