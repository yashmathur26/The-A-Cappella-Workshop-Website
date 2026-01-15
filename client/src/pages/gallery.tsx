import { useEffect } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { Play, Video, Camera } from 'lucide-react';
import { useLocation } from '@/contexts/LocationContext';

// Lexington gallery photos
import lexPhoto1 from "@gallery/photo1.JPG";
import lexPhoto2 from "@gallery/photo2.PNG";
import lexPhoto3 from "@gallery/photo3.PNG";
import lexPhoto4 from "@gallery/photo4.JPG";
import lexPhoto5 from "@gallery/photo5.JPG";
import lexPhoto6 from "@gallery/photo6.JPG";

function toYouTubeEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    if (u.hostname.endsWith("youtube.com")) {
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }

    return "";
  } catch {
    return "";
  }
}

const LEXINGTON_VIDEOS = [
  {
    id: "lex-perf-1",
    title: "Performance Video 1",
    description: "A full performance from our Lexington showcase.",
    // If you have a YouTube/Vimeo embed URL later, put it here:
    // youtubeUrl: "https://www.youtube.com/watch?v=...."
    youtubeUrl: "",
  },
  {
    id: "lex-perf-2",
    title: "Performance Video 2",
    description: "Another showcase performance from Lexington.",
    youtubeUrl: "",
  },
];

// Lexington gallery photos (imported above)
const LEXINGTON_PHOTOS: { src: string; alt: string }[] = [
  { src: lexPhoto1, alt: "Lexington workshop performance" },
  { src: lexPhoto2, alt: "Lexington students singing" },
  { src: lexPhoto3, alt: "Lexington camp activity" },
  { src: lexPhoto4, alt: "Lexington group rehearsal" },
  { src: lexPhoto5, alt: "Lexington showcase moment" },
  { src: lexPhoto6, alt: "Lexington camp highlights" },
];

function GalleryPhoto({ src, alt }: { src: string; alt: string }) {
  return (
    <GlassCard className="overflow-hidden reveal-in" hover>
      <div className="w-full h-56 relative">
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget;
            // Avoid infinite loop if fallback also fails
            if (img.dataset.fallbackApplied === "true") return;
            img.dataset.fallbackApplied = "true";
            img.style.display = "none";
            const parent = img.parentElement;
            if (parent) parent.classList.add("lexington-photo-fallback");
          }}
        />
        {/* fallback layer shown only if image fails to load */}
        <div className="absolute inset-0 hidden items-center justify-center bg-gradient-to-br from-indigo-custom/20 via-sky-custom/10 to-teal-custom/20 lexington-fallback-layer">
          <Camera className="text-white/60" size={32} />
        </div>
      </div>
    </GlassCard>
  );
}

export default function Gallery() {
  const { currentLocation } = useLocation();
  
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
    <div className="min-h-screen pt-20">
      {/* Hero Section */}
      <section className="py-8 lg:py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center reveal-in">
            <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight text-white">
              Gallery & <span className={currentLocation === 'wayland' ? 'gradient-text-purple' : currentLocation === 'newton-wellesley' ? 'gradient-text-green' : 'gradient-text'}>Videos</span>
            </h1>
            <p className="text-xl lg:text-2xl text-white/80 mb-8 max-w-3xl mx-auto">
              Experience the magic of The A Cappella Workshop through our collection of videos, performances, and memorable moments.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Videos Section */}
      <section className="py-6">
        <div className="max-w-6xl mx-auto px-6">
          {currentLocation === 'lexington' ? (
            <>
              <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12 reveal-in gradient-text">
                Performance Videos
              </h2>

              <div className="grid md:grid-cols-2 gap-8 mb-12">
                {LEXINGTON_VIDEOS.map((video) => (
                  <GlassCard key={video.id} className="p-8 reveal-in" hover>
                    {video.youtubeUrl && toYouTubeEmbedUrl(video.youtubeUrl) ? (
                      <div className="aspect-video rounded-lg overflow-hidden mb-6 border border-white/10">
                        <iframe
                          src={toYouTubeEmbedUrl(video.youtubeUrl)}
                          title={video.title}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <div className="aspect-video bg-gradient-to-br from-indigo-custom/30 via-sky-custom/20 to-teal-custom/30 rounded-lg flex items-center justify-center mb-6 relative overflow-hidden border border-white/10">
                        <div className="absolute inset-0 bg-black/20"></div>
                        <div className="relative z-10 text-center">
                          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 mx-auto">
                            <Play className="text-white ml-1" size={32} />
                          </div>
                          <p className="text-white/90 font-medium">{video.title}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mb-2">
                      <Video className="text-white/70" size={18} />
                      <h3 className="text-2xl font-bold text-teal-custom">{video.title}</h3>
                    </div>
                    <p className="text-white/80">{video.description}</p>
                  </GlassCard>
                ))}
              </div>
            </>
          ) : (
            <div className="max-w-3xl mx-auto">
              <GlassCard className="p-8 reveal-in">
                <div className="flex items-center justify-center gap-3 mb-3 text-white/80">
                  <Video size={18} />
                  <span className="font-semibold">Videos coming soon</span>
                </div>
                <p className="text-white/70 text-center">
                  We’re collecting performances and highlights for this location.
                </p>
              </GlassCard>
            </div>
          )}
        </div>
      </section>

      {/* Photo Gallery */}
      <section className="py-6">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className={`text-3xl lg:text-4xl font-bold text-center mb-12 reveal-in ${currentLocation === 'wayland' ? 'gradient-text-purple' : currentLocation === 'newton-wellesley' ? 'gradient-text-green' : 'gradient-text'}`}>
            {currentLocation === 'lexington' ? 'Lexington Photos' : 'Photo Gallery'}
          </h2>

          {currentLocation === 'lexington' ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {LEXINGTON_PHOTOS.map((photo) => (
                <GalleryPhoto key={photo.src} src={photo.src} alt={photo.alt} />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {Array.from({ length: 4 }, (_, index) => (
                <GlassCard key={index} className="overflow-hidden reveal-in" hover>
                  <div className="aspect-video bg-gradient-to-br from-indigo-custom/20 to-sky-custom/20 flex items-center justify-center relative">
                    <Camera className="text-white/60" size={32} />
                  </div>
                  <div className="p-4">
                    <p className="text-white/70 text-sm text-center">Photo {index + 1}</p>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}