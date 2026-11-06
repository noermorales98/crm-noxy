// CHECK (plan, «Tasks»): comprobación en navegador de una pantalla del rediseño.
// Uso: pegar en la consola (o javascript_tool) con la pantalla cargada. Devuelve un objeto; pasa si
// ok === true. Solo lee el DOM: no hace clics ni escribe datos.
// Ámbito: window.__checkScope = "shell" mide solo el marco (todo lo que queda fuera de [data-crm-sheet]),
// para pantallas cuyo contenido está fuera de alcance; por defecto mide la página entera.
(() => {
  const shellOnly = window.__checkScope === "shell";
  const inScope = (el) => !shellOnly || !el.closest("[data-crm-sheet]");
  const vw = innerWidth;
  const docW = document.documentElement.scrollWidth;
  const visible = (el) => {
    if (!(el instanceof Element)) return false;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    // Fuera de pantalla (p. ej. el panel móvil cerrado) no cuenta.
    return r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth && cs.visibility !== "hidden" && cs.display !== "none";
  };
  const textEls = [...document.querySelectorAll("body *")].filter(
    (el) => inScope(el) && visible(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()),
  );
  const small = textEls
    .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 12)
    .map((el) => `${el.tagName.toLowerCase()}: ${el.textContent.trim().slice(0, 30)}`);
  const glass = [...document.querySelectorAll("body *")].some((el) => {
    const cs = getComputedStyle(el);
    return (cs.backdropFilter && cs.backdropFilter !== "none") || (cs.webkitBackdropFilter && cs.webkitBackdropFilter !== "none");
  });
  const mobile = vw < 1024;
  const taps = [...document.querySelectorAll("a[href], button, [role=button], input:not([type=hidden]), select")]
    .filter((el) => inScope(el) && visible(el))
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { el, h: Math.round(r.height), w: Math.round(r.width) };
    });
  const underTap = mobile
    ? taps
        .filter(({ h, w, el }) => Math.min(h, w) < 44 && !el.closest("[data-check-ignore-tap]"))
        .map(({ el, h, w }) => `${el.tagName.toLowerCase()}(${w}x${h}): ${(el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 24)}`)
    : [];
  const minTap = taps.length ? Math.min(...taps.map(({ h, w }) => Math.min(h, w))) : null;
  const result = { path: location.pathname, scope: shellOnly ? "shell" : "page", vw, docW, small, glass, minTap, underTap };
  result.ok = docW <= vw && small.length === 0 && !glass && (!mobile || underTap.length === 0);
  return result;
})();
