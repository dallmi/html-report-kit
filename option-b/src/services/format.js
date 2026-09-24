/* Number, text and date formatting shared by view-models and components. */

export const MN = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* 999,500+ rounds to 1.00m, never "1000k" */
export const fmt = n => {
  n = +n || 0; const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(1) + 'bn';
  if (a >= 999500) return (n / 1e6).toFixed(2) + 'm';
  if (a >= 1e4) return Math.round(n / 1e3) + 'k';
  return Math.round(n).toLocaleString('en-GB');
};
export const full = n => Math.round(+n || 0).toLocaleString('en-GB');
export const pct = (n, d = 1) => n == null || isNaN(n) ? 'n/a' : ((+n || 0) * 100).toFixed(d) + '%';
export const pctAx = v => { const x = v * 100; return (Math.abs(x - Math.round(x)) < 1e-6 ? x.toFixed(0) : x.toFixed(1)) + '%'; };

/* v2 keeps its original rounding, so index2 matches the branded original figure for figure */
export const fmt2 = n => {
  n = +n || 0; const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(1) + 'bn';
  if (a >= 1e6) return (n / 1e6).toFixed(2) + 'm';
  if (a >= 1e4) return Math.round(n / 1e3) + 'k';
  return Math.round(n).toLocaleString('en-GB');
};
export const pct2 = (n, d = 1) => n == null ? 'n/a' : ((+n || 0) * 100).toFixed(d) + '%';

export const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const trunc = (s, n) => { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
export const isDim = l => /^\(|^unknown$/i.test(String(l));

/* ISO date -> "05 Mar 2026" */
export const dayLabel = iso => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d} ${MN[+m]} ${y}`;
};

/* page titles instead of .aspx filenames; domains instead of full tracking URLs */
export const pageTitle = u => {
  const s = decodeURIComponent(String(u).split('?')[0].replace(/\/$/, '').split('/').pop() || u)
    .replace(/\.aspx$/i, '').replace(/[-_]+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
};
export const shortUrl = u => {
  const m = String(u).match(/^https?:\/\/([^/?#]+)(\/[^?#]*)?/);
  if (!m) return u;
  const p = (m[2] || '').split('/').filter(Boolean);
  return m[1] + (p.length ? (p.length > 1 ? '/…/' : '/') + p[p.length - 1] : '');
};
/* last URL segment, as v2 shows it */
export const lastSegment = u => {
  const s = String(u).replace(/^https?:\/\//, '').replace(/\/$/, ''), p = s.split('/');
  return decodeURIComponent(p[p.length - 1] || p[p.length - 2] || s);
};
