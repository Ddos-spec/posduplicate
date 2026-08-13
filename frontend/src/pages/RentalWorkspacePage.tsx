import { useState } from 'react';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import RentalBookingsPanel from './rental/RentalBookingsPanel';
import RentalCreateBookingPanel from './rental/RentalCreateBookingPanel';
import RentalItemSettingsPanel from './rental/RentalItemSettingsPanel';

export default function RentalWorkspacePage() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((value) => value + 1);

  return <main className="min-h-screen bg-slate-50 p-5 text-slate-900">
    <div className="mx-auto max-w-7xl">
      <button onClick={() => navigate('/module-selector')} className="mb-4 inline-flex items-center gap-2 text-sm font-bold"><ArrowLeft size={16} /> Suite</button>
      <div className="flex items-start gap-3"><div className="rounded-xl bg-amber-100 p-3 text-amber-700"><KeyRound size={22} /></div><div><p className="text-xs font-bold uppercase tracking-widest text-amber-600">P3 SALES OPERATIONS</p><h1 className="text-3xl font-black">Rental</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Time-range availability over existing tracked inventory. Future reservations do not decrement physical stock; pickup and return remain lifecycle events over the same owned inventory.</p></div></div>

      <section className="mt-6 grid gap-5 lg:grid-cols-2">
        <RentalItemSettingsPanel onChanged={refresh} />
        <RentalCreateBookingPanel refreshKey={refreshKey} onCreated={refresh} />
      </section>
      <div className="mt-6" key={`bookings-${refreshKey}`}><RentalBookingsPanel /></div>
    </div>
  </main>;
}
