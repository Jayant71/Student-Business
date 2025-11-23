import React from 'react';
import { Rocket, Instagram, Twitter, Linkedin, Youtube } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 pt-16 pb-8">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          
          <div className="col-span-1 md:col-span-1">
            <a href="#" className="flex items-center gap-2 font-display font-bold text-xl text-dark mb-4">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
                <Rocket size={18} />
              </div>
              <span>Future<span className="text-primary">Founders</span></span>
            </a>
            <p className="text-gray-500 text-sm leading-relaxed">
              Empowering the next generation of innovators with No-Code tools and Artificial Intelligence.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-dark mb-4">Program</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#" className="hover:text-primary transition-colors">Curriculum</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Mentor</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Student Projects</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-dark mb-4">Support</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Terms of Service</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-dark mb-4">Follow Us</h4>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-primary hover:text-white transition-all">
                <Instagram size={20} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-primary hover:text-white transition-all">
                <Twitter size={20} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-primary hover:text-white transition-all">
                <Youtube size={20} />
              </a>
            </div>
          </div>

        </div>

        <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>© 2024 Future Founders Academy. All rights reserved.</p>
          <p>Designed with ❤️ for young entrepreneurs.</p>
        </div>
      </div>
    </footer>
  );
};