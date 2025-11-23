import React from 'react';
import { Quote, Award } from 'lucide-react';
import { Testimonial } from '../types';

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Sarah Jenkins",
    role: "Age 15",
    age: 15,
    content: "I built my first website for my mom's bakery in just 3 weeks! The AI tools made it so easy to write the text and find images.",
    image: "https://picsum.photos/id/1/100/100"
  },
  {
    id: 2,
    name: "David Chen",
    role: "Age 17",
    age: 17,
    content: "I always wanted to start a sneaker reselling business. This course taught me how to set up the store and market it automatically.",
    image: "https://picsum.photos/id/15/100/100"
  },
  {
    id: 3,
    name: "Emily Watson",
    role: "Age 13",
    age: 13,
    content: "The mentor is super cool and explains everything simply. I loved the no-code app builder part the most.",
    image: "https://picsum.photos/id/40/100/100"
  }
];

export const Testimonials: React.FC = () => {
  return (
    <section id="testimonials" className="py-20 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">
        
        <div className="text-center mb-16">
          <h2 className="font-display font-bold text-3xl md:text-4xl text-dark mb-4">
            Student <span className="text-secondary">Success Stories</span>
          </h2>
          <p className="text-gray-600">See what our young entrepreneurs are building.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-24">
          {testimonials.map((t) => (
            <div key={t.id} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 relative hover:-translate-y-1 transition-transform duration-300">
              <Quote className="absolute top-6 right-6 text-gray-100 fill-current" size={40} />
              <div className="flex items-center gap-4 mb-6">
                <img src={t.image} alt={t.name} className="w-12 h-12 rounded-full object-cover border-2 border-primary/20" />
                <div>
                  <h4 className="font-bold text-dark">{t.name}</h4>
                  <span className="text-xs font-semibold text-primary bg-blue-50 px-2 py-0.5 rounded-full">{t.role}</span>
                </div>
              </div>
              <p className="text-gray-600 italic leading-relaxed">"{t.content}"</p>
            </div>
          ))}
        </div>

        {/* Certificate Section */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 overflow-hidden flex flex-col md:flex-row items-center">
            <div className="p-8 md:p-12 flex-1">
                <div className="inline-block px-3 py-1 bg-warning/20 text-yellow-700 text-xs font-bold rounded-full mb-4">OFFICIAL CERTIFICATION</div>
                <h3 className="font-display font-bold text-3xl mb-4">Earn Your Badge of Honor</h3>
                <p className="text-gray-600 mb-6">
                    Upon completing the 4-week program, you'll receive a verified certificate. It's a great addition to your future college applications or LinkedIn profile.
                </p>
                <ul className="space-y-2 text-sm text-gray-700 font-medium">
                    <li className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Signed by Industry Experts</li>
                    <li className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Verifiable Digital ID</li>
                    <li className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span> Shareable on Social Media</li>
                </ul>
            </div>
            <div className="flex-1 bg-gray-100 p-8 w-full flex justify-center items-center">
                {/* CSS Mockup of a Certificate */}
                <div className="bg-white w-full max-w-sm aspect-[4/3] shadow-xl p-6 relative border-8 border-double border-gray-200">
                    <div className="absolute inset-0 border border-gray-300 m-2"></div>
                    <div className="text-center h-full flex flex-col justify-center items-center">
                        <div className="text-primary font-display font-bold text-lg uppercase tracking-widest mb-2">Certificate of Completion</div>
                        <div className="w-16 h-px bg-gray-300 my-2"></div>
                        <div className="text-xs text-gray-500 uppercase">Awarded To</div>
                        <div className="font-handwriting text-2xl font-bold my-2 text-dark font-serif italic">Your Name Here</div>
                        <div className="text-xs text-gray-500">For Mastery in No-Code Entrepreneurship</div>
                        <div className="mt-6 w-12 h-12 rounded-full bg-yellow-400 opacity-50 flex items-center justify-center">
                            <Award className="text-yellow-700 opacity-100" size={24}/>
                        </div>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </section>
  );
};