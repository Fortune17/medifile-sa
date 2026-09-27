import { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { Activity, LogOut, User, Home, FileText, Pill, AlertTriangle, Calendar, Shield, Users, Menu, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../lib/types';
import { isProvider } from '../../lib/types';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate('/login');
        return;
      }

      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (userProfile) {
        setProfile(userProfile as Profile);
      }
      setLoading(false);
    };

    fetchSessionAndProfile();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate('/login');
    });

    return () => subscription.subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
        <div>
          <p className="text-slate-700 font-medium">Your account is missing a profile record.</p>
          <button onClick={handleSignOut} className="mt-4 text-primary font-medium">Sign out</button>
        </div>
      </div>
    );
  }

  const patientLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'My Profile', href: '/dashboard/profile', icon: User },
    { name: 'Timeline', href: '/dashboard/timeline', icon: FileText },
    { name: 'Medications', href: '/dashboard/medications', icon: Pill },
    { name: 'Allergies', href: '/dashboard/allergies', icon: AlertTriangle },
    { name: 'Appointments', href: '/dashboard/appointments', icon: Calendar },
    { name: 'Access Control', href: '/dashboard/access', icon: Shield },
  ];

  const doctorLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Patients', href: '/dashboard/patients', icon: Users },
    { name: 'Appointments', href: '/dashboard/appointments', icon: Calendar },
    { name: 'My Profile', href: '/dashboard/profile', icon: User },
  ];

  const links = profile.role === 'patient' ? patientLinks : isProvider(profile.role) ? doctorLinks : patientLinks;

  const nav = (
    <>
      {links.map((link) => {
        const Icon = link.icon;
        const isActive = link.href === '/dashboard'
          ? location.pathname === '/dashboard'
          : location.pathname.startsWith(link.href);
        return (
          <Link
            key={link.name}
            to={link.href}
            className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              isActive
                ? 'bg-teal-50 text-primary'
                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-primary' : 'text-slate-400'}`} />
            {link.name}
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <Activity className="h-8 w-8 text-primary mr-2" />
          <span className="text-xl font-bold text-dark">MediFile SA</span>
        </div>

        <div className="p-4 border-b border-slate-200">
          <div className="text-sm font-medium text-slate-900">{profile.first_name} {profile.last_name}</div>
          <div className="text-xs text-slate-500 capitalize">{profile.role}</div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">{nav}</nav>

        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center px-3 py-2.5 text-sm font-medium rounded-lg text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5 text-slate-400" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center px-4 justify-between">
          <div className="flex items-center">
            <Activity className="h-6 w-6 text-primary mr-2" />
            <span className="font-bold text-dark">MediFile SA</span>
          </div>
          <button onClick={() => setMobileOpen((v) => !v)} className="p-2 text-slate-600">
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 p-4 space-y-1">
            {nav}
            <button
              onClick={handleSignOut}
              className="flex w-full items-center px-3 py-2.5 text-sm font-medium rounded-lg text-slate-700"
            >
              <LogOut className="mr-3 h-5 w-5 text-slate-400" />
              Sign out
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet context={{ profile }} />
        </div>
      </main>
    </div>
  );
}
