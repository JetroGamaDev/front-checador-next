"use client";

// Tutoriales guiados: la primera vez que un usuario entra a una pantalla se abre su recorrido.
// El botón "?" (abajo a la derecha) lo vuelve a abrir. No aplica a las cuentas de checador.
import { useCallback, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { driver, type Driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { Button } from "react-bootstrap";
import { findTour, WELCOME_TOUR, type Tour, type TourContext } from "@/lib/tours/tours";
import { isVisible } from "@/lib/tours/targets";

const STORAGE_PREFIX = "gama-tours:";
const CHECK_EVERY_MS = 300;
// La pantalla debe estar quieta (sin modales ni cargas) este tiempo antes de abrir un tutorial,
// para no arrancar mientras la página termina de pintarse. Los avisos de inicio ya se esperan aparte (autoStart)
const CALM_MS = 600;

// ---------- Tutoriales vistos (por usuario, en este navegador) ----------
type SeenMap = Record<string, number>;

function readSeen(userId: string): SeenMap {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_PREFIX + userId) || "{}") as SeenMap;
  } catch {
    return {};
  }
}

function markSeen(userId: string, tour: Tour) {
  try {
    const seen = readSeen(userId);
    seen[tour.id] = tour.version;
    localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(seen));
  } catch {
    // Sin almacenamiento (modo privado o bloqueado): el tutorial podrá volver a salir
  }
}

const wasSeen = (userId: string, tour: Tour) => (readSeen(userId)[tour.id] ?? 0) >= tour.version;

// No se abre un tutorial encima de un modal, del menú lateral o de un overlay de carga/éxito/error
function screenIsBusy() {
  const blockers = document.querySelectorAll('.modal.show, .offcanvas.show, [aria-busy="true"], [aria-modal="true"]');
  return Array.from(blockers).some((el) => isVisible(el));
}

// Convierte el tutorial en pasos de driver.js, omitiendo los elementos que no están en pantalla
function buildSteps(tour: Tour): DriveStep[] {
  const steps: DriveStep[] = [];
  for (const step of tour.steps) {
    const popover = { title: step.title, description: step.text, side: step.side, align: "start" as const };
    if (!step.target) {
      steps.push({ popover });
      continue;
    }
    const el = step.target();
    if (el && isVisible(el)) steps.push({ element: el, popover });
  }
  return steps;
}

// Un tutorial está listo cuando ya cargaron la mayoría de los elementos que señala
function isReady(tour: Tour) {
  const withTarget = tour.steps.filter((s) => s.target);
  if (withTarget.length === 0) return true;
  const found = withTarget.filter((s) => isVisible(s.target!())).length;
  return found >= Math.min(2, withTarget.length);
}

// autoStart: los avisos de inicio (Términos, crear contraseña) ya se resolvieron y se pueden abrir los tutoriales solos
export default function TourManager({ autoStart }: { autoStart: boolean }) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const driverRef = useRef<Driver | null>(null);
  const interruptedRef = useRef(false);
  const calmSinceRef = useRef(0);

  const user = session?.user;
  const userId = user?.id ? String(user.id) : null;
  const enabled = !!userId && user?.role !== "CHECADOR";

  const context = useCallback(
    (): TourContext => ({ pathname, params: new URLSearchParams(searchParams?.toString() ?? "") }),
    [pathname, searchParams],
  );

  const start = useCallback(
    (tour: Tour) => {
      if (!userId) return;
      const steps = buildSteps(tour);
      if (steps.length === 0) return;

      driverRef.current?.destroy();
      const instance = driver({
        steps,
        showProgress: steps.length > 1,
        progressText: "{{current}} de {{total}}",
        nextBtnText: "Siguiente",
        prevBtnText: "Anterior",
        doneBtnText: "Terminar",
        popoverClass: "gama-tour",
        overlayOpacity: 0.55,
        stagePadding: 6,
        stageRadius: 8,
        smoothScroll: true,
        allowClose: true,
        // Un clic fuera del globo no cierra el recorrido por accidente (se cierra con la X o con Esc)
        overlayClickBehavior: "none",
        // Al terminar o cerrar el recorrido, no se vuelve a mostrar solo.
        // Si lo interrumpió un aviso del sistema, no cuenta como visto y vuelve a salir después.
        onDestroyed: () => {
          if (!interruptedRef.current) markSeen(userId, tour);
          interruptedRef.current = false;
          driverRef.current = null;
        },
      });
      driverRef.current = instance;
      instance.drive();
    },
    [userId],
  );

  // Revisa cada poco si la pantalla actual tiene un tutorial que el usuario no ha visto.
  // Se revisa en intervalos porque varias pantallas cambian sin cambiar la URL (por ejemplo "Crear permiso").
  useEffect(() => {
    if (!enabled || !autoStart || !userId) return;
    calmSinceRef.current = 0;
    const timer = window.setInterval(() => {
      const busy = screenIsBusy();
      if (driverRef.current?.isActive()) {
        // Se abrió un aviso encima del tutorial: se cierra sin marcarlo como visto
        if (busy) {
          interruptedRef.current = true;
          driverRef.current.destroy();
        }
        return;
      }
      if (document.hidden || busy) {
        calmSinceRef.current = 0;
        return;
      }
      if (!calmSinceRef.current) calmSinceRef.current = Date.now();
      if (Date.now() - calmSinceRef.current < CALM_MS) return;

      const tour = findTour(context(), !wasSeen(userId, WELCOME_TOUR));
      if (!tour || wasSeen(userId, tour) || !isReady(tour)) return;
      start(tour);
    }, CHECK_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [enabled, autoStart, userId, context, start]);

  // Al cambiar de pantalla o cerrar sesión se cierra el tutorial abierto
  useEffect(() => () => driverRef.current?.destroy(), [pathname]);

  if (!enabled) return null;

  const openCurrent = () => {
    const tour = findTour(context(), false) ?? WELCOME_TOUR;
    start(tour);
  };

  return (
    <Button
      id="tour-help-button"
      variant="primary"
      className="position-fixed rounded-circle shadow d-flex align-items-center justify-content-center p-0"
      style={{ right: 20, bottom: 20, width: 44, height: 44, zIndex: 1030 }}
      onClick={openCurrent}
      aria-label="Ver tutorial de esta pantalla"
      title="Ver tutorial de esta pantalla"
    >
      <i className="bi bi-question-lg fs-5" />
    </Button>
  );
}
