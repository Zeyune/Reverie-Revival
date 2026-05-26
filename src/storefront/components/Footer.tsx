import React from 'react';
import { Mail, Phone, MapPin, Instagram, Facebook, Twitter } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-[#0B0B0C] border-t border-white/10 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div>
            <h3
              className="mb-4 tracking-[0.3em]"
              style={{ fontFamily: "'Poppins', sans-serif", fontSize: '1.25rem' }}
            >
              REVERIE REVIVAL
            </h3>
            <p
              className="mb-4 text-white/60"
              style={{ fontFamily: "'Allura', cursive", fontSize: '1.25rem' }}
            >
              Awaken Your Dream
            </p>
            <p className="text-white/70 leading-relaxed">
              Premium streetwear that bridges the gap between aspiration and reality.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4
              className="mb-4 tracking-[0.2em]"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              QUICK LINKS
            </h4>
            <ul className="space-y-3 text-white/70">
              <li>
                <button
                  onClick={() => onNavigate('shop')}
                  className="hover:text-white transition-colors"
                >
                  Shop All
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('new-drop')}
                  className="hover:text-white transition-colors"
                >
                  New Arrivals
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('about')}
                  className="hover:text-white transition-colors"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('contact')}
                  className="hover:text-white transition-colors"
                >
                  Contact
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4
              className="mb-4 tracking-[0.2em]"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              CUSTOMER SERVICE
            </h4>
            <ul className="space-y-3 text-white/70">
              <li>
                <button className="hover:text-white transition-colors">Shipping Info</button>
              </li>
              <li>
                <button className="hover:text-white transition-colors">Returns & Exchanges</button>
              </li>
              <li>
                <button className="hover:text-white transition-colors">Size Guide</button>
              </li>
              <li>
                <button className="hover:text-white transition-colors">Privacy Policy</button>
              </li>
              <li>
                <button className="hover:text-white transition-colors">Terms of Service</button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4
              className="mb-4 tracking-[0.2em]"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              CONTACT US
            </h4>
            <ul className="space-y-3 text-white/70">
              <li className="flex items-start gap-2">
                <Phone className="w-4 h-4 mt-1 flex-shrink-0" />
                <div>
                  <p>09106960483</p>
                  <p>09216625949</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="w-4 h-4 mt-1 flex-shrink-0" />
                <p>reverierevival.co@gmail.com</p>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-1 flex-shrink-0" />
                <div>
                  <p>Zone 4 Camba, Arayat, Pampanga</p>
                  <p>243, San Pablo, Mexico, Pampanga</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Social & Copyright */}
        <div className="pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="text-white/60 tracking-[0.1em]" style={{ fontFamily: "'Poppins', sans-serif" }}>
              © 2024 REVERIE REVIVAL. ALL RIGHTS RESERVED.
            </p>
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-white/5 transition-colors rounded-sm" aria-label="Instagram">
                <Instagram className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-white/5 transition-colors rounded-sm" aria-label="Facebook">
                <Facebook className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-white/5 transition-colors rounded-sm" aria-label="Twitter">
                <Twitter className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
