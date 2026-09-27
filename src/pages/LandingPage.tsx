import { Shield, Activity, Users, Lock, Smartphone, FileText, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Activity className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-dark">MediFile SA</span>
            </div>
            <nav className="hidden md:flex gap-8">
              <a href="#features" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Features</a>
              <a href="#security" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Security</a>
              <a href="#about" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">About</a>
            </nav>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Sign in</Link>
              <Link to="/register" className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Create account
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-32 lg:pb-40">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight mb-8">
                Your medical records. <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text medical-gradient">With you wherever you go.</span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-600 mb-10">
                Securely access and manage your medical information from one place. Built for South African patients and healthcare providers.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/register?role=patient" className="inline-flex justify-center items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-3 rounded-xl font-medium text-lg transition-colors">
                  I am a Patient
                  <ChevronRight className="w-5 h-5" />
                </Link>
                <Link to="/register?role=doctor" className="inline-flex justify-center items-center gap-2 bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 px-6 py-3 rounded-xl font-medium text-lg transition-colors">
                  I am a Doctor
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-slate-900">Everything you need in one secure place</h2>
              <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">A modern platform replacing fragmented paper records with seamless digital experiences.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center mb-6 text-primary">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Complete History</h3>
                <p className="text-slate-600">Access your full medical timeline, including consultations, lab results, medications, and allergies.</p>
              </div>
              
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-6 text-secondary">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">Always Accessible</h3>
                <p className="text-slate-600">Designed for any device. Generate secure temporary QR codes for doctors during emergencies.</p>
              </div>
              
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center mb-6 text-slate-700">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">You're in Control</h3>
                <p className="text-slate-600">You decide who sees your records. Grant or revoke access to healthcare providers at any time.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Security Section */}
        <section id="security" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-dark rounded-3xl overflow-hidden shadow-xl">
              <div className="grid md:grid-cols-2">
                <div className="p-12 lg:p-16 flex flex-col justify-center">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-sm font-medium w-fit mb-6">
                    <Shield className="w-4 h-4" />
                    <span>Privacy First</span>
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-6">Bank-level security for your health data</h2>
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3 text-slate-300">
                      <Lock className="w-6 h-6 text-primary flex-shrink-0" />
                      <span>Data is encrypted at rest and in transit. Strict role-based access controls ensure only authorized personnel see your info.</span>
                    </li>
                    <li className="flex items-start gap-3 text-slate-300">
                      <Shield className="w-6 h-6 text-primary flex-shrink-0" />
                      <span>POPIA aligned design principles to protect South African patient privacy.</span>
                    </li>
                    <li className="flex items-start gap-3 text-slate-300">
                      <Activity className="w-6 h-6 text-primary flex-shrink-0" />
                      <span>Comprehensive audit logging. See exactly who viewed your record and when.</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-slate-800 flex items-center justify-center p-12">
                   {/* Abstract security graphic */}
                   <div className="relative w-full max-w-sm aspect-square rounded-full border-4 border-slate-700 flex items-center justify-center">
                      <div className="absolute w-3/4 h-3/4 rounded-full border-4 border-slate-600/50 flex items-center justify-center">
                        <div className="absolute w-1/2 h-1/2 rounded-full border-4 border-primary/50 flex items-center justify-center bg-primary/10">
                          <Lock className="w-16 h-16 text-primary" />
                        </div>
                      </div>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-dark">MediFile SA</span>
          </div>
          <p className="text-slate-500 text-sm">© {new Date().getFullYear()} MediFile SA. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-slate-500 hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="text-sm text-slate-500 hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="text-sm text-slate-500 hover:text-primary transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
