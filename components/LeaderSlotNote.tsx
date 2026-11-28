"use client";

import { ISubManagerRef, subManagerName } from "@/lib/leaderSignature";
import ConditionalRender from "./ConditionalRender";

/**
 * Debajo del nombre en la casilla "Líder":
 * - Si la resolvió el subgerente (aprobó o firmó): etiqueta "Subgerente".
 * - Si sigue pendiente y hay subgerente: "o subgerente: Nombre".
 */
export default function LeaderSlotNote({
  pending,
  bySubManager,
  subManager,
}: {
  pending: boolean;
  bySubManager: boolean;
  subManager?: ISubManagerRef | null;
}) {
  const subName = subManagerName(subManager);

  return (
    <>
      <ConditionalRender cond={bySubManager}>
        <div className="mt-1">
          <span
            className="badge rounded-pill px-2 py-1 fw-semibold bg-info-subtle text-info-emphasis border border-info-subtle"
            style={{ fontSize: "0.7rem" }}
          >
            Subgerente
          </span>
        </div>
      </ConditionalRender>

      <ConditionalRender cond={!bySubManager && pending && !!subName}>
        <div className="text-muted fw-normal mt-1">
          o subgerente: {subName}
        </div>
      </ConditionalRender>
    </>
  );
}
