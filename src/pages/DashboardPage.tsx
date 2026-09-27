import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { Activity, Calendar, Users, Clock, ShieldAlert } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Appointment, Consultation, OutletContext } from '../lib/types';
import { isProvider } from '../lib/types';
import { formatDate, formatWhen } from '../lib/dates';

export default function DashboardPage() {
  const { profile } = useOutletContext<OutletContext>();

  if (profile.role === 'patient') {
    return <PatientDashboard profile={profile} />;
  }

  if (isProvider(profile.role)) {
    return <DoctorDashboard profile={profile} />;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Welcome, {profile.first_name}</h1>
      <p className="text-slate-600 mt-2">Your dashboard is being set up for the {profile.role} role.</p>
    </div>
  );
}

function PatientDashboard({ profile }: { profile: OutletContext['profile'] }) {
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    supabase
      .from('consultations')
      .select('*')
      .eq('patient_id', profile.id)
      .order('date_time', { ascending: false })
      .limit(3)
      .then(({ data }) => setConsultations((data as Consultation[]) || []));

    supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', profile.id)
      .eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at')
      .limit(3)
      .then(({ data }) => setAppointments((data as Appointment[]) || []));
  }, [profile.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Hello, {profile.first_name}</h1>
        <p className="text-slate-600">Here is an overview of your medical records.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-900">Emergency Access</h3>
          <p className="text-sm text-slate-500 mt-1 mb-4">Generate a temporary QR code for doctors in an emergency.</p>
          <button
            onClick={() => navigate('/dashboard/access')}
            className="mt-auto bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Generate QR Code
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-primary" /> Recent Activity
          </h3>
          {consultations.length === 0 ? (
            <p className="text-sm text-slate-500">No consultations recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {consultations.map((c) => (
                <div key={c.id} className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <div className="text-sm">
                    <p className="font-medium text-slate-900">{c.diagnosis || c.chief_complaint || 'Consultation'}</p>
                    <p className="text-slate-500">{c.symptoms || 'Clinical visit'}</p>
                  </div>
                  <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded whitespace-nowrap">
                    {formatWhen(c.date_time)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <Link to="/dashboard/timeline" className="block mt-4 text-sm font-medium text-primary">View timeline →</Link>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-primary" /> Upcoming Appointments
          </h3>
          {appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center text-sm text-slate-500">
              <Calendar className="w-8 h-8 text-slate-300 mb-2" />
              <p>No upcoming appointments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((a) => (
                <div key={a.id} className="text-sm border-b border-slate-100 pb-2">
                  <p className="font-medium text-slate-900">{a.reason || 'Appointment'}</p>
                  <p className="text-slate-500">{formatDate(a.scheduled_at, 'dd MMM yyyy HH:mm')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DoctorDashboard({ profile }: { profile: OutletContext['profile'] }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    supabase
      .from('appointments')
      .select('*')
      .eq('provider_id', profile.id)
      .gte('scheduled_at', start.toISOString())
      .lte('scheduled_at', end.toISOString())
      .order('scheduled_at')
      .then(({ data }) => setAppointments((data as Appointment[]) || []));
  }, [profile.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dr. {profile.last_name}'s Dashboard</h1>
        <p className="text-slate-600">Overview of your practice and upcoming patients.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-primary" /> Find Patient
          </h3>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/dashboard/patients?q=${encodeURIComponent(query.trim())}`);
            }}
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by SA ID, Patient Number, or Name..."
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-primary focus:border-primary"
            />
            <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-primary-hover">
              Search
            </button>
          </form>
          <div className="mt-6 text-sm flex items-center bg-blue-50 text-blue-700 p-3 rounded-lg border border-blue-100">
            <ShieldAlert className="w-5 h-5 mr-2 flex-shrink-0" />
            <p>You can only open records after the patient grants consent, or after redeeming a clinic QR code.</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-primary" /> Today's Schedule
          </h3>
          {appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center text-sm text-slate-500">
              <p>No appointments scheduled for today.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((a) => (
                <div key={a.id} className="text-sm">
                  <p className="font-medium text-slate-900">{a.reason || 'Appointment'}</p>
                  <p className="text-slate-500">{formatDate(a.scheduled_at, 'HH:mm')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
