import React, { useState, useEffect } from 'react';
import { Menu, X, Rocket } from 'lucide-react';
import { Button } from './ui/Button';
import { NavItem } from '../types';

const navItems: NavItem[] = [
  { label: 'Courses', href: '#features' },
  { label: 'Benefits', href: '#benefits' },
  { label: 'Mentor', href: '#mentor' },
  { label: 'Testimonials', href: '#testimonials' },
];

interface HeaderProps {
  onNavigate: (view: 'home' | 'signin' | 'signup') => void;
  onRequestRolePortal: (role: 'admin' | 'student') => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigate, onRequestRolePortal }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/80 backdrop-blur-md shadow-md py-2' : 'bg-transparent py-4'
        }`}
    >
      <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
        {/* Logo */}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); onNavigate('home'); window.scrollTo(0, 0); }}
          className="flex items-center gap-2 font-display font-bold text-2xl text-dark"
        >
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
            <Rocket size={24} />
          </div>
          <span>Future<span className="text-primary">Founders</span></span>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => scrollToSection(e, item.href)}
              className="text-sm font-medium text-gray-600 hover:text-primary transition-colors"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => onNavigate('signin')}>Sign In</Button>
          <Button variant="primary" size="sm" onClick={() => onNavigate('signup')}>
            Sign Up
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="md:hidden p-2 text-dark"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-100 p-4 flex flex-col gap-4 shadow-lg animate-fade-in-down">
          {navItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={(e) => scrollToSection(e, item.href)}
              className="text-base font-medium text-dark py-2 border-b border-gray-50"
            >
              {item.label}
            </a>
          ))}
          <div className="flex flex-col gap-3 mt-2">
            <Button variant="outline" fullWidth onClick={() => {
              setMobileMenuOpen(false);
              onNavigate('signin');
            }}>Sign In</Button>
            <Button variant="primary" fullWidth onClick={() => {
              setMobileMenuOpen(false);
              onNavigate('signup');
            }}>
              Sign Up
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};