// Funciones para ubicar en pantalla los elementos que señala cada paso de un tutorial.
// Se buscan por texto visible (botones, títulos, etiquetas) para no tener que marcar cada componente.
// Si un elemento no existe (por ejemplo, un botón que el usuario no tiene por permisos), el paso se omite.

export type Target = () => Element | null;

const normalize = (s: string | null | undefined) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

export function isVisible(el: Element | null): el is HTMLElement {
  if (!el || !(el instanceof HTMLElement)) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return false;
  const style = getComputedStyle(el);
  return style.visibility !== "hidden" && style.display !== "none";
}

function firstVisible(selector: string, match: (el: Element) => boolean, root: ParentNode = document) {
  for (const el of Array.from(root.querySelectorAll(selector))) {
    if (match(el) && isVisible(el)) return el;
  }
  return null;
}

// Selector CSS (el primero visible)
export const css = (selector: string): Target => () => firstVisible(selector, () => true);

// Botón o enlace cuyo texto es exactamente `text` (sin importar mayúsculas ni acentos)
export const button = (text: string): Target => () =>
  firstVisible("main button, main a, main .btn, main [role='tab']", (el) => normalize(el.textContent) === normalize(text));

// Título de la página (h1-h3). Con `startsWith` acepta títulos como "Bienvenido Juan"
export const heading = (text: string, startsWith = false): Target => () =>
  firstVisible("main h1, main h2, main h3", (el) => {
    const t = normalize(el.textContent);
    return startsWith ? t.startsWith(normalize(text)) : t === normalize(text);
  });

// Texto suelto (etiqueta, encabezado de tarjeta, columna). Con `closest` se resalta el contenedor
export const label = (text: string, closest?: string, startsWith = false): Target => () => {
  const el = firstVisible("main *", (e) => {
    if (e.children.length > 1) return false;
    const t = normalize(e.textContent);
    return startsWith ? t.startsWith(normalize(text)) : t === normalize(text);
  });
  if (!el) return null;
  return (closest && el.closest(closest)) || el;
};

// Fila de filtros de una lista (las tarjetas "Filtrar por…" / "Buscar…")
export const filters: Target = () => {
  const el = firstVisible("main span, main label, main div", (e) =>
    e.children.length === 0 && /^(filtrar por|buscar )/.test(normalize(e.textContent)),
  );
  return el?.closest(".row") ?? el?.closest(".card") ?? el ?? null;
};

// Tabla principal de la página
export const table: Target = () => firstVisible("main table", () => true);

// Botón dentro de la primera fila de la tabla que lo tenga (por ejemplo "Ver")
export const rowButton = (text: string): Target => () =>
  firstVisible("main table tbody a, main table tbody button", (el) => normalize(el.textContent) === normalize(text));

// ¿Hay en pantalla un título con ese texto?
export const hasHeading = (text: string, startsWith = false) => () => heading(text, startsWith)() !== null;
