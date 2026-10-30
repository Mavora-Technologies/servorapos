'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('servora_token');
    if (!token) {
      router.push('/login');
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  if (!isAuthorized) return null;

  const handleLogout = () => {
    localStorage.removeItem('servora_token');
    router.push('/login');
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // Helper to format the pathname into a clean header title
  const getHeaderTitle = () => {
    if (!pathname) return 'Dashboard';
    if (pathname === '/pos') return 'POS Checkout';
    if (pathname === '/kitchen') return 'Kitchen Display System';
    
    // Convert e.g., '/inventory' to 'Inventory'
    const pathSegment = pathname.split('/')[1];
    if (pathSegment) {
      return pathSegment.charAt(0).toUpperCase() + pathSegment.slice(1);
    }
    return 'Executive Dashboard';
  };

  return (
    <div className="h-screen w-full flex bg-servora-pale text-servora-navy font-sans text-sm overflow-hidden">
      
      {/* Extracted Dynamic Sidebar Component */}
      <Sidebar 
        isMobileMenuOpen={isMobileMenuOpen} 
        closeMobileMenu={closeMobileMenu} 
        handleLogout={handleLogout} 
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        
        {/* Top Header */}
        <header className="h-16 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 text-servora-navy hover:bg-gray-50 rounded-md"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-base lg:text-lg font-semibold text-servora-navy tracking-tight truncate">
              {getHeaderTitle()}
            </h2>
          </div>
          
          <div className="flex items-center gap-3 lg:gap-4 shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-servora-deepTeal text-xs font-medium">Mavora Test Branch</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-servora-pale text-servora-core flex items-center justify-center font-bold border border-blue-100 shrink-0">
              JD
            </div>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-servora-pale">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}