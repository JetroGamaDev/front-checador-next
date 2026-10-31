// Tutoriales guiados de Portal Gama (uno por pantalla).
// Cada tutorial se muestra una sola vez por usuario; el botón "?" lo vuelve a abrir.
// Para que un tutorial vuelva a salir a todos después de un cambio grande en la pantalla, sube su `version`.
import { button, css, filters, hasHeading, heading, label, rowButton, table, type Target } from "./targets";

export type TourSide = "top" | "right" | "bottom" | "left";

export type TourStep = {
  target?: Target; // sin target, el globo sale centrado en la pantalla
  title: string;
  text: string;
  side?: TourSide;
};

export type TourContext = {
  pathname: string;
  params: URLSearchParams;
};

export type Tour = {
  id: string;
  version: number;
  match: (ctx: TourContext) => boolean;
  steps: TourStep[];
};

// ---------- Ayudantes para armar los tutoriales ----------

const hasId = (ctx: TourContext) => {
  const id = ctx.params.get("id");
  return !!id && id !== "null";
};

// Lista de un módulo: /app/<modulo> sin id y con su título visible
const onList = (path: string, title: string) => (ctx: TourContext) =>
  ctx.pathname === path && !hasId(ctx) && hasHeading(title)();

// Formulario que se abre dentro de la misma ruta (no cambia la URL), reconocido por su título
const onForm = (path: string, title: string) => (ctx: TourContext) =>
  ctx.pathname === path && hasHeading(title)();

// Detalle de un registro: /app/<modulo>?id=<n>
const onDetail = (path: string) => (ctx: TourContext) => ctx.pathname === path && hasId(ctx);

type ListOptions = {
  id: string;
  path: string;
  title: string;
  intro: string;
  actions?: [string, string][]; // [texto del botón, explicación]
  filtersText?: string;
  tableText: string;
  rowActions?: [string, string][];
  extra?: TourStep[];
};

function listTour(o: ListOptions): Tour {
  return {
    id: o.id,
    version: 1,
    match: onList(o.path, o.title),
    steps: [
      { target: heading(o.title), title: o.title, text: o.intro, side: "bottom" },
      ...(o.actions ?? []).map(([text, desc]): TourStep => ({ target: button(text), title: text, text: desc, side: "bottom" })),
      { target: filters, title: "Filtros", text: o.filtersText ?? "Usa los filtros para encontrar más rápido lo que buscas. La lista se actualiza sola.", side: "bottom" },
      { target: table, title: "Lista", text: o.tableText, side: "top" },
      ...(o.rowActions ?? []).map(([text, desc]): TourStep => ({ target: rowButton(text), title: text, text: desc, side: "left" })),
      ...(o.extra ?? []),
    ],
  };
}

const SIGNATURES =
  "Las solicitudes pasan por tres firmas: la del <b>empleado</b>, la aprobación del <b>líder</b> y la revisión final del <b>D.O.H.</b> La columna <b>Firmado</b> muestra si ya está la firma del empleado y <b>Estatus</b> indica si está pendiente, aprobada, rechazada o cancelada.";

// ---------- Tutoriales ----------

export const WELCOME_TOUR: Tour = {
  id: "bienvenida",
  version: 1,
  match: (ctx) => ctx.pathname === "/app",
  steps: [
    { title: "¡Bienvenido a Portal Gama!", text: "Te mostramos en unos pasos cómo moverte en el sistema. Puedes cerrar este recorrido cuando quieras." },
    { target: css('button[aria-label="Menu"]'), title: "Menú", text: "Aquí abres el menú con todas las secciones a las que tienes acceso.", side: "right" },
    { target: css("#nav-user-dropdown-toggle"), title: "Tu cuenta", text: "Desde tu nombre entras a tu <b>Perfil</b> (foto, contraseña y verificación en dos pasos) o <b>cierras sesión</b>.", side: "bottom" },
    { target: css("#notifications-dropdown-toggle"), title: "Notificaciones", text: "Te avisa cuando una solicitud cambia de estado o necesita tu firma. El número rojo indica cuántas tienes sin leer.", side: "bottom" },
    { target: css('button[aria-label="Modo claro/oscuro"]'), title: "Modo claro u oscuro", text: "Cambia los colores de la pantalla a tu gusto.", side: "bottom" },
    { target: css('[aria-label="Visualizar periodo"]'), title: "Periodo de nómina", text: "Muestra el periodo de nómina actual con sus fechas de inicio y fin.", side: "bottom" },
    { target: css("#tour-help-button"), title: "¿Necesitas ayuda?", text: "En cada pantalla puedes dar clic aquí para volver a ver su tutorial.", side: "left" },
  ],
};

const TOURS: Tour[] = [
  // ----- Dashboard -----
  {
    id: "dashboard-admin",
    version: 1,
    match: (ctx) => ctx.pathname === "/app" && hasHeading("Administración")(),
    steps: [
      { target: heading("Administración"), title: "Dashboard", text: "Aquí están los reportes descargables y las gráficas de toda la empresa.", side: "bottom" },
      { target: label("Prima anual", ".row"), title: "Reportes", text: "Cada tarjeta descarga un reporte. Elige el mes o el periodo de nómina en su selector y da clic en <b>Descargar</b>.", side: "bottom" },
      { target: label("Exceso de tiempo de comida", ".card"), title: "Exceso de tiempo de comida", text: "Horas que se excedieron en la comida y cuántos empleados, por periodo del trimestre.", side: "top" },
      { target: label("Incidencias por trimestre", ".card"), title: "Incidencias por trimestre", text: "Total de permisos, vacaciones, incapacidades, horas extra, penalizaciones y faltas de la empresa.", side: "top" },
    ],
  },
  {
    id: "dashboard-empleado",
    version: 1,
    match: (ctx) => ctx.pathname === "/app" && hasHeading("Bienvenido", true)(),
    steps: [
      { target: heading("Bienvenido", true), title: "Tu panel", text: "Aquí ves el resumen de tus incidencias.", side: "bottom" },
      { target: label("Incidencias del periodo", ".card"), title: "Incidencias del periodo", text: "Tus permisos, vacaciones, incapacidades y horas extra del periodo de nómina. Cambia de periodo con el selector o con las flechas.", side: "bottom" },
      { target: label("Incidencias del año", ".card"), title: "Incidencias del año", text: "Tus totales del año, incluidas penalizaciones y faltas.", side: "top" },
    ],
  },

  // ----- Perfil -----
  {
    id: "perfil",
    version: 1,
    match: (ctx) => ctx.pathname === "/app/users/profile",
    steps: [
      { title: "Tu perfil", text: "Aquí consultas tus datos y administras la seguridad de tu cuenta." },
      { target: button("Actualizar perfil"), title: "Actualizar perfil", text: "Edita tus datos personales.", side: "bottom" },
      { target: button("Cambiar contraseña"), title: "Cambiar contraseña", text: "Escribe tu nueva contraseña dos veces y guárdala.", side: "bottom" },
      { target: label("Foto de perfil", ".card"), title: "Foto de perfil", text: "Da clic en la imagen, elige una foto (.jpg o .png) y da clic en <b>Guardar foto</b>.", side: "right" },
      { target: label("Verificación en dos pasos", ".card"), title: "Verificación en dos pasos", text: "Protege tu cuenta: además de tu contraseña, al entrar se pide un código de Google Authenticator. Si cambias de celular, pide a Recursos Humanos que la reinicie.", side: "top" },
    ],
  },

  // ----- Permisos -----
  {
    id: "permisos-crear",
    version: 1,
    match: onForm("/app/permissions", "Crear permiso"),
    steps: [
      { target: heading("Crear permiso"), title: "Solicitar un permiso", text: "Llena las secciones de arriba hacia abajo y al final da clic en <b>Guardar</b>.", side: "bottom" },
      { target: label("Datos del empleado", ".card"), title: "Datos del empleado", text: "Tus datos y tu líder se llenan solos. Elige al <b>D.O.H.</b> si hay más de uno.", side: "bottom" },
      { target: label("Motivo del permiso", ".card"), title: "Motivo", text: "Elige el <b>tipo</b> de permiso y describe el motivo.", side: "top" },
      { target: label("Fecha y horario", ".card"), title: "Fecha y horario", text: "Elige <b>Horas</b> si es por unas horas o <b>Días</b> si es por días completos, y captura las fechas.", side: "top" },
      { target: label("Firma", ".card"), title: "Firma", text: "Firma con el mouse o con el dedo. Usa <b>Borrar Firma</b> para repetirla.", side: "top" },
      { target: button("Guardar"), title: "Guardar", text: "Guarda la solicitud. Tu líder recibirá una notificación para aprobarla.", side: "bottom" },
    ],
  },
  {
    id: "permisos-detalle",
    version: 1,
    match: onDetail("/app/permissions"),
    steps: [
      { target: label("Resumen", ".card"), title: "Resumen", text: "Quién creó la solicitud, su líder, el D.O.H. y el motivo.", side: "right" },
      { target: label("Detalles del registro", ".card"), title: "Detalles", text: "Fechas, horas y notas del permiso.", side: "left" },
      { target: label("Firmas", ".card"), title: "Firmas", text: "Estado de cada firma: empleado, líder y D.O.H. Si te toca firmar o aprobar, hazlo desde aquí.", side: "top" },
      { target: button("Descargar"), title: "Descargar", text: "Descarga el formato del permiso.", side: "bottom" },
      { target: button("Regresar"), title: "Regresar", text: "Vuelve a la lista de permisos.", side: "bottom" },
    ],
  },
  listTour({
    id: "permisos",
    path: "/app/permissions",
    title: "Permisos",
    intro: "Aquí se consultan y se solicitan los permisos para faltar o salir unas horas.",
    actions: [["Crear permiso", "Abre el formulario para solicitar un permiso nuevo."]],
    tableText: SIGNATURES,
    rowActions: [
      ["Ver", "Abre el detalle del permiso con sus firmas."],
      ["Ver motivo", "Muestra por qué se canceló el permiso."],
    ],
  }),

  // ----- Vacaciones -----
  {
    id: "vacaciones-crear",
    version: 1,
    match: onForm("/app/vacationList", "Crear vacaciones"),
    steps: [
      { target: heading("Crear vacaciones"), title: "Solicitar vacaciones", text: "Llena las secciones y al final da clic en <b>Guardar</b>.", side: "bottom" },
      { target: label("Datos del empleado", ".card"), title: "Datos del empleado", text: "Revisa tu líder, el D.O.H. y elige el <b>periodo vacacional</b> al que corresponden los días.", side: "bottom" },
      { target: label("Fechas de vacaciones", ".card"), title: "Fechas", text: "Captura el primer y el último día de tus vacaciones.", side: "top" },
      { target: label("Resumen del periodo", ".card"), title: "Resumen del periodo", text: "Revisa cuántos días te corresponden, cuántos ya usaste y cuántos te quedan.", side: "top" },
      { target: label("Firma", ".card"), title: "Firma", text: "Firma la solicitud con el mouse o con el dedo.", side: "top" },
      { target: button("Guardar"), title: "Guardar", text: "Guarda la solicitud para que la revise tu líder.", side: "bottom" },
    ],
  },
  listTour({
    id: "vacaciones",
    path: "/app/vacationList",
    title: "Vacaciones",
    intro: "Aquí se consultan y se solicitan las vacaciones.",
    actions: [["Crear registro", "Abre el formulario para solicitar vacaciones."]],
    tableText: `Cada fila muestra el periodo vacacional y las fechas. ${SIGNATURES}`,
    rowActions: [["Ver", "Abre el detalle de la solicitud con sus firmas."]],
  }),

  // ----- Incapacidades -----
  {
    id: "incapacidades-crear",
    version: 1,
    match: onForm("/app/inability", "Crear incapacidad"),
    steps: [
      { target: heading("Crear incapacidad"), title: "Registrar una incapacidad", text: "Captura los datos de la incapacidad del IMSS y da clic en <b>Guardar</b>.", side: "bottom" },
      { target: label("Datos del empleado", ".card"), title: "Categoría y tipo", text: "Elige la categoría (enfermedad general, riesgo de trabajo o maternidad) y si es <b>inicial</b> o <b>subsecuente</b>.", side: "bottom" },
      { target: label("Periodo de incapacidad", ".card"), title: "Periodo", text: "Captura la fecha de inicio y la fecha final de la incapacidad.", side: "top" },
      { target: button("Guardar"), title: "Guardar", text: "Guarda el registro.", side: "bottom" },
    ],
  },
  listTour({
    id: "incapacidades",
    path: "/app/inability",
    title: "Incapacidades",
    intro: "Aquí se consultan y se registran las incapacidades del IMSS con sus documentos.",
    actions: [["Crear incapacidad", "Abre el formulario para registrar una incapacidad."]],
    tableText: "Cada fila muestra la categoría, el tipo, quién la registró y su estatus.",
    rowActions: [["Ver", "Abre el detalle de la incapacidad y sus documentos."]],
  }),

  // ----- Horas extra -----
  {
    id: "horas-extra-crear",
    version: 1,
    match: onForm("/app/overtime", "Horas extra"),
    steps: [
      { target: heading("Horas extra"), title: "Solicitar horas extra", text: "Llena las secciones y al final da clic en <b>Guardar</b>.", side: "bottom" },
      { target: label("Datos del empleado", ".card"), title: "Datos y motivo", text: "Revisa a tu líder y al D.O.H. y escribe el motivo del tiempo extra.", side: "bottom" },
      { target: label("Fecha y horario", ".card"), title: "Fecha y horario", text: "Captura el día y las horas de inicio y fin.", side: "top" },
      { target: label("Firma", ".card"), title: "Firma", text: "Firma la solicitud con el mouse o con el dedo.", side: "top" },
      { target: button("Guardar"), title: "Guardar", text: "Guarda la solicitud para que la revise tu líder.", side: "bottom" },
    ],
  },
  listTour({
    id: "horas-extra",
    path: "/app/overtime",
    title: "Registro de horas extra",
    intro: "Aquí se consultan y se solicitan las horas extra.",
    actions: [["Crear registro", "Abre el formulario para solicitar horas extra."]],
    tableText: `Cada fila muestra la fecha y el horario. ${SIGNATURES}`,
    rowActions: [["Ver", "Abre el detalle de la solicitud con sus firmas."]],
  }),

  // ----- Penalizaciones -----
  listTour({
    id: "penalizaciones",
    path: "/app/penalties",
    title: "Penalizaciones por faltas",
    intro: "Aquí se consultan las penalizaciones por faltas o retardos.",
    tableText: "Cada fila muestra la fecha de la penalización, si ya está firmada y su tipo.",
    rowActions: [
      ["Ver", "Abre el detalle de la penalización. Si te piden firmarla, hazlo desde ahí."],
      ["Ver motivo", "Muestra por qué se canceló la penalización."],
    ],
  }),

  // ----- Consultas generales -----
  listTour({
    id: "visitantes",
    path: "/app/visitors",
    title: "Visitantes",
    intro: "Registro de las personas externas que entran a las instalaciones.",
    actions: [["Registrar entrada", "Captura el nombre, la empresa y el motivo de la visita, y pide la firma del visitante. La hora de entrada se guarda sola."]],
    tableText: "Visitas del rango de fechas. Cuando el visitante se retire, registra su salida desde <b>Acciones</b>.",
    extra: [{ target: label("Dentro ahora", undefined, true), title: "Dentro ahora", text: "Cuántos visitantes siguen dentro sin registrar su salida.", side: "left" }],
  }),
  {
    id: "directorio",
    version: 1,
    match: (ctx) => ctx.pathname === "/app/employeeDirectory",
    steps: [
      { target: heading("Directorio"), title: "Directorio", text: "Datos de contacto de tus compañeros.", side: "bottom" },
      { target: filters, title: "Buscar", text: "Busca por nombre, extensión, correo o celular, o filtra por sucursal y departamento.", side: "bottom" },
    ],
  },
  {
    id: "organigrama",
    version: 1,
    match: (ctx) => ctx.pathname === "/app/orgChart",
    steps: [
      { target: heading("Organigrama"), title: "Organigrama", text: "Estructura de la empresa por departamento.", side: "bottom" },
      { target: filters, title: "Filtrar y buscar", text: "Elige un departamento o busca a una persona para ubicarla en el organigrama.", side: "bottom" },
      { target: label("Vista", ".card"), title: "Vista", text: "Expande o colapsa todo, ajusta el organigrama a la pantalla o descárgalo como imagen.", side: "left" },
    ],
  },

  // ----- Administración -----
  {
    id: "configuracion",
    version: 1,
    match: (ctx) => ctx.pathname === "/app/configSystem",
    steps: [
      { target: heading("Configuración del sistema"), title: "Configuración", text: "Define quién revisa cada tipo de incidencia: la persona de <b>Revisión DOH</b> y las personas de <b>Dirección</b>.", side: "bottom" },
      { target: button("Actualizar"), title: "Actualizar", text: "Edita a los revisores. Antes de cambiar a alguien, revisa que no tenga solicitudes pendientes de firmar.", side: "left" },
    ],
  },
  listTour({
    id: "usuarios",
    path: "/app/users",
    title: "Usuarios",
    intro: "Cuentas que entran con correo: administradores, Recursos Humanos y checadores. Los empleados entran con su número de empleado.",
    actions: [["Crear usuario", "Crea una cuenta: datos, correo, contraseña, rol, empleado relacionado y permisos."]],
    tableText: "Cada fila muestra el estado de la cuenta, el correo y cuántos permisos tiene.",
    rowActions: [["Ver", "Abre la cuenta para editarla o cambiar sus permisos."]],
  }),
  listTour({
    id: "checadores",
    path: "/app/checadores",
    title: "Checadores",
    intro: "Cuentas con las que se abre el checador en cada sucursal.",
    tableText: "En la columna <b>Tipo de validación</b> eliges cómo checan los empleados en ese equipo: <b>Solo NIP</b>, <b>Rostro y NIP</b> o <b>Solo rostro</b>. El checador toma el cambio sin cerrar sesión.",
  }),
  {
    id: "empleado-detalle",
    version: 1,
    match: onDetail("/app/employee"),
    steps: [
      { title: "Expediente del empleado", text: "Toda la información del empleado, organizada en pestañas." },
      { target: button("Actualizar Empleado"), title: "Actualizar", text: "Edita los datos del expediente.", side: "bottom" },
      { target: button("Dar de baja"), title: "Dar de baja", text: "Registra la baja con la razón, el tipo y la fecha efectiva. Para un reingreso usa la pestaña <b>Ingresos y Bajas</b>.", side: "bottom" },
      { target: button("Registrar biométricos"), title: "Biométricos", text: "Registra el rostro del empleado para que pueda checar por reconocimiento facial.", side: "bottom" },
      { target: button("Reiniciar verificación"), title: "Reiniciar verificación", text: "Quita la verificación en dos pasos, por ejemplo si el empleado cambió de celular.", side: "bottom" },
      { target: button("Reiniciar contraseña del sistema"), title: "Reiniciar contraseña", text: "El empleado vuelve a entrar con su NIP y crea una contraseña nueva.", side: "bottom" },
    ],
  },
  listTour({
    id: "empleados",
    path: "/app/employee",
    title: "Empleados",
    intro: "Expedientes de todos los empleados.",
    actions: [["Crear empleado", "Da de alta a un empleado: datos personales, laborales (incluidos su código y NIP del checador), contactos e ingresos."]],
    filtersText: "Busca por nombre o filtra por sucursal, departamento y puesto. En puesto también puedes ver a los inhabilitados.",
    tableText: "Cada fila muestra la sucursal, el departamento, el puesto, el líder y el estatus del empleado.",
    rowActions: [["Ver", "Abre el expediente del empleado."]],
  }),
  listTour({
    id: "participacion",
    path: "/app/reportsParticipation",
    title: "Participación en reportes",
    intro: "Define qué empleados entran en los cálculos automáticos: faltas, prenómina, vales, bonos, reportes y gráficas.",
    actions: [
      ["Incluir en reportes", "Incluye a los empleados seleccionados."],
      ["Excluir de reportes", "Excluye a los empleados seleccionados. Siguen apareciendo en Empleados y pueden checar."],
    ],
    tableText: "Marca empleados con la casilla de cada fila para incluirlos o excluirlos en grupo.",
  }),
  {
    id: "permisos-empleados",
    version: 1,
    match: (ctx) => ctx.pathname === "/app/employeePermissions",
    steps: [
      { target: heading("Permisos de empleados"), title: "Permisos base", text: "Permisos que recibe automáticamente cada empleado nuevo al crearlo.", side: "bottom" },
      { target: button("Aplicar a todos"), title: "Aplicar a todos", text: "Da los permisos base también a los empleados que ya existen.", side: "left" },
    ],
  },
  listTour({
    id: "salarios",
    path: "/app/salaries",
    title: "Salarios",
    intro: "Salario diario de cada empleado.",
    tableText: "Cada fila muestra el salario diario actual.",
    rowActions: [["Actualizar", "Cambia el salario diario del empleado."]],
  }),
  listTour({
    id: "sucursales",
    path: "/app/branches",
    title: "Sucursales",
    intro: "Catálogo de sucursales con su dirección y coordenadas.",
    actions: [["Crear sucursal", "Da de alta una sucursal nueva."]],
    tableText: "Cada fila muestra la dirección de la sucursal.",
    rowActions: [["Ver", "Abre la sucursal para actualizarla o eliminarla."]],
  }),
  listTour({
    id: "departamentos",
    path: "/app/departments",
    title: "Departamentos",
    intro: "Catálogo de departamentos con su líder, subgerente y puestos. El líder aprueba las solicitudes de su equipo.",
    actions: [["Crear departamento", "Da de alta un departamento nuevo."]],
    tableText: "Cada fila muestra el líder, el subgerente y cuántos puestos tiene.",
    rowActions: [["Ver", "Abre el departamento para editarlo y agregar puestos."]],
  }),
  listTour({
    id: "eventos",
    path: "/app/eventos",
    title: "Eventos del checador",
    intro: "Todas las checadas de los empleados: evento, hora, diferencia contra su horario y estatus.",
    actions: [
      ["Checadas por validar", "Checadas hechas sin conexión que llegaron más de una hora tarde. Revísalas y valídalas o recházalas."],
      ["Modificar Registro", "Corrige la checada seleccionada. Solo se pueden modificar las del día actual, una a la vez."],
      ["Eliminar Registro", "Elimina la checada seleccionada."],
    ],
    tableText: "Da clic en <b>Seleccionar</b> en la fila que quieras modificar o eliminar.",
  }),
  listTour({
    id: "anuncios",
    path: "/app/newsletter",
    title: "Anuncios",
    intro: "Avisos que aparecen en la pantalla de los checadores durante su periodo de publicación.",
    actions: [["Crear anuncio", "Captura título, descripción, fechas y horas de publicación, y una imagen si quieres."]],
    tableText: "Cada fila muestra el periodo de publicación del anuncio.",
  }),
  listTour({
    id: "faltas",
    path: "/app/absences",
    title: "Faltas y Asistencias",
    intro: "Faltas y retardos de los empleados.",
    actions: [
      ["Crear Penalización", "Crea una penalización con los registros seleccionados. Se activa al seleccionar al menos uno."],
      ["Generar faltas", "Genera las faltas del día de los empleados que no checaron."],
      ["Generar Excel", "Descarga el reporte del rango de fechas."],
    ],
    tableText: "Cada fila es una falta o un retardo. Usa <b>Seleccionar</b> para elegir registros y <b>Ver</b> para el detalle.",
  }),
  listTour({
    id: "dispositivos",
    path: "/app/devices",
    title: "Dispositivos",
    intro: "Inventario de equipos de la empresa con su responsable y datos de red.",
    actions: [
      ["Crear dispositivo", "Da de alta un equipo nuevo."],
      ["Descargar Directorio", "Descarga el directorio general de equipos."],
    ],
    tableText: "Cada fila muestra el tipo de equipo, su responsable, MAC, VLAN y estatus.",
    rowActions: [["Ver", "Abre el equipo para actualizarlo, ver su historial o asignarlo a un empleado con su responsiva."]],
  }),
  listTour({
    id: "bonos-llaves",
    path: "/app/bonuskeys",
    title: "Bonos de llaves",
    intro: "Bonos que se pagan a los empleados responsables de llaves.",
    actions: [
      ["Crear bono", "Registra un bono nuevo."],
      ["Descargar documento", "Descarga el listado de bonos."],
    ],
    tableText: "Cada fila muestra el empleado, su locación y la cantidad del bono.",
    rowActions: [["Actualizar", "Cambia los datos del bono."]],
  }),
  listTour({
    id: "bonos-home-office",
    path: "/app/bonushomeoffice",
    title: "Bonos de home office",
    intro: "Bonos que se pagan a los empleados que trabajan desde casa.",
    actions: [
      ["Crear bono", "Registra un bono nuevo."],
      ["Descargar documento", "Descarga el listado de bonos."],
    ],
    tableText: "Cada fila muestra el empleado, su departamento y la cantidad del bono.",
    rowActions: [["Actualizar", "Cambia los datos del bono."]],
  }),
  listTour({
    id: "prenomina",
    path: "/app/prePayroll",
    title: "Prenómina",
    intro: "Incidencias del periodo para la nómina, con su clave de Nomipaq y duración.",
    actions: [["Validar", "Se activa cuando todas las filas tienen fecha de nómina. Valida la prenómina del periodo."]],
    filtersText: "Filtra por empleado, año, periodo e incidencia.",
    tableText: "Las filas marcadas con <b>FALTA DE COMPLETAR</b> necesitan su fecha de nómina.",
    rowActions: [["Actualizar", "Captura la fecha de nómina de la incidencia."]],
  }),
  listTour({
    id: "vales",
    path: "/app/groceryVouchers",
    title: "Vales de despensa",
    intro: "Empleados beneficiados con vales de despensa en cada periodo.",
    filtersText: "Busca por empleado o elige el periodo.",
    tableText: "Abre el detalle de un empleado para ver los días pagados y los descuentos por faltas o retardos.",
  }),
  listTour({
    id: "documentos-legales",
    path: "/app/termsAndConditionsAdmin",
    title: "Documentos legales",
    intro: "Términos y condiciones y aviso de privacidad. Al publicar una versión nueva, todos deben aceptarla para seguir usando el sistema.",
    actions: [["Nuevo", "Crea un documento: tipo, título y contenido."]],
    tableText: "Cada fila muestra el tipo, la versión y el estado del documento.",
  }),
];

// Tutorial que corresponde a la pantalla actual (el de bienvenida tiene prioridad en el Dashboard)
export function findTour(ctx: TourContext, includeWelcome: boolean): Tour | null {
  if (includeWelcome && WELCOME_TOUR.match(ctx)) return WELCOME_TOUR;
  return TOURS.find((t) => t.match(ctx)) ?? null;
}
