import React from 'react';
import { Button } from './ui/Button';
import { Sparkles, Code, BrainCircuit, Rocket } from 'lucide-react';
import { motion } from 'framer-motion';

export const Hero: React.FC = () => {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-background">
      {/* Background Shapes */}
      <div className="absolute top-0 right-0 -translate-y-1/4 translate-x-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute bottom-0 left-0 translate-y-1/4 -translate-x-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          
          {/* Content */}
          <motion.div 
            className="flex-1 text-center lg:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 text-dark text-sm font-semibold mb-6 border border-accent/40">
              <Sparkles size={16} className="text-lime-600" />
              <span>For Future CEOs (Ages 12-18)</span>
            </div>
            
            <h1 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl leading-tight mb-6 text-dark">
              Launch Your Business with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">AI & No-Code</span>
            </h1>
            
            <p className="text-lg text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Stop waiting for the future. Build it now. A personalized mentorship program where you learn to create apps, websites, and brands without writing a single line of code.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Button 
                variant="primary" 
                size="lg" 
                className="w-full sm:w-auto"
                onClick={() => document.querySelector('#enquiry')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Start Learning
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="w-full sm:w-auto"
                onClick={() => document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Explore Course
              </Button>
            </div>

            <div className="mt-8 flex items-center justify-center lg:justify-start gap-6 text-sm font-medium text-gray-500">
               <span className="flex items-center gap-1"><Rocket size={16} className="text-primary"/> Beginner Friendly</span>
               <span className="flex items-center gap-1"><Code size={16} className="text-secondary"/> No Coding Needed</span>
            </div>
          </motion.div>

          {/* Visuals */}
          <motion.div 
            className="flex-1 w-full max-w-lg lg:max-w-none relative"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 p-2">
              <img 
                src="https://picsum.photos/800/600?random=1" 
                alt="Student building a startup" 
                className="rounded-xl w-full object-cover h-64 md:h-96"
              />
              
              {/* Floating Cards */}
              <motion.div 
                className="absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl border border-gray-100 flex items-center gap-3"
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              >
                <div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                  <BrainCircuit className="text-dark" size={20} />
                </div>
                <div>
                  <p className="font-bold text-dark text-sm">AI Powered</p>
                  <p className="text-xs text-gray-500">Tools Included</p>
                </div>
              </motion.div>

              <motion.div 
                className="absolute top-10 -right-6 bg-white p-4 rounded-xl shadow-xl border border-gray-100 hidden md:flex items-center gap-3"
                animate={{ y: [0, 10, 0] }}
                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
              >
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white">
                  <Rocket size={20} />
                </div>
                <div>
                  <p className="font-bold text-dark text-sm">Launch Fast</p>
                  <p className="text-xs text-gray-500">In 4 Weeks</p>
                </div>
              </motion.div>

            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};