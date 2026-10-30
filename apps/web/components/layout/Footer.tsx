import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  const currentYear = 2026;

  return (
    <footer className="bg-servora-navy text-servora-pale pt-16 pb-8 border-t border-servora-deepTeal/25 w-full">
      {/* Edge-to-edge wrapper with responsive side padding */}
      <div className="w-full px-4 sm:px-8 lg:px-16">
        
        {/* Responsive Grid: 2 columns on mobile, 5 columns on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10 mb-12 w-full max-w-7xl mx-auto">
          
          {/* Brand Column (Spans full width on mobile, 2 columns on desktop) */}
          <div className="col-span-2 flex flex-col gap-4">
            <Link href="/" className="inline-block">
              <Image 
                src="/logo.png" 
                alt="Servora Logo" 
                width={110} 
                height={32} 
                className="object-contain brightness-0 invert opacity-90 h-7 w-auto" 
              />
            </Link>
            <p className="text-xs leading-relaxed text-servora-pale/70 max-w-sm">
              Simplify Service. Grow Smarter. A dependable multi-tenant restaurant operations platform built by Mavora Technologies.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-servora-teal font-medium mt-1">
              <span className="h-1.5 w-1.5 rounded-full bg-servora-teal animate-pulse flex-shrink-0" />
              <span>Concert House, Wood Avenue, Kilimani - Nairobi, Kenya </span>
            </div>
          </div>

          {/* Solutions Column */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold tracking-wider text-white uppercase mb-1">Solutions</h3>
            <ul className="flex flex-col gap-2.5 text-xs text-servora-pale/70">
              <li>
                <Link href="/solutions/restaurants" className="hover:text-servora-teal transition-colors flex items-center gap-1.5">
                  <span className="text-servora-teal/60">&rsaquo;</span> Restaurants & Cafés
                </Link>
              </li>
              <li>
                <Link href="/solutions/cloud-kitchens" className="hover:text-servora-teal transition-colors flex items-center gap-1.5">
                  <span className="text-servora-teal/60">&rsaquo;</span> Cloud Kitchens
                </Link>
              </li>
              <li>
                <Link href="/solutions/bars-lounges" className="hover:text-servora-teal transition-colors flex items-center gap-1.5">
                  <span className="text-servora-teal/60">&rsaquo;</span> Bars & Lounges
                </Link>
              </li>
              <li>
                <Link href="/features" className="hover:text-servora-teal transition-colors flex items-center gap-1.5">
                  <span className="text-servora-teal/60">&rsaquo;</span> Platform Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-servora-teal transition-colors flex items-center gap-1.5">
                  <span className="text-servora-teal/60">&rsaquo;</span> Pricing Plans
                </Link>
              </li>
            </ul>
          </div>

          {/* Hardware & Support Column */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold tracking-wider text-white uppercase mb-1">Hardware & Support</h3>
            <ul className="flex flex-col gap-2.5 text-xs text-servora-pale/70">
              <li>
                <Link href="/hardware-pos" className="hover:text-servora-teal transition-colors flex items-center gap-1.5">
                  <span className="text-servora-teal/60">&rsaquo;</span> POS Hardware & Terminals
                </Link>
              </li>
              <li>
                <Link href="/hardware-pos" className="hover:text-servora-teal transition-colors flex items-center gap-1.5">
                  <span className="text-servora-teal/60">&rsaquo;</span> Procurement Outsourcing
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-servora-teal transition-colors flex items-center gap-1.5">
                  <span className="text-servora-teal/60">&rsaquo;</span> Help Center & Support
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-servora-teal transition-colors flex items-center gap-1.5">
                  <span className="text-servora-teal/60">&rsaquo;</span> System Status
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div className="flex flex-col gap-3 col-span-2 sm:col-span-1">
            <h3 className="text-xs font-bold tracking-wider text-white uppercase mb-1">Company</h3>
            <ul className="flex flex-col gap-2.5 text-xs text-servora-pale/70">
              <li>
                <Link href="/about" className="hover:text-servora-teal transition-colors flex items-center gap-1.5">
                  <span className="text-servora-teal/60">&rsaquo;</span> About Mavora
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-servora-teal transition-colors flex items-center gap-1.5">
                  <span className="text-servora-teal/60">&rsaquo;</span> Contact Sales
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-servora-teal transition-colors flex items-center gap-1.5">
                  <span className="text-servora-teal/60">&rsaquo;</span> Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-servora-teal transition-colors flex items-center gap-1.5">
                  <span className="text-servora-teal/60">&rsaquo;</span> Terms of Service
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar spanning full edge-to-edge */}
        <div className="w-full border-t border-white/10 pt-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-servora-pale/50 gap-4 text-center sm:text-left">
            <p>&copy; {currentYear} Mavora Technologies Ltd. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span className="text-servora-pale/70 font-medium">Servora POS v1.0</span>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}