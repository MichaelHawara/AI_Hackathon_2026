import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Briefcase, FileText, User, LogOut } from 'lucide-react';
import { auth, signOut } from '../firebase';
import { BRAND_LOGO_TRANSPARENT } from '../branding';

export default function Navbar() {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/search', icon: Search, label: 'Search' },
    { path: '/my-jobs', icon: Briefcase, label: 'My Jobs' },
    { path: '/documents', icon: FileText, label: 'Documents' },
    { path: '/account', icon: User, label: 'Account' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white border-b border-stone-200 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center shrink-0">
          <img
            src={BRAND_LOGO_TRANSPARENT}
            alt="CareerPath AI"
            className="h-8 sm:h-9 w-auto max-w-[200px] object-contain object-left"
            width={200}
            height={40}
          />
        </Link>
        
        <div className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-2 text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? 'text-emerald-600'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </Link>
          ))}
          <button
            onClick={() => signOut(auth)}
            className="flex items-center space-x-2 text-sm font-medium text-stone-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex justify-around items-center h-16 px-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center space-y-1 transition-colors ${
                location.pathname === item.path
                  ? 'text-emerald-600'
                  : 'text-stone-400'
              }`}
            >
              <item.icon size={20} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
