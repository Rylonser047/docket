export function formatZAR(amount) {
  const n = Number(amount) || 0;
  return `R ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return '—';
  return d.toLocaleString('en-ZA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function formatHours(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function statusColor(status) {
  const map = {
    draft: 'badge-gray',
    active: 'badge-teal',
    completed: 'badge-blue',
    invoiced: 'badge-purple',
    paid: 'badge-green',
    sent: 'badge-blue',
    overdue: 'badge-red',
    accepted: 'badge-green',
    declined: 'badge-red',
  };
  return map[status] || 'badge-gray';
}

export function healthColor(score) {
  if (score >= 80) return 'badge-green';
  if (score >= 50) return 'badge-amber';
  return 'badge-red';
}

export function relativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}
