import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api.js';
import { formatHours } from '../lib/utils.js';
import Modal from '../components/Modal.jsx';

export default function TimeTracker() {
  const [entries, setEntries] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerStart, setTimerStart] = useState(null);
  const [timerDisplay, setTimerDisplay] = useState('00:00:00');
  const [stopModal, setStopModal] = useState(false);
  const [stopForm, setStopForm] = useState({ job_id: '', description: '', billable: true });
  const [logForm, setLogForm] = useState({ job_id: '', client_id: '', description: '', duration_minutes: '', date: new Date().toISOString().split('T')[0], billable: true });
  const intervalRef = useRef(null);

  const load = () => Promise.all([api.get('/time'), api.get('/jobs'), api.get('/clients')])
    .then(([t, j, c]) => { setEntries(t); setJobs(j); setClients(c); });

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - timerStart;
        const h = Math.floor(elapsed / 3600000);
        const m = Math.floor((elapsed % 3600000) / 60000);
        const s = Math.floor((elapsed % 60000) / 1000);
        setTimerDisplay(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [timerRunning, timerStart]);

  const startTimer = () => { setTimerStart(Date.now()); setTimerRunning(true); };

  const stopTimer = () => { setTimerRunning(false); setStopModal(true); };

  const saveTimer = async () => {
    const duration = Math.round((Date.now() - timerStart) / 60000);
    const job = jobs.find(j => String(j.id) === String(stopForm.job_id));
    await api.post('/time', {
      job_id: stopForm.job_id || undefined,
      client_id: job?.client_id || undefined,
      description: stopForm.description,
      start_time: new Date(timerStart).toISOString(),
      end_time: new Date().toISOString(),
      duration_minutes: duration,
      billable: stopForm.billable,
    });
    setStopModal(false);
    setTimerDisplay('00:00:00');
    setTimerStart(null);
    load();
  };

  const logManual = async (e) => {
    e.preventDefault();
    const job = jobs.find(j => String(j.id) === String(logForm.job_id));
    await api.post('/time', {
      ...logForm,
      client_id: job?.client_id || logForm.client_id || undefined,
      job_id: logForm.job_id || undefined,
      start_time: logForm.date ? `${logForm.date}T09:00:00` : undefined,
    });
    setLogForm({ job_id: '', client_id: '', description: '', duration_minutes: '', date: new Date().toISOString().split('T')[0], billable: true });
    load();
  };

  const delEntry = async (id) => { await api.delete(`/time/${id}`); load(); };

  // Weekly stats
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  const weekEntries = entries.filter(e => new Date(e.start_time) >= weekStart);
  const weekMins = weekEntries.reduce((s, e) => s + (e.duration_minutes || 0), 0);
  const billableMins = weekEntries.filter(e => e.billable).reduce((s, e) => s + (e.duration_minutes || 0), 0);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Time Tracker</h1>

      {/* Active timer */}
      <div className="card p-6 mb-6 flex items-center gap-6">
        <div>
          <p className="text-4xl font-mono font-bold text-gray-900">{timerDisplay}</p>
          <p className="text-sm text-gray-400 mt-1">{timerRunning ? 'Timer running…' : 'Ready to start'}</p>
        </div>
        <div className="flex gap-3">
          {!timerRunning ? (
            <button onClick={startTimer} className="btn-primary px-6 py-3 text-base">▶ Start Timer</button>
          ) : (
            <button onClick={stopTimer} className="btn-danger px-6 py-3 text-base">⏹ Stop & Log</button>
          )}
        </div>
        <div className="ml-auto flex gap-6 text-center">
          <div>
            <p className="text-xl font-bold text-gray-900">{formatHours(weekMins)}</p>
            <p className="text-xs text-gray-400">This week</p>
          </div>
          <div>
            <p className="text-xl font-bold text-teal-600">{formatHours(billableMins)}</p>
            <p className="text-xs text-gray-400">Billable</p>
          </div>
          <div>
            <p className="text-xl font-bold text-gray-400">{formatHours(weekMins - billableMins)}</p>
            <p className="text-xs text-gray-400">Non-billable</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Manual log form */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Log Manual Entry</h2>
          <form onSubmit={logManual} className="space-y-3">
            <div>
              <label className="label">Job</label>
              <select className="input" value={logForm.job_id} onChange={e => setLogForm(f => ({ ...f, job_id: e.target.value }))}>
                <option value="">No specific job</option>
                {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Description</label>
              <input className="input" value={logForm.description} onChange={e => setLogForm(f => ({ ...f, description: e.target.value }))} placeholder="What did you work on?" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label">Duration (mins)</label>
                <input className="input" type="number" value={logForm.duration_minutes} onChange={e => setLogForm(f => ({ ...f, duration_minutes: e.target.value }))} placeholder="90" required />
              </div>
              <div>
                <label className="label">Date</label>
                <input className="input" type="date" value={logForm.date} onChange={e => setLogForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={logForm.billable} onChange={e => setLogForm(f => ({ ...f, billable: e.target.checked }))} />
              Billable
            </label>
            <button type="submit" className="btn-primary w-full justify-center">Log Time</button>
          </form>
        </div>

        {/* Entries list */}
        <div className="col-span-2 card">
          <div className="px-5 py-3 border-b border-gray-50">
            <h2 className="font-semibold text-gray-900">Recent Entries</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {entries.length === 0 && <p className="px-5 py-4 text-sm text-gray-400">No time logged yet.</p>}
            {entries.map(e => (
              <div key={e.id} className="px-5 py-3 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${e.billable ? 'bg-teal-400' : 'bg-gray-300'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{e.description || 'No description'}</p>
                  <p className="text-xs text-gray-400">{e.job_title || 'No job'} {e.client_name ? `• ${e.client_name}` : ''}</p>
                </div>
                <span className="text-sm font-medium text-gray-700">{formatHours(e.duration_minutes)}</span>
                <button onClick={() => delEntry(e.id)} className="text-gray-200 hover:text-red-400 transition-colors text-lg">×</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stop modal */}
      {stopModal && (
        <Modal title="Save Time Entry" onClose={() => { setStopModal(false); setTimerRunning(false); }}>
          <div className="space-y-3">
            <div>
              <label className="label">Assign to Job</label>
              <select className="input" value={stopForm.job_id} onChange={e => setStopForm(f => ({ ...f, job_id: e.target.value }))}>
                <option value="">No specific job</option>
                {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Description</label>
              <input className="input" value={stopForm.description} onChange={e => setStopForm(f => ({ ...f, description: e.target.value }))} placeholder="What did you work on?" autoFocus />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={stopForm.billable} onChange={e => setStopForm(f => ({ ...f, billable: e.target.checked }))} />
              Billable time
            </label>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setStopModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={saveTimer} className="btn-primary flex-1">Save Entry</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
