import { useState } from 'react';
import { CalendarCheck, FolderKanban, Headphones, Wrench } from 'lucide-react';
import type { WorkforceEmployee } from '../../services/workforceService';
import ServicesProjectTimePanel from './ServicesProjectTimePanel';
import ServicesFieldServicePanel from './ServicesFieldServicePanel';
import ServicesHelpdeskPanel from './ServicesHelpdeskPanel';
import ServicesAppointmentsPanel from './ServicesAppointmentsPanel';

interface Props { employees: WorkforceEmployee[]; }
type Tab = 'project-time' | 'field' | 'helpdesk' | 'appointments';

export default function ServicesWorkspacePanel({ employees }: Props) {
  const [tab, setTab] = useState<Tab>('project-time');
  const tabs: Array<{ id: Tab; label: string; icon: typeof FolderKanban }> = [
    { id: 'project-time', label: 'Projects & Time', icon: FolderKanban },
    { id: 'field', label: 'Field Service', icon: Wrench },
    { id: 'helpdesk', label: 'Helpdesk', icon: Headphones },
    { id: 'appointments', label: 'Appointments', icon: CalendarCheck },
  ];
  return <div className="space-y-6">
    <nav className="grid grid-cols-2 gap-2 rounded-2xl border border-violet-900/50 bg-slate-900 p-2 md:grid-cols-4">
      {tabs.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => setTab(item.id)} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${tab === item.id ? 'bg-violet-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><Icon size={16} /> {item.label}</button>; })}
    </nav>
    {tab === 'project-time' && <ServicesProjectTimePanel employees={employees} />}
    {tab === 'field' && <ServicesFieldServicePanel />}
    {tab === 'helpdesk' && <ServicesHelpdeskPanel />}
    {tab === 'appointments' && <ServicesAppointmentsPanel />}
  </div>;
}
