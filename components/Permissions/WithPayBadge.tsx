// Badge de goce de sueldo de un permiso (lo define DOH al aprobar).
// null o sin el dato (permisos viejos, pendientes o rechazados): no se muestra nada,
// salvo con showUndefined (detalle del permiso).
export default function WithPayBadge({
  withPay,
  showUndefined = false,
}: {
  withPay?: boolean | null;
  showUndefined?: boolean;
}) {
  if (withPay === true) {
    return (
      <span className="badge rounded-pill px-3 py-2 fw-semibold bg-success-subtle text-success-emphasis border border-success-subtle">
        Con goce de sueldo
      </span>
    );
  }

  if (withPay === false) {
    return (
      <span className="badge rounded-pill px-3 py-2 fw-semibold bg-orange-subtle text-orange-emphasis border border-orange-subtle">
        Sin goce de sueldo
      </span>
    );
  }

  if (!showUndefined) return null;

  return (
    <span className="badge rounded-pill px-3 py-2 fw-semibold bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle">
      Goce de sueldo: sin definir
    </span>
  );
}
