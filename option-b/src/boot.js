/* Shared by both entry points: where the data lives, and what to show when it cannot be read. */

/* <meta name="data-base" content="data/"> in the page; relative to the page */
export const dataBase = () =>
  new URL(document.querySelector('meta[name="data-base"]')?.content || 'data/', document.baseURI);

export function showBootError(err) {
  console.error(err);
  const box = document.getElementById('boot');
  if (!box) return;
  box.classList.add('err');
  box.innerHTML = `<b>The dashboard could not load its data.</b><br>${String(err && err.message || err).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))}`;
}
