import React from 'react';
import { Smartphone, Zap, Briefcase, Award, Globe, PenTool } from 'lucide-react';
import { Feature } from '../types';

const features: Feature[] = [
  {
    title: "No-Code App Building",
    description: "Build real mobile apps and websites using drag-and-drop tools. No complex code required.",
    icon: Smartphone,
  },
  {
    title: "AI Automation",
    description: "Learn to use ChatGPT, Gemini, and Midjourney to create content, logos, and marketing plans.",
    icon: Zap,
  },
  {
    title: "Startup 101",
    description: "Understand the basics of business models, pricing, and how to pitch your idea to the world.",
    icon: Briefcase,
  },
  {
    title: "Personal Branding",
    description: "Create a digital portfolio and learn how to present yourself as a young innovator.",
    icon: Globe,
  }
];

export const Features: React.FC = () => {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display font-bold text-3xl md:text-4xl text-dark mb-4">
            Not Just a Course. <span className="text-primary">A Launchpad.</span>
          </h2>
          <p className="text-gray-600">
            We move beyond textbooks. You will learn by building real projects that you can show off to friends, family, and future colleges.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {features.map((feature, idx) => (
            <div 
              key={idx} 
              className="bg-gray-50 p-6 rounded-2xl hover:bg-white hover:shadow-xl transition-all duration-300 border border-transparent hover:border-gray-100 group"
            >
              <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                <feature.icon size={28} />
              </div>
              <h3 className="font-display font-bold text-xl mb-3 text-dark">{feature.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Mentor Card */}
        <div id="mentor" className="bg-gradient-to-br from-dark to-gray-800 rounded-3xl p-8 md:p-12 text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary rounded-full blur-[100px] opacity-20"></div>
            
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 relative z-10">
                <div className="w-32 h-32 md:w-48 md:h-48 shrink-0 bg-gray-200 rounded-full border-4 border-primary/50 overflow-hidden">
                    <img src="https://picsum.photos/id/64/400/400" alt="Mentor" className="w-full h-full object-cover" />
                </div>
                <div className="text-center md:text-left">
                    <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                        <span className="px-3 py-1 rounded-full bg-accent text-dark text-xs font-bold uppercase tracking-wider">Your Mentor</span>
                    </div>
                    <h3 className="font-display font-bold text-2xl md:text-3xl mb-2">Alex Rivera</h3>
                    <p className="text-gray-300 mb-6">Serial Entrepreneur & EdTech Innovator</p>
                    <p className="text-gray-300 max-w-xl text-sm md:text-base leading-relaxed">
                        "I've helped over 500 students launch their first digital products. My goal is to demystify technology and empower the next generation of founders using the tools of tomorrow."
                    </p>
                    <div className="mt-6 flex gap-4 justify-center md:justify-start">
                        <div className="flex flex-col">
                            <span className="font-bold text-xl text-accent">5+ Years</span>
                            <span className="text-xs text-gray-400">Teaching</span>
                        </div>
                        <div className="w-px bg-gray-600 h-10"></div>
                        <div className="flex flex-col">
                            <span className="font-bold text-xl text-accent">50+</span>
                            <span className="text-xs text-gray-400">Startups Launched</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </section>
  );
};