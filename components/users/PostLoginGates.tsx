"use client";

import { Suspense, useCallback, useState } from "react";
import LegalAcceptanceGate from "../termsAndConditions/LegalAcceptanceGate";
import PasswordSystemGate from "./PasswordSystemGate";
import TourManager from "../tours/TourManager";

// Avisos después del login, uno tras otro: primero Términos y Aviso de privacidad, luego crear la contraseña
// y al final los tutoriales guiados (para que no se encimen con los avisos)
export default function PostLoginGates() {
  const [legalResolved, setLegalResolved] = useState(false);
  const [passwordResolved, setPasswordResolved] = useState(false);
  const handleLegalResolved = useCallback(() => setLegalResolved(true), []);
  const handlePasswordResolved = useCallback(() => setPasswordResolved(true), []);

  return (
    <>
      <LegalAcceptanceGate onResolved={handleLegalResolved} />
      <PasswordSystemGate enabled={legalResolved} onResolved={handlePasswordResolved} />
      <Suspense fallback={null}>
        <TourManager autoStart={legalResolved && passwordResolved} />
      </Suspense>
    </>
  );
}
