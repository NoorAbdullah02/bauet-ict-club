import { useState, useMemo } from 'react';
import { Printer, Download, X, Calendar, Users, Award, Shield, CheckCircle, FileText, Building2 } from 'lucide-react';
import useStore from '../context/store';
import { formalDate } from '../lib/format';
import Logo from '../components/Logo';

export default function DeanReportModal({ open, onClose }) {
  const { events, members, registrations, settings } = useStore();
  const [sessionFilter, setSessionFilter] = useState('all');

  // Available sessions
  const sessions = useMemo(() => {
    const list = [...new Set(members.map((m) => m.committee_session).filter(Boolean))];
    return list.length ? list : ['2025-2026'];
  }, [members]);

  // Filtered members & events
  const currentMembers = useMemo(() => {
    if (sessionFilter === 'all') return members.filter((m) => m.active !== false);
    return members.filter((m) => m.committee_session === sessionFilter);
  }, [members, sessionFilter]);

  const reportDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // Key stats
  const totalEvents = events.length;
  const totalRegistrations = registrations.filter((r) => r.status === 'approved').length;
  const approvedCommittee = registrations.filter((r) => r.type === 'committee' && r.status === 'approved').length;
  const approvedGeneral = registrations.filter((r) => r.type === 'general' && r.status === 'approved').length;
  const approvedAmbassadors = registrations.filter((r) => r.type === 'ambassador' && r.status === 'approved').length;

  const handlePrint = () => {
    window.print();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
      {/* Container */}
      <div className="relative my-auto w-full max-w-4xl rounded-3xl border border-line bg-surface p-4 sm:p-8 shadow-2xl text-fg max-h-[95vh] flex flex-col">
        
        {/* Modal Controls (Hidden when printing) */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <FileText size={20} />
            </span>
            <div>
              <h2 className="text-lg font-bold text-fg">Official Club Activity Report</h2>
              <p className="text-xs text-muted">Ready for Vice Chancellor, Dean, and Head of Department submission</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sessionFilter}
              onChange={(e) => setSessionFilter(e.target.value)}
              className="rounded-xl border border-line bg-bg px-3 py-1.5 text-xs font-medium text-fg focus:outline-none focus:border-accent"
            >
              <option value="all">All Sessions (Cumulative)</option>
              {sessions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <button
              onClick={handlePrint}
              className="btn-primary !px-4 !py-2 text-xs inline-flex items-center gap-1.5 shadow-md"
            >
              <Printer size={15} /> Print / Save as PDF
            </button>

            <button
              onClick={onClose}
              className="rounded-xl border border-line p-2 text-muted hover:bg-alt hover:text-fg transition"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div id="dean-report-document" className="overflow-y-auto p-4 sm:p-8 bg-white text-[#0A1A3F] rounded-2xl border border-slate-200 print:border-none print:p-0 print:m-0 print:overflow-visible font-sans leading-relaxed">
          
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-[#0B2A78] pb-5">
            <div className="flex items-center gap-4">
              <div className="size-16 shrink-0">
                <Logo kind="club" height={56} className="!h-auto w-full" />
              </div>
              <div>
                <h1 className="text-2xl font-black uppercase tracking-tight text-[#0B2A78]">
                  BAUET ICT CLUB
                </h1>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Bangladesh Army University of Engineering & Technology (BAUET)
                </p>
                <p className="text-[11px] text-slate-500">
                  Directorate of Student Affairs (DSA) • Qadirabad Cantonment, Natore-6431
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block rounded-md bg-[#0B2A78]/10 px-2.5 py-1 text-[11px] font-mono font-bold uppercase text-[#0B2A78]">
                Official Record
              </span>
              <p className="mt-1 text-xs text-slate-500">Date: <b>{reportDate}</b></p>
              <p className="text-xs text-slate-500">Session: <b>{sessionFilter === 'all' ? 'All Active Panels' : sessionFilter}</b></p>
            </div>
          </div>

          {/* Title */}
          <div className="my-6 text-center">
            <h2 className="text-xl font-bold uppercase tracking-wider text-[#0A1A3F] border-b border-slate-200 inline-block pb-1">
              ANNUAL / SEMESTER CLUB PERFORMANCE & ACTIVITY REPORT
            </h2>
            <p className="mt-1 text-xs text-slate-500 italic">
              Submitted for review to: Office of the Vice-Chancellor & Dean, Faculty of ECE, BAUET
            </p>
          </div>

          {/* Executive Overview KPI Grid */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
              <span className="block text-2xl font-black text-[#0B2A78]">{totalEvents}</span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Events Organized</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
              <span className="block text-2xl font-black text-[#0B2A78]">{currentMembers.length}</span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Active Panel Members</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
              <span className="block text-2xl font-black text-[#0B2A78]">{totalRegistrations}</span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Student Memberships</span>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
              <span className="block text-2xl font-black text-emerald-600">100%</span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">Digital Verification</span>
            </div>
          </div>

          {/* Executive Panel Summary */}
          <div className="mb-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B2A78] mb-2 flex items-center gap-1.5">
              <Shield size={14} /> Executive Leadership Panel ({sessionFilter === 'all' ? 'Current' : sessionFilter})
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 font-semibold text-slate-700">
                  <tr>
                    <th className="p-2.5">Designation / Post</th>
                    <th className="p-2.5">Name</th>
                    <th className="p-2.5">Department</th>
                    <th className="p-2.5">Batch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {currentMembers.slice(0, 8).map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-[#0B2A78]">{m.position || 'Executive Member'}</td>
                      <td className="p-2.5">{m.name}</td>
                      <td className="p-2.5">{m.department || 'BAUET'}</td>
                      <td className="p-2.5">{m.batch || '—'}</td>
                    </tr>
                  ))}
                  {currentMembers.length > 8 && (
                    <tr>
                      <td colSpan={4} className="p-2 text-center text-slate-500 italic bg-slate-50">
                        + {currentMembers.length - 8} more executive members and department ambassadors listed in official registry.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Events Log Table */}
          <div className="mb-8">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0B2A78] mb-2 flex items-center gap-1.5">
              <Calendar size={14} /> Workshops, Seminars & Hackathons Conducted
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 font-semibold text-slate-700">
                  <tr>
                    <th className="p-2.5">Event Name</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Venue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {events.length > 0 ? (
                    events.slice(0, 10).map((ev) => (
                      <tr key={ev.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-semibold text-slate-900">{ev.title}</td>
                        <td className="p-2.5 font-mono">{ev.date ? formalDate(ev.date) : 'TBA'}</td>
                        <td className="p-2.5 capitalize">{ev.category || 'Workshop'}</td>
                        <td className="p-2.5">{ev.location || 'BAUET Campus'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400">No events recorded in this period.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Formal Signatures Section */}
          <div className="mt-12 pt-8 border-t border-slate-300 grid grid-cols-3 gap-6 text-center text-xs">
            <div>
              <div className="h-12 flex items-end justify-center font-display text-sm italic text-slate-800">
                Sheikh Noor Abdullah
              </div>
              <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">
                President
              </div>
              <p className="text-[10px] text-slate-500">BAUET ICT Club</p>
            </div>

            <div>
              <div className="h-12 flex items-end justify-center font-display text-sm italic text-slate-800">
                Partha Pratim Debnath
              </div>
              <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">
                Faculty Advisor
              </div>
              <p className="text-[10px] text-slate-500">Dept. of CSE, BAUET</p>
            </div>

            <div>
              <div className="h-12 flex items-end justify-center font-display text-xs italic text-slate-400">
                (Official Seal & Date)
              </div>
              <div className="border-t border-slate-400 pt-1.5 font-bold text-slate-800">
                Dean / Vice-Chancellor
              </div>
              <p className="text-[10px] text-slate-500">Approval & Acknowledgment</p>
            </div>
          </div>

          <div className="mt-8 text-center text-[10px] text-slate-400 font-mono">
            Generated via BAUET ICT Club Integrated Portal • Verified Digital Document
          </div>

        </div>
      </div>
    </div>
  );
}
