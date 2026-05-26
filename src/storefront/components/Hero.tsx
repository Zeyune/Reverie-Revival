import React from 'react';

const posterImage = "/assets/a90825419248c95d26b754e8e623a043995ebcd1.png";

interface HeroProps {
  onNavigate: (page: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background with texture */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ 
          backgroundImage: `url(${posterImage})`,
          filter: 'grayscale(100%) contrast(120%)',
        }}
      />
      
      {/* Noise overlay */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='4' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        {/* Main Brand Name */}
        <h1 
          className="mb-6 tracking-[0.4em] animate-fadeIn"
          style={{ 
            fontFamily: "'Poppins', sans-serif",
            fontSize: 'clamp(2rem, 8vw, 6rem)',
            fontWeight: 900,
            textShadow: '0 0 30px rgba(255,255,255,0.1)',
          }}
        >
          REVERIE REVIVAL
        </h1>
        
        {/* Tagline in brush script */}
        <p 
          className="mb-12 text-white/90 animate-fadeIn delay-200"
          style={{ 
            fontFamily: "'Allura', cursive",
            fontSize: 'clamp(1.75rem, 4vw, 3.5rem)',
            textShadow: '0 0 20px rgba(255,255,255,0.2)',
          }}
        >
          Awaken Your Dream. Rewrite Reality.
        </p>
        
        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fadeIn delay-400">
          <button
            onClick={() => onNavigate('new-drop')}
            className="group relative px-8 py-4 bg-white text-[#0B0B0C] tracking-[0.2em] overflow-hidden transition-all duration-300 hover:tracking-[0.3em]"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            <span className="relative z-10">SHOP NEW DROP</span>
            <div className="absolute inset-0 bg-[#E10613] transform translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="absolute inset-0 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 tracking-[0.2em]">
              SHOP NEW DROP
            </span>
          </button>
          
          <button
            onClick={() => onNavigate('shop')}
            className="px-8 py-4 border-2 border-white text-white tracking-[0.2em] hover:bg-white hover:text-[#0B0B0C] transition-all duration-300 hover:tracking-[0.3em]"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            BROWSE ALL
          </button>
        </div>
        
        {/* Est. Badge */}
        <div className="mt-16 animate-fadeIn delay-600">
          <p className="tracking-[0.3em] opacity-60" style={{ fontFamily: "'Poppins', sans-serif" }}>
            EST. 2024
          </p>
        </div>
      </div>
      
      {/* Gradient overlay at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0B0B0C] to-transparent" />
    </section>
  );
};
