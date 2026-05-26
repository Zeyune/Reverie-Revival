import React from 'react';

const posterImage = "/assets/a90825419248c95d26b754e8e623a043995ebcd1.png";

export const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ 
            backgroundImage: `url(${posterImage})`,
            filter: 'grayscale(100%) contrast(120%)',
          }}
        />
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1
            className="mb-6 tracking-[0.3em]"
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: 'clamp(2rem, 6vw, 4rem)',
            }}
          >
            ABOUT REVERIE REVIVAL
          </h1>
          <p
            className="text-white/90"
            style={{ fontFamily: "'Allura', cursive", fontSize: 'clamp(1.75rem, 3vw, 3rem)' }}
          >
            Where dreams meet reality
          </p>
        </div>
      </section>

      {/* Mission Statement */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className="mb-8 tracking-[0.3em]"
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
            }}
          >
            OUR MISSION
          </h2>
          <div className="space-y-6 text-white/80 leading-relaxed text-lg">
            <p>
              Reverie Revival was born from a simple yet powerful idea: to create streetwear that bridges the gap between aspiration and reality. We believe that what you wear should empower you to pursue your dreams with confidence and attitude.
            </p>
            <p>
              Every piece in our collection is designed with intention—combining premium materials, minimalist aesthetics, and bold street attitude. We don't just make clothes; we create statements that help you awaken your dream and rewrite your reality.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-4 bg-[#121214]/30">
        <div className="max-w-6xl mx-auto">
          <h2
            className="mb-12 text-center tracking-[0.3em]"
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
            }}
          >
            WHAT WE STAND FOR
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#0B0B0C] border border-white/10 p-8 text-center">
              <h3
                className="mb-4 tracking-[0.2em]"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                PREMIUM QUALITY
              </h3>
              <p className="text-white/70 leading-relaxed">
                We source the finest materials and employ meticulous craftsmanship to ensure every piece meets our exacting standards.
              </p>
            </div>
            <div className="bg-[#0B0B0C] border border-white/10 p-8 text-center">
              <h3
                className="mb-4 tracking-[0.2em]"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                MINIMAL DESIGN
              </h3>
              <p className="text-white/70 leading-relaxed">
                Less is more. Our designs strip away the unnecessary, leaving only what matters: clean lines, perfect fits, and timeless style.
              </p>
            </div>
            <div className="bg-[#0B0B0C] border border-white/10 p-8 text-center">
              <h3
                className="mb-4 tracking-[0.2em]"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                BOLD ATTITUDE
              </h3>
              <p className="text-white/70 leading-relaxed">
                Streetwear is more than fashion—it's a mindset. We create pieces that help you express your confidence and individuality.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2
            className="mb-12 text-center tracking-[0.3em]"
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
            }}
          >
            OUR STORY
          </h2>
          <div className="space-y-6 text-white/80 leading-relaxed">
            <p>
              Founded in 2024 in Pampanga, Philippines, Reverie Revival emerged from the vision of creating streetwear that transcends trends. In a market saturated with fast fashion and fleeting styles, we saw an opportunity to build something lasting—something real.
            </p>
            <p>
              Our founders, inspired by the intersection of dreams and daily life, set out to craft clothing that could serve as armor for the modern dreamer. Each collection tells a story of transformation, from the midnight hours of creation to the bright reality of achievement.
            </p>
            <p>
              Today, Reverie Revival has grown from a small studio operation to a recognized name in Philippine streetwear. But our core mission remains unchanged: to help you awaken your dream and rewrite your reality, one premium piece at a time.
            </p>
          </div>
        </div>
      </section>

      {/* Brand Identity */}
      <section className="py-20 px-4 bg-[#121214]/30">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-12">
            <div
              className="inline-block relative mb-8"
              style={{
                fontSize: 'clamp(3rem, 8vw, 6rem)',
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 900,
                letterSpacing: '0.3em',
              }}
            >
              REVERIE REVIVAL
            </div>
            <p
              className="text-white/90 mb-8"
              style={{ fontFamily: "'Allura', cursive", fontSize: 'clamp(1.75rem, 3vw, 3rem)' }}
            >
              Awaken Your Dream. Rewrite Reality.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            <div className="text-left">
              <h3
                className="mb-3 tracking-[0.2em]"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                ESTABLISHED
              </h3>
              <p className="text-white/70">2024</p>
            </div>
            <div className="text-left">
              <h3
                className="mb-3 tracking-[0.2em]"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                LOCATION
              </h3>
              <p className="text-white/70">Pampanga, Philippines</p>
            </div>
            <div className="text-left">
              <h3
                className="mb-3 tracking-[0.2em]"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                AESTHETIC
              </h3>
              <p className="text-white/70">Dark Premium Streetwear</p>
            </div>
            <div className="text-left">
              <h3
                className="mb-3 tracking-[0.2em]"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                PHILOSOPHY
              </h3>
              <p className="text-white/70">Minimal Luxury, Bold Attitude</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
