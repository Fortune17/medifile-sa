import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DashboardLayout from './components/layout/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import PatientProfilePage from './pages/PatientProfilePage';
import TimelinePage from './pages/TimelinePage';
import PatientAccessPage from './pages/PatientAccessPage';
import MedicationsPage from './pages/MedicationsPage';
import AllergiesPage from './pages/AllergiesPage';
import AppointmentsPage from './pages/AppointmentsPage';
import PatientsSearchPage from './pages/PatientsSearchPage';
import PatientRecordPage from './pages/PatientRecordPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="profile" element={<PatientProfilePage />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="access" element={<PatientAccessPage />} />
          <Route path="medications" element={<MedicationsPage />} />
          <Route path="allergies" element={<AllergiesPage />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="patients" element={<PatientsSearchPage />} />
          <Route path="patients/:patientId" element={<PatientRecordPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
