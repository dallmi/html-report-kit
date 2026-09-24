/* Replaces the global mutable `S`: state changes go through set(), and every
   subscriber hears about it together with the reason, so the page can decide how
   much to redraw (a keystroke in a search box must not rebuild the box itself). */
export function createStore(initial) {
  let state = initial;
  const subs = new Set();
  return {
    get: () => state,
    set(patch, reason = 'view') {
      state = { ...state, ...patch };
      for (const fn of subs) fn(state, reason);
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
}

/* one filter value inside a namespace (ml, ar, vd, pg, cl); `extra` lands at the top level */
export function setFilter(store, ns, k, v, reason, extra = {}) {
  store.set({ [ns]: { ...store.get()[ns], [k]: v }, ...extra }, reason);
}
