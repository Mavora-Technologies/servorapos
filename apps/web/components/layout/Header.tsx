"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [solutionsDropdownOpen, setSolutionsDropdownOpen] = useState(false);
  const [mobileSolutionsOpen, setMobileSolutionsOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/90 backdrop-blur-md shadow-sm">
        
        {/* Top Utility & Contact Bar - Edge to Edge */}
        <div className="bg-servora-navy px-4 sm:px-8 py-1.5 text-[11px] font-medium text-white flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-servora-teal animate-pulse" />
            <span className="tracking-wide">Kilimani HQ &bull; Nairobi, Kenya</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="tel:+254795707823" className="hover:text-servora-teal transition-colors font-mono">
              +254 795 707 823
            </a>
            <span className="hidden sm:inline text-servora-bright">&bull;</span>
            <Link href="/contact" className="hidden sm:inline hover:text-servora-teal transition-colors">
              Contact Sales Desk
            </Link>
          </div>
        </div>

        {/* Main Header Nav Bar - Edge to Edge with fluid padding */}
        <div className="w-full flex h-18 items-center justify-between px-4 sm:px-8 lg:px-12 py-3">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <Image
              src="/logo.png"
              alt="Servora Logo"
              width={115}
              height={34}
              priority
              className="object-contain w-auto h-8 transition-transform group-hover:scale-[1.02]"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-servora-navy">
            <Link href="/features" className="hover:text-servora-core transition-colors py-2 relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-0.5 after:bg-servora-core hover:after:w-full after:transition-all">
              Features
            </Link>
            
            {/* Solutions Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setSolutionsDropdownOpen(true)}
              onMouseLeave={() => setSolutionsDropdownOpen(false)}
            >
              <button 
                onClick={() => setSolutionsDropdownOpen(!solutionsDropdownOpen)}
                className="flex items-center gap-1.5 hover:text-servora-core transition-colors focus:outline-none py-2"
              >
                <span>Solutions</span>
                <svg 
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${solutionsDropdownOpen ? 'rotate-180 text-servora-core' : 'text-gray-400'}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {solutionsDropdownOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-80 rounded-2xl bg-white p-3 shadow-2xl ring-1 ring-gray-950/5 grid gap-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                  <Link href="/solutions/restaurants" className="group rounded-xl p-3 hover:bg-servora-pale transition-colors">
                    <p className="text-xs font-bold text-servora-navy group-hover:text-servora-core">Restaurants & Cafés</p>
                    <p className="text-[11px] text-servora-deepTeal mt-0.5">High-speed table service, split billing & modifier management.</p>
                  </Link>
                  <Link href="/solutions/cloud-kitchens" className="group rounded-xl p-3 hover:bg-servora-pale transition-colors">
                    <p className="text-xs font-bold text-servora-navy group-hover:text-servora-core">Cloud Kitchens</p>
                    <p className="text-[11px] text-servora-deepTeal mt-0.5">Multi-channel order aggregation & dedicated kitchen display.</p>
                  </Link>
                  <Link href="/solutions/bars-lounges" className="group rounded-xl p-3 hover:bg-servora-pale transition-colors">
                    <p className="text-xs font-bold text-servora-navy group-hover:text-servora-core">Bars & Lounges</p>
                    <p className="text-[11px] text-servora-deepTeal mt-0.5">Cashier shift reconciliation, open tabs & stock tracking.</p>
                  </Link>
                </div>
              )}
            </div>

            <Link href="/hardware-pos" className="hover:text-servora-core transition-colors py-2">Hardware & POS</Link>
            <Link href="/pricing" className="hover:text-servora-core transition-colors py-2">Pricing</Link>
            <Link href="/about" className="hover:text-servora-core transition-colors py-2">About Us</Link>
            <Link href="/contact" className="hover:text-servora-core transition-colors py-2">Contact</Link>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link 
              href="/login" 
              className="text-xs font-bold text-servora-navy hover:text-servora-core transition-colors px-3 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="flex h-10 items-center justify-center rounded-xl bg-servora-core px-6 text-xs font-bold text-white shadow-md shadow-servora-core/25 transition-all hover:bg-blue-700 hover:shadow-lg"
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-3">
            <Link
              href="/login"
              className="flex h-8 items-center justify-center rounded-lg bg-servora-core px-3 text-xs font-bold text-white shadow-sm"
            >
              Get Started
            </Link>
            
            <button
              onClick={() => setMobileMenuOpen(true)}
              type="button"
              className="inline-flex items-center justify-center rounded-xl p-2.5 text-servora-navy bg-servora-pale hover:bg-servora-core/10 focus:outline-none transition-colors"
              aria-controls="mobile-menu"
              aria-expanded={mobileMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>

        </div>
      </header>

      {/* Revamped Corporate Mobile Slide-Over Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[99999] md:hidden">
          {/* Backdrop Overlay with blur */}
          <div 
            className="fixed inset-0 bg-servora-navy/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Panel - Spanning ~70% with curved left edges */}
          <div className="fixed inset-y-0 right-0 w-[72%] sm:w-[48%] bg-white h-full shadow-2xl flex flex-col z-[100000] p-4 overflow-y-auto rounded-l-3xl animate-in slide-in-from-right duration-300">
            
            {/* Corporate Header Section */}
            <div className="flex flex-col gap-2 pb-3 border-b border-gray-100 bg-white">
              <div className="flex items-center justify-between">
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2">
                  <Image
                    src="/logo.png"
                    alt="Servora Logo"
                    width={38}
                    height={26}
                    className="object-contain w-auto h-6"
                  />
                  <span className="text-sm font-extrabold text-servora-navy tracking-tight">Servora</span>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-full p-2 text-servora-navy bg-gray-100 hover:bg-gray-200 focus:outline-none transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="px-1">
                <p className="text-[10px] font-bold text-servora-deepTeal tracking-wide">
                  Simplify Service <span className="text-servora-teal">&bull;</span> <span className="text-servora-core">Grow Smarter</span>
                </p>
              </div>
            </div>

            {/* Drawer Navigation Pill Cards */}
            <nav className="flex flex-col space-y-2 pt-3.5 text-xs font-bold text-servora-navy bg-white">
              
              {/* Features */}
              <Link 
                href="/features" 
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-gray-100/80 bg-servora-pale/30 hover:bg-servora-core hover:text-white transition-all group shadow-2xs"
              >
                <div className="w-6 h-6 rounded-xl bg-white text-servora-core flex items-center justify-center shadow-2xs group-hover:bg-white/20 group-hover:text-white transition-colors flex-shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
                </div>
                <span className="flex-grow truncate">Platform Features</span>
                <span className="text-gray-300 group-hover:text-white text-xs">&rsaquo;</span>
              </Link>

              {/* Solutions Accordion */}
              <div className="rounded-2xl border border-gray-100/80 bg-servora-pale/30 p-1 shadow-2xs">
                <button 
                  onClick={() => setMobileSolutionsOpen(!mobileSolutionsOpen)}
                  className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-white hover:shadow-2xs text-servora-navy transition-all"
                >
                  <div className="w-6 h-6 rounded-xl bg-white text-servora-core flex items-center justify-center shadow-2xs flex-shrink-0">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                  </div>
                  <span className="flex-grow text-left truncate">Solutions</span>
                  <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 flex-shrink-0 ${mobileSolutionsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {mobileSolutionsOpen && (
                  <div className="pl-2 pr-1 py-1 space-y-1 flex flex-col text-[11px] font-semibold text-servora-deepTeal">
                    <Link href="/solutions/restaurants" onClick={() => setMobileMenuOpen(false)} className="py-1.5 px-2.5 rounded-lg bg-white hover:text-servora-core shadow-2xs truncate">
                      Restaurants & Cafés
                    </Link>
                    <Link href="/solutions/cloud-kitchens" onClick={() => setMobileMenuOpen(false)} className="py-1.5 px-2.5 rounded-lg bg-white hover:text-servora-core shadow-2xs truncate">
                      Cloud Kitchens
                    </Link>
                    <Link href="/solutions/bars-lounges" onClick={() => setMobileMenuOpen(false)} className="py-1.5 px-2.5 rounded-lg bg-white hover:text-servora-core shadow-2xs truncate">
                      Bars & Lounges
                    </Link>
                  </div>
                )}
              </div>

              {/* Hardware */}
              <Link 
                href="/hardware-pos" 
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-gray-100/80 bg-servora-pale/30 hover:bg-servora-core hover:text-white transition-all group shadow-2xs"
              >
                <div className="w-6 h-6 rounded-xl bg-white text-servora-core flex items-center justify-center shadow-2xs group-hover:bg-white/20 group-hover:text-white transition-colors flex-shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                </div>
                <span className="flex-grow truncate">Hardware & POS</span>
                <span className="text-gray-300 group-hover:text-white text-xs">&rsaquo;</span>
              </Link>

              {/* Pricing */}
              <Link 
                href="/pricing" 
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-gray-100/80 bg-servora-pale/30 hover:bg-servora-core hover:text-white transition-all group shadow-2xs"
              >
                <div className="w-6 h-6 rounded-xl bg-white text-servora-core flex items-center justify-center shadow-2xs group-hover:bg-white/20 group-hover:text-white transition-colors flex-shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <span className="flex-grow truncate">Pricing Plans</span>
                <span className="text-gray-300 group-hover:text-white text-xs">&rsaquo;</span>
              </Link>

              {/* About */}
              <Link 
                href="/about" 
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-gray-100/80 bg-servora-pale/30 hover:bg-servora-core hover:text-white transition-all group shadow-2xs"
              >
                <div className="w-6 h-6 rounded-xl bg-white text-servora-core flex items-center justify-center shadow-2xs group-hover:bg-white/20 group-hover:text-white transition-colors flex-shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <span className="flex-grow truncate">About Mavora</span>
                <span className="text-gray-300 group-hover:text-white text-xs">&rsaquo;</span>
              </Link>

              {/* Contact */}
              <Link 
                href="/contact" 
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-2xl border border-gray-100/80 bg-servora-pale/30 hover:bg-servora-core hover:text-white transition-all group shadow-2xs"
              >
                <div className="w-6 h-6 rounded-xl bg-white text-servora-core flex items-center justify-center shadow-2xs group-hover:bg-white/20 group-hover:text-white transition-colors flex-shrink-0">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                </div>
                <span className="flex-grow truncate">Contact Sales</span>
                <span className="text-gray-300 group-hover:text-white text-xs">&rsaquo;</span>
              </Link>

            </nav>

            {/* Drawer Footer Actions */}
            <div className="border-t border-gray-100 pt-3 mt-auto flex flex-col gap-2 bg-white">
              <Link 
                href="/login" 
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-1.5 w-full py-3 rounded-2xl bg-gradient-to-r from-servora-core to-blue-700 text-white font-bold text-xs shadow-md transition-all hover:opacity-95 truncate px-2"
              >
                <span>Get Started Free</span>
                <span>&rarr;</span>
              </Link>
              <Link 
                href="/login" 
                onClick={() => setMobileMenuOpen(false)}
                className="block text-center w-full py-2.5 rounded-2xl border border-gray-200 font-bold text-xs text-servora-navy hover:border-servora-core transition-colors truncate px-2"
              >
                Sign In
              </Link>
            </div>

          </div>
        </div>
      )}
    </>
  );
}