/* SVG and tooltip helpers shared by both dashboards' charts. */
const SVGNS = 'http://www.w3.org/2000/svg';

export const $ = s => document.querySelector(s);
export const $$ = s => Array.from(document.querySelectorAll(s));

export function el(t, a = {}, p) {
  const n = document.createElementNS(SVGNS, t);
  for (const k in a) n.setAttribute(k, a[k]);
  if (p) p.appendChild(n);
  return n;
}
export function svgBox(host, h) {
  host.innerHTML = '';
  const w = host.clientWidth || 600;
  const s = el('svg', { viewBox: `0 0 ${w} ${h}`, height: h }, host);
  return { s, w, h };
}
export const empty = s => { el('text', { x: 0, y: 24, class: 'g-lbl' }, s).textContent = 'No data in scope'; };

const tt = () => document.getElementById('tt');
export function bindTip(node, html) {
  node.addEventListener('mousemove', e => {
    const t = tt(); t.innerHTML = html; t.style.display = 'block';
    t.style.left = Math.min(e.clientX + 14, window.innerWidth - 340) + 'px'; t.style.top = (e.clientY + 16) + 'px';
  });
  node.addEventListener('mouseleave', hideTip);
}
export const hideTip = () => { tt().style.display = 'none'; };
