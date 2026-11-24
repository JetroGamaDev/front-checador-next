# CLAUDE.md — Portal Gama (front del checador)

Front de **Portal Gama**: el sistema de asistencia y recursos humanos de Gama Consumibles.
Cubre checadas, empleados, incidencias (permisos, vacaciones, faltas, incapacidades, horas extra, penalizaciones), prenómina, bonos, reportes y más.
El backend es una API REST aparte (otro repositorio). Este repo solo es el front.

---

## 1. Reglas de trabajo (obligatorias)

- **Responde siempre en español**, claro y sin tecnicismos de más. El usuario final y el desarrollador hablan español.
- **No hagas commits ni push.** El desarrollador hace los commits. Al terminar, di qué archivos cambiaste.
- **No toques servidores.** No corras comandos en el droplet ni en staging o producción. Si el servidor necesita algo, entrégalo como una lista al final.
- **Pruebas:** escríbelas cuando apliquen, pero **no las corras**; las corre el desarrollador. Di cuáles agregaste o cambiaste.
- **Revisión rápida permitida:** `npx tsc --noEmit` y `npx eslint <archivos cambiados>`.
- **No escribas credenciales** (correos, contraseñas, NIP, tokens) en archivos, código, commits ni entregables. No leas ni muestres `.env`.
- **Solo lectura contra staging.** Las pruebas contra la API de staging son de solo lectura, salvo que el desarrollador lo autorice. No aceptes Términos, no crees ni borres registros.
- **No inventes campos del backend.** Si el back no manda un dato, usa un valor por defecto seguro y dilo en tu respuesta.
- **Respeta lo que ya existe.** No cambies diseño, textos, flujos ni nombres que no te pidieron. Si una petición choca con una regla de esta guía, sigue la guía y explica la diferencia.
- **Avisa las decisiones.** Si cambias algo que el pedido no mencionaba (por ejemplo, una regla de habilitado), dilo para que el desarrollador decida.
- **Archivos:** UTF-8. Conserva los saltos de línea que ya tenga cada archivo; muchos `.tsx` están en CRLF. `docker/**`, `*.sh` y `Dockerfile` van siempre en LF (ver `.gitattributes`).
- **Comentarios en español**, cortos y útiles; explican el porqué, no lo obvio.
- **Ortografía:** todo texto que ve el usuario va en español correcto, con acentos (Sí, Periodo, Prenómina, Contraseña…).

---

## 2. Stack

| Pieza | Versión / nota |
|---|---|
| Next.js | 15.5 (App Router, server actions, `output: "standalone"`, Turbopack en dev y build) |
| React | 19.1 |
| Autenticación | next-auth v5 beta, credenciales, sesión JWT |
| UI | react-bootstrap 2 + Bootswatch 5.3 + bootstrap-icons 1.13 |
| Formularios | react-hook-form |
| HTTP | axios (siempre desde el servidor) |
| Fechas | moment + moment-timezone (zona `America/Mexico_City`), date-fns para el datepicker |
| Gráficas | chart.js + react-chartjs-2, d3 / d3-org-chart (organigrama) |
| Otros | driver.js 1.9.0 (tutoriales, versión fija), react-signature-canvas (firmas), pdf-lib / pdfjs-dist, react-easy-crop, qrcode.react, Google Maps |

Scripts:

- `npm run dev`: desarrollo con Turbopack.
- `npm run build`: compilación de producción.
- `npm run lint`: eslint.
- `npm run tc`: `tsc` más lint.

---

## 3. Estructura

```
app/
  (auth)/app/<modulo>/page.tsx      Página (server). Lee searchParams y monta la vista en <Suspense>
  (auth)/app/<modulo>/views/*.tsx   Vistas server que piden los datos y pasan props al cliente
  actions/<modulo>-actions.ts       Server actions ("use server"): única capa que llama a la API
  api/                              Route handlers propios (server-time = healthcheck, menu, notificaciones…)
  auth/                             Login y verificación 2FA
  legal/                            Términos y Aviso de privacidad públicos
components/
  <modulo>/                         Componentes cliente del módulo (TableClient, modales, formularios)
  fields/                           Campos reutilizables (EntryField, SelectField, Many2one, SignatureField…)
  templates/                        ListView, FormView, TableTemplate, OverLay (tooltip)
  tours/TourManager.tsx             Tutoriales guiados
  LoadingSpinner.tsx, SuccessOverlay.tsx, ErrorOverlay.tsx, ConditionalRender.tsx, ModalBlur.tsx
context/ModalContext.tsx            modalConfirm / modalAlert / modalError globales
hooks/useSessionStore.ts            useSessionSnapshot(): sesión con ajustes para empleados
lib/
  auth.ts                           Configuración de next-auth (callbacks jwt/session)
  definitions.ts                    Tipos base (User, Employee, Department, ActionResponse…)
  <modulo>/interface.ts             Modelos de cada módulo (IPermissionRequest, IPrePayroll, IBonusKeys…)
  helpers.ts                        Formato de fechas y utilidades
  employeeVisibility.ts             isEmployeeSession, isOnlyEmployee, isCancelled
  tours/                            Definición de los tutoriales (tours.ts, targets.ts)
types/next-auth.d.ts                Campos extra de la sesión
middleware.ts                       Redirección a /auth sin sesión y a /auth/verify con 2FA pendiente
docker/, Dockerfile, .github/       Infraestructura (sección 9)
```

Las vistas de lista y formulario se manejan con `searchParams`: `view_type=list|form`, `id`, `page`, `limit`, `search`, fechas, etc.
Al filtrar se hace `router.push` con los nuevos parámetros, y la vista server vuelve a pedir los datos.

---

## 4. Flujo de datos y API

- **Toda llamada a la API va en una server action** (`app/actions/*-actions.ts`), nunca desde el navegador.
- **Token y URL de la API:** se obtienen con `storeAction()` (`{ apiToken, API_URL }`) o con `storeToken()` (`{ apiToken, apiUrl }`).
  - `API_URL` ya incluye `/api/v1`, así que se llama `${API_URL}/permissionRequest/list`.
  - Siempre se manda el header `Authorization: Bearer <token>`.
- **Respuesta estándar** de una acción: `ActionResponse<T> = { success, message, data? }`.
  - Nunca lances el error hacia el componente: atrápalo y regresa `{ success: false, message }`.
  - Muestra el `message` del backend (`error.response?.data?.message`) cuando exista.
- **Respuesta estándar de la API:** `{ status, message, data }`.
- **Después de mutar:** `revalidatePath("/app/<modulo>")` en la acción y `router.refresh()` en el cliente.
- **Descarga de archivos (Excel/PDF):**
  - Pide la respuesta con `responseType: "arraybuffer"`. Es el equivalente de `blob` en Node.
  - Si el `content-type` es JSON con estado 200, trátalo como error: no descargues un archivo dañado.
  - En un error, el cuerpo llega como binario: `JSON.parse(Buffer.from(data).toString("utf8")).message`.
  - Convierte el archivo a un data URL en base64 y regrésalo al cliente. El cliente lo descarga con un `<a download>` temporal.
  - Si el back manda `Content-Disposition`, toma de ahí el nombre del archivo; si no, usa uno por defecto.
  - Ejemplos: `getLunchExcessReport`, `downloadNomipaqPrenom`, `downloadDocBonusKeys`.
- **Booleanos** hacia la API: siempre `true`/`false` reales, nunca strings.
- **Sin interceptor de 401:** `lib/apiFetch.ts` existe, pero no se usa. Cada acción maneja su error.

---

## 5. Sesión, roles y permisos

- **Login:**
  - `lib/auth.ts` llama a `userLoginCredentials` y luego a `getUserData` (`GET /me`).
  - Los datos de `/me` se copian al token JWT y a `session.user`.
- **Campos de sesión:** `apiToken`, `id`, `role`, `permissions`, `status`, `idEmployee`, `isDoh`, `isLeader`, `roles`, `twoFactorEnabled`, `twoFactorPending`, `enableTutorials`, `sessionType`.
- **Agregar un campo de `/me`:**
  - Agrégalo en `lib/definitions.ts` (`User`) y en `types/next-auth.d.ts`.
  - Cópialo en `authorize`, en las ramas de `jwt` y en `session`.
  - Dale un valor por defecto seguro para las sesiones viejas que no lo traen.
- **Actualizar la sesión sin recargar:**
  - En el cliente se llama a `useSession().update({ <bandera> })`.
  - El callback `jwt` (con `trigger === "update"`) **vuelve a leer `/me` en el servidor**. Nunca confíes en valores mandados desde el cliente.
- **Tipos de sesión** (`sessionType`):
  - `"user"`: usuario del sistema, entra con correo.
  - `"employee"`: entra con número de empleado y NIP o contraseña.
  - Para distinguirlas usa `isEmployeeSession()`. En sesión de empleado se ignoran `isDoh` e `isApproverDoh` (ver `useSessionSnapshot`).
- **Roles** (`role`): `SUPER_ADMIN | ADMIN | LEADER | EMPLOYEE | CHECADOR`.
  - El checador solo usa la pantalla de checar: sin tutoriales, sin perfil completo, sin 2FA.
- **Roles de flujo** (`roles`): `isLeader`, `isExtra`, `isDoh`, `isApproverLeaders`, `isApproverDoh`.
  - `isOnlyEmployee()` y `readInput` en los componentes deciden si solo se ve en modo lectura.
- **Permisos finos:** `session.user.permissions.some(p => p.text === "actualizar_empleados")`.
  - El back valida siempre; el front solo oculta o deshabilita.
- **Avisos al entrar:** van en cadena en `PostLoginGates`.
  - Primero Términos y Aviso de privacidad (`LegalAcceptanceGate`), luego crear la contraseña (`PasswordSystemGate`), luego los tutoriales.
- **2FA:** mientras `twoFactorPending` sea verdadero, el middleware solo deja entrar a `/auth/verify`.

---

## 6. Convenciones de UI (no negociables)

- **Carga y resultado:** usa siempre el patrón del sistema.
  ```tsx
  type FeedbackState = "loading" | "success" | "error" | null;
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  <ConditionalRender cond={feedback === "loading"}><Loading message={feedbackMsg} /></ConditionalRender>
  <ConditionalRender cond={feedback === "success"}><SuccessOverlay message={feedbackMsg} onDone={() => setFeedback(null)} /></ConditionalRender>
  <ConditionalRender cond={feedback === "error"}><ErrorOverlay message={feedbackMsg} onDone={() => setFeedback(null)} /></ConditionalRender>
  ```
  - **Prohibido:** texto "Cargando..." dentro de tarjetas, spinners en botones, etiquetas tipo "Guardando..." y toasts para errores.
  - Si un pedido dice "spinner" o "toast", usa este patrón y menciónalo.
  - Para evitar doble clic, la pantalla de carga ya bloquea todo; además deshabilita el botón con `feedback === "loading"`.
  - Pinta los overlays después de cualquier `ModalBlur` para que queden encima.
  - Si un modal necesita datos, muestra `Loading` mientras llegan y abre el modal hasta tenerlos.
- **Botones "Actualizar":** todo botón de actualizar o editar un registro (por ejemplo "Actualizar usuario") va con `variant="info"`.
- **Confirmación:** antes de guardar, eliminar o descargar, usa `modalConfirm("¿Seguro que quieres …?", async () => { … })`.
- **Render condicional:** usa `<ConditionalRender cond={...}>`.
- **Tooltips:** usa `<OverLay string="…">`.
  - Un botón deshabilitado no recibe el mouse: envuélvelo en `<span className="d-inline-block">` y ponle `pointerEvents: "none"`.
- **Badges de estatus:** `badge rounded-pill px-3 py-2 fw-semibold bg-<color>-subtle text-<color>-emphasis border border-<color>-subtle`.
  - Verde para aprobado, amarillo para pendiente, rojo para rechazado, gris para cancelado o sin definir.
  - Hay colores extra en `globals.css`: `pink`, `purple`, `orange`, `teal`, `indigo`, `brown`.
- **Tarjetas:** `Card className="border rounded-4"`, con un encabezado `h6 fw-bold` y un badge a la derecha.
- **Tablas:**
  - `table table-hover align-middle` con `thead.table-dark`.
  - Columnas definidas como `TableTemplateColumn<T>[]` (`key`, `label`, `accessor`, `render`).
  - El texto del usuario va en mayúsculas (`text-uppercase`).
  - El estado vacío lleva un ícono y un mensaje.
- **Modo oscuro:**
  - Se controla con `data-bs-theme` en `<html>`.
  - Usa clases y variables de Bootstrap (`--bs-body-bg`, `--bs-body-color`, `*-subtle`). No uses colores fijos.
  - Revisa siempre que se vea en los dos modos.
- **Responsive:** el texto de los botones se oculta en pantallas chicas con `d-none d-md-inline`. No debe haber scroll horizontal en la página.
- **Íconos:** solo bootstrap-icons (`bi bi-…`).
- **Tutoriales** (`lib/tours/tours.ts`):
  - Si cambias una pantalla que tiene tutorial, ajusta sus pasos y **sube su `version`** para que se vuelva a mostrar.
  - Los tutoriales automáticos se apagan con `enableTutorials` del perfil. El botón "?" siempre queda disponible, menos para el checador.

---

## 7. Fechas y zonas horarias

La zona del negocio es **`America/Mexico_City`**. Usa los helpers de `lib/helpers.ts`:

- **`formatDateMx`, `formatDateHours`, `formatCreatedAtOnlyHours`:** para momentos reales guardados en UTC, como `createdAt`, checadas, firmas o la fecha de registro de una falta.
- **`formatCreatedAt`:** para días de calendario, como periodos, rangos de vacaciones o permisos, `fechaNomina` y vencimientos. Se muestran tal cual, sin cambiar de zona.
- **`formatScheduleTime` y `formatParseHours`:** para horas sueltas `HH:mm`.

Usar el helper equivocado corre el día o la hora. Antes de mostrar una fecha, decide si es un momento o un día de calendario.

---

## 8. Modelos principales

- **Tipos base** (`lib/definitions.ts`):
  - `User`, que incluye `idCheck`, `sessionType`, `enableTutorials` y `twoFactor*`.
  - `Employee`, `Department`, `Position`, `Branch`, `ICurrentPeriod`.
  - `ActionResponse<T>`, `ApiResponse<T>`.
- **Modelos por módulo:** cada módulo tiene los suyos en `lib/<modulo>/interface.ts`.
  - `IPermissionRequest` (con `withPay`), `IPrePayroll` (con `pendingApproval`), `IBonusKeys`, `IOvertime`, vacaciones, penalizaciones, incapacidades, etc.
- **Ids que no se deben confundir:**
  - `id` es el id interno del registro.
  - `idEmployee` es el id interno del empleado.
  - **`idCheck` es el número de empleado.** Es el que se muestra a las personas como "ID empleado".
- **Estatus de flujo:** `"APPROVED" | "PENDING" | "REFUSED"`. Un registro cancelado trae `delete.delete === true` (usa `isCancelled`).
- **Campos nuevos del back:** agrégalos como opcionales (`campo?: tipo | null`). Contempla que no lleguen en registros viejos o en un back que aún no se despliega.

---

## 9. Infraestructura y despliegue

- **Ramas:**
  - `staging` se despliega a staging.
  - `master` se despliega a producción.
  - `main` existe, pero producción sale de `master`.
- **CI:** `.github/workflows/deploy.yml`, en un runner self-hosted, corre `bash docker/deploy.sh prod|staging` con cada push a esas ramas.
- **Docker:**
  - `Dockerfile` en varias etapas, sobre `node:22-bookworm-slim`, con salida standalone y usuario `node`.
  - Healthcheck a `/api/server-time`.
- **Puertos:** producción en `127.0.0.1:3003`, staging en `127.0.0.1:3004`. Se publica detrás de un túnel de Cloudflare.
- **Variables:** en el servidor, en `/opt/checador-front/<env>.env`, fuera del repo.
  - **De ejecución:** `AUTH_SECRET`, `API_URL`, `NEXTAUTH_URL`, `NEXTAUTH_TRUST_HOST`, `ENVIROMENT` (así, con esa ortografía), `ID_DEV_SISTEM_*`.
  - **De compilación:** `NEXT_PUBLIC_*` (hoy `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`). Quedan horneadas en la imagen. Una nueva se declara como `ARG`/`ENV` en el `Dockerfile`.
- **Server actions:** `bodySizeLimit` de 100 MB (para fotos y PDFs).
- **Detalle de la operación:** `docker/README.md`.

---

## 10. Checklist antes de entregar

1. El cambio sigue los patrones de las secciones 4 a 7, en especial los overlays, `modalConfirm` y los helpers de fecha.
2. Los tipos nuevos son opcionales y tienen un valor por defecto seguro.
3. Los textos para el usuario están en español correcto.
4. Se ve bien en modo claro y oscuro, y en pantallas chicas.
5. Si la pantalla tiene tutorial, se revisaron sus pasos y su `version`.
6. Pasan `npx tsc --noEmit` y `npx eslint <archivos>`.
7. La respuesta, en español, empieza por el resultado. Luego van los archivos cambiados, las decisiones que se apartan del pedido y lo que no se pudo probar (por ejemplo, un back de staging sin desplegar).
8. Sin commits.
