"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { getPasswordSystemStatus } from "@/app/actions/employeePasswordSystem-actions";
import PasswordSystemModal from "./PasswordSystemModal";

// "Ahora no" solo dura la sesión del navegador: en el siguiente login se vuelve a ofrecer
export const PASSWORD_SYSTEM_DISMISS_KEY = "password-system-prompt-dismissed";

//Después del login, a los empleados que aún entran con su NIP se les ofrece crear su contraseña del sistema.
// onResolved avisa cuando ya no hay nada que mostrar (no aplica, ya la tiene, la creó o eligió "Ahora no")
export default function PasswordSystemGate({ enabled, onResolved }: { enabled: boolean; onResolved?: () => void }) {
  const { data: session, status: sessionStatus } = useSession();
  const [show, setShow] = useState(false);
  const [idCheck, setIdCheck] = useState<number | null>(null);
  const requested = useRef(false);

  useEffect(() => {
    if (!enabled || requested.current || sessionStatus !== "authenticated") return;
    if (session?.user?.role === "CHECADOR" || session?.user?.twoFactorPending) return;

    try {
      if (sessionStorage.getItem(PASSWORD_SYSTEM_DISMISS_KEY) === "1") {
        onResolved?.();
        return;
      }
    } catch {}

    requested.current = true;

    getPasswordSystemStatus()
      .then((res) => {
        if (!res.success || !res.isEmployee || !res.passwordSystemPending) {
          onResolved?.();
          return;
        }
        setIdCheck(res.idCheck);
        setShow(true);
      })
      .catch(() => onResolved?.());
  }, [enabled, sessionStatus, session, onResolved]);

  if (!show) return null;

  return (
    <PasswordSystemModal
      firstTime
      idCheck={idCheck}
      cancelLabel="Ahora no"
      onClose={() => {
        try { sessionStorage.setItem(PASSWORD_SYSTEM_DISMISS_KEY, "1"); } catch {}
        setShow(false);
        onResolved?.();
      }}
      onSaved={() => {
        setShow(false);
        onResolved?.();
      }}
    />
  );
}
