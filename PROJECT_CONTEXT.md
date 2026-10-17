# PROJECT_CONTEXT.md · StockPilot

**Producto:** StockPilot  
**Versión del contexto:** 1.2 (2026-10-16; cambios en §12)

**Estado:** **Continuidad del producto retirada por el dueño**; se completa la base técnica, kit y starter genérico y se detiene StockPilot antes de iniciar Junie (estado vivo en `docs/STATUS.md`). Los flujos/RN/CA inferiores conservan el contexto histórico, sin autorizar trabajo comercial nuevo.

**Fecha de aprobación:** no registrada; no se asigna una fecha por inferencia.  
**Ubicación:** `PROJECT_CONTEXT.md` en la raíz del repositorio `MatiasNicolasAcevedo/stockpilot`, fuera del kit local `plantilla/`.

Este documento recoge la intención y el alcance aceptados para StockPilot. Es la referencia de producto para preparar posteriormente el repositorio; **no acredita que exista código, que una integración funcione o que se haya completado la preparación técnica**. Las etiquetas **Confirmado**, **Propuesto** y **Pendiente** distinguen acuerdos, recomendaciones aún no aceptadas y decisiones abiertas. Las cuestiones pendientes no bloqueantes pueden resolverse durante la preparación sin ampliar el MVP; si una propuesta altera el comportamiento aceptado, debe consultarse al dueño.

## 1. Identificación

- **Nombre:** StockPilot. **Estado: Confirmado.**
- **Resumen:** aplicación web multiempresa para pequeños comercios de distintos rubros. Cada comercio administra sus propios productos y existencias, incorpora empleados y registra ventas simples con un único medio de pago, preservando movimientos e historial y evitando acceso cruzado a los datos.
- **Tipo/uso inicial:** proyecto demostrativo de portfolio personal; uso local o de demostración como punto de partida. **Confirmado** el propósito de portfolio; despliegue público real **Pendiente**.
- **Dueño de decisiones del producto:** propietario del proyecto (rol, sin datos personales).
- **Prioridad:** flujo comercial completo y verificable, separación entre comercios, consistencia de inventario y experiencia visual intuitiva. **Confirmado** como dirección de producto.
- **Stack y proceso de desarrollo:** base técnica del §9, acordada de antemano; no reabrir elecciones durante la definición de la idea.
- **Diseño:** implementar y refinar la interfaz directamente con los agentes de desarrollo y revisión visual. **Confirmado: no introducir una etapa ni una dependencia de Claude Design/Artifacts**; no se excluye utilizar referencias visuales sencillas cuando resulten útiles.
- **Repositorio GitHub:** `MatiasNicolasAcevedo/stockpilot`. **Confirmado** por el dueño el 2026-10-12 durante la preparación (P-11).
- **Visibilidad y licencia:** repositorio **público en GitHub** con **licencia MIT** como valores por defecto aceptados. Titular de la licencia: **Matias Nicolas Acevedo**, **Confirmado** por el dueño el 2026-10-12 (P-11). Los ejemplos y datos publicados serán ficticios; ningún secreto o registro comercial real debe entrar al repositorio.
- **Límite del alcance:** este documento define exclusivamente StockPilot; no incorpora requisitos de otras ideas.

## 2. Problema y resultado esperado

- **Usuario principal — Confirmado:** dueño/encargado y empleados de un pequeño comercio. El producto debe servir a comercios de diferentes rubros, sin estar especializado en un sector.
- **Situación/problema — Propuesto y aceptado como enfoque del MVP:** el comercio necesita saber cuántas unidades tiene de cada producto y registrar ventas sin perder la relación entre ventas y stock. Al operar varias personas, un registro manual disperso o no coordinado puede producir diferencias y falta de trazabilidad.
- **Alternativa actual — Hipótesis, no comprobada con usuarios reales:** cuadernos, planillas o registros manuales. No afirmar que se hayan realizado entrevistas, mediciones o investigaciones de mercado.
- **Valor esperado — Confirmado:** inventario actualizado por entradas, ajustes y ventas; conocimiento de quién ejecutó cada operación; posibilidad de corregir ventas por anulación; aislamiento del inventario, empleados y ventas de cada comercio.
- **Resultado observable del MVP:** una persona crea un comercio, incorpora un empleado por invitación, carga un producto, registra existencias, vende varias unidades usando un medio de pago, comprueba el stock resultante y consulta la venta; un administrador puede anularla y comprobar la restitución y la trazabilidad. Un integrante de otro comercio no accede a esos datos.
- **Tradeoff aceptado:** priorizar integridad, claridad y facilidad de operación por encima de módulos empresariales avanzados. Dashboard básico, sin analítica compleja. No inventar objetivos de ingresos, rendimientos, usuarios concurrentes ni porcentajes de mejora.

## 3. Usuarios y acceso

**Actores confirmados**

1. **Visitante:** no tiene sesión. Puede acceder a una pantalla de entrada e iniciar sesión, pero no consultar datos de comercios.
2. **Usuario autenticado sin pertenencia:** puede crear su propio comercio y abrir un enlace de invitación dirigido a su cuenta; no puede operar comercios ajenos.
3. **Administrador de comercio:** el creador obtiene ese rol en el nuevo comercio. Administra catálogo, puede registrar operaciones, generar invitaciones para empleados y anular ventas.
4. **Empleado de comercio:** se incorpora al aceptar una invitación dirigida a su cuenta Google. Consulta stock y ventas; registra ventas, entradas de mercadería y ajustes de inventario. No administra el catálogo, invita personas ni anula ventas.

**Identidad y autorización confirmadas**

- Inicio de sesión con Google OpenID Connect; sesión mantenida por el backend con Spring Security y protección CSRF. La identidad autenticada **no otorga por sí sola** acceso a un comercio.
- Cualquier persona autenticada mediante una cuenta Google puede crear un comercio propio; no se restringe por dominio de correo. Esto es parte del alcance aceptado de autoalta.
- El administrador crea invitaciones ligadas a una dirección de correo Google y comparte manualmente el enlace. No se envían mensajes automáticamente. El receptor inicia sesión con la cuenta destinataria y acepta la invitación.
- **Invitación de un solo uso y con vencimiento**: aceptado como comportamiento; duración exacta **Pendiente no bloqueante**. La aceptación otorga el rol **Empleado** en ese comercio, no el de Administrador.
- Una misma identidad puede pertenecer a múltiples comercios, incluso con distintos roles, y seleccionar el **comercio activo**. La autorización se comprueba en cada petición por identidad, pertenencia, rol y comercio propietario del recurso; nunca se confía únicamente en el selector de la interfaz ni en parámetros enviados por el cliente.
- Aislamiento estricto: ningún usuario puede consultar o mutar información de un comercio al que no pertenece. Cambiar el comercio activo no hereda privilegios de otro comercio.

**Matriz mínima de permisos — Confirmada al aceptar el alcance del MVP**

| Actor | Recurso o acción | Regla de acceso / propiedad | Si no está autorizado |
|---|---|---|---|
| Visitante | Datos de comercios, productos, ventas | Requiere sesión y pertenencia | No se divulgan datos; se solicita autenticación o se deniega |
| Usuario autenticado | Crear comercio propio | Permitido; adquiere rol Administrador en ese comercio | No aplica a esta acción si está autenticado |
| Miembro Administrador | Ver inventario y ventas de su comercio | Solo recursos del comercio correspondiente | Acceso denegado |
| Miembro Empleado | Ver inventario y ventas de su comercio | Solo recursos del comercio correspondiente | Acceso denegado |
| Administrador | Crear/editar/desactivar productos | Solo en su comercio | Acceso denegado |
| Empleado | Crear/editar/desactivar productos | No autorizado | Acceso denegado |
| Administrador o Empleado | Registrar entradas, ajustes y ventas | Solo en su comercio | Acceso denegado |
| Administrador | Anular venta con motivo | Solo ventas confirmadas de su comercio | Acceso denegado |
| Empleado | Anular venta | No autorizado | Acceso denegado |
| Administrador | Generar invitación para Empleado | Solo en su comercio | Acceso denegado |
| Empleado | Generar invitación | No autorizado | Acceso denegado |
| Destinatario autenticado | Aceptar invitación | Debe coincidir la identidad destinataria y estar vigente/no usada | Rechazo sin incorporar membresía |
| Integrante de otro comercio | Cualquier dato u operación del comercio ajeno | Ningún permiso por pertenecer a otro negocio | Acceso denegado sin revelar el recurso |

- **Propuesto, no confirmado:** no ofrecer en el MVP cambio arbitrario de roles, transferencia de titularidad ni baja/reactivación de miembros, porque no se acordaron flujos para ellos. El rol Administrador inicial existe al crear el comercio; las invitaciones incorporan Empleados. Cualquier ampliación de administración de miembros requiere decisión explícita.
- **Pendiente no bloqueante:** presentación HTTP exacta de errores de autorización y comportamiento al intentar seleccionar un comercio no permitido; el resultado del producto debe ser denegación segura y clara.

## 4. Flujos principales

Se mantienen los **cuatro flujos aceptados**. **F-03 es el flujo de valor central**, y F-01/F-02 son sus prerrequisitos. Los ejemplos siguientes son ficticios.

### F-01 · Crear un comercio e incorporar empleados

- **Prioridad:** imprescindible. **Estado: Confirmado.**
- **Actor y objetivo:** una persona autenticada crea su comercio y suma un empleado autorizado.
- **Condición inicial:** sesión Google válida; el usuario puede no pertenecer todavía a ningún comercio.
- **Pasos:** crea el comercio `Comercial Demo`; queda como Administrador; desde la sección de empleados indica `lucia@ejemplo.com`; recibe un enlace de invitación para compartir manualmente. Lucía abre el enlace, inicia sesión con ese correo Google y acepta. El comercio aparece entre los que puede seleccionar.
- **Datos:** nombre del comercio; correo de destinatario; identidad autenticada del emisor y receptor; rol Empleado al aceptar.
- **Resultado visible/persistido:** nuevo comercio y membresía administrativa; invitación vigente; al aceptarse, membresía de empleado asociada a ese comercio.
- **Validación/error:** enlace vencido, ya usado o cuenta distinta → no se crea la membresía, se muestra una explicación y se puede pedir nueva invitación al administrador.
- **Acceso denegado:** un Empleado intenta generar invitación → se rechaza; un usuario ajeno intenta consultar empleados → se rechaza.
- **Relaciones:** RN-09, RN-11, RN-12, RN-18 a RN-21; CA-01, CA-02, CA-03, CA-12.

### F-02 · Crear productos y controlar inventario

- **Prioridad:** imprescindible. **Estado: Confirmado.**
- **Actor y objetivo:** Administrador crea el catálogo; Administrador o Empleado registran operaciones de stock permitidas.
- **Condición inicial:** pertenencia a comercio activo y permiso requerido.
- **Pasos:** administrador crea `Mouse inalámbrico`, código `MOU-001`, precio `12500,00 ARS` y stock inicial de 20 unidades. StockPilot deja registrado el movimiento inicial. Luego un empleado registra una **entrada** de 10; posteriormente cuenta 27 unidades físicamente e indica un **ajuste** con motivo `Diferencia en conteo`.
- **Datos:** producto simple, identificador/código, precio y estado; cantidad inicial entera; entrada con cantidad; ajuste con cantidad física real y motivo.
- **Resultado visible/persistido:** stock después de la entrada = 30; después del ajuste = 27; el historial permite entender el saldo y los responsables. El administrador puede editar datos del producto y desactivarlo para nuevas ventas sin perder historial.
- **Validación/error:** cantidades inválidas o ajuste sin motivo → operación rechazada; ningún saldo se modifica. Producto de otro comercio → acceso denegado; empleado que intenta desactivarlo → acceso denegado.
- **Relaciones:** RN-03, RN-04, RN-07, RN-10, RN-13, RN-15, RN-22; CA-04, CA-05, CA-06, CA-11.

### F-03 · Registrar una venta con actualización conjunta del inventario (central)

- **Prioridad:** imprescindible. **Estado: Confirmado.**
- **Actor y objetivo:** Administrador o Empleado vende uno o varios productos del comercio seleccionado y conserva el importe y método de pago declarado.
- **Condición inicial:** sesión y pertenencia autorizadas; productos activos con stock disponible.
- **Pasos:** el empleado agrega 2 unidades de `Mouse inalámbrico` a precio unitario `12500,00 ARS`; selecciona **efectivo**, **tarjeta** o **transferencia** (solo uno); confirma. El sistema valida existencias y conserva venta y movimientos juntos.
- **Datos:** productos, cantidades enteras, precios del catálogo al momento de confirmar, importe total y un medio de pago.
- **Resultado visible/persistido:** venta `CONFIRMADA` por `25000,00 ARS`, asociada al comercio y responsable; dos unidades descontadas del stock (si había 27, quedan 25). Tras recargar la vista persisten el detalle de venta, el saldo y el movimiento.
- **Validación/error:** si solo hay 1 unidad y se solicitan 2, no se registra venta ni se altera el stock; se indica qué producto requiere corrección. Si falta medio de pago o la selección contiene un producto inactivo, tampoco se confirma.
- **Concurrencia:** ante dos ventas simultáneas de las últimas existencias, no pueden confirmarse ambas si consumen más unidades que las disponibles.
- **Acceso denegado:** usuario de otro comercio que intenta registrar la venta para ese inventario → operación rechazada.
- **Relaciones:** RN-01, RN-02, RN-05, RN-06, RN-14, RN-17, RN-23; CA-07 a CA-10, CA-13.

### F-04 · Consultar y anular una venta

- **Prioridad:** imprescindible. **Estado: Confirmado.**
- **Actor y objetivo:** miembros consultan ventas históricas; Administrador revierte una venta completa registrada erróneamente.
- **Condición inicial:** existe una venta confirmada del comercio activo.
- **Pasos:** administrador abre la venta de 2 unidades de `Mouse inalámbrico`, indica el motivo `Venta duplicada` y confirma la anulación.
- **Resultado visible/persistido:** venta pasa de `CONFIRMADA` a `ANULADA`, conserva detalle/precios/medio de pago; se registra un movimiento de restitución de 2 unidades por producto y el stock aumenta en esa cantidad. Si previamente había 25, vuelve a 27. El motivo y responsable de anulación quedan consultables.
- **Validación/error:** no puede anularse por segunda vez; anulación sin motivo rechazada; el empleado no puede anular; un usuario de otro comercio no puede consultar ni anular esa venta.
- **Aclaración:** el método de pago era informativo. La anulación **no procesa un reembolso ni revierte un cobro externo**.
- **Relaciones:** RN-08, RN-09, RN-16; CA-14 a CA-17.

## 5. Alcance inicial

**Estado del conjunto:** **MVP aceptado**. El dashboard queda como mejora deseable y simplificable, no como un quinto flujo obligatorio.

| Prioridad | Función/resultado | Flujo | Motivo | Estado |
|---|---|---|---|---|
| MVP imprescindible | Inicio de sesión Google y sesión backend | F-01 a F-04 | Identidad verificable | Confirmado |
| MVP imprescindible | Alta autónoma de comercio; membresías y selector de comercio activo | F-01 | Operación multiempresa | Confirmado |
| MVP imprescindible | Invitaciones manuales por enlace, destinatario específico, un uso y vencimiento | F-01 | Incorporar empleados sin email externo | Confirmado |
| MVP imprescindible | Autorización por rol y separación de datos por comercio | Todos | Evitar acceso cruzado | Confirmado |
| MVP imprescindible | Catálogo de productos simples; creación/edición/desactivación por administrador | F-02 | Base de inventario y ventas | Confirmado |
| MVP imprescindible | Stock inicial en alta de producto y movimiento correspondiente | F-02 | Carga inicial trazable | Confirmado |
| MVP imprescindible | Entradas y ajustes con conteo real, motivo y responsable; consulta de historial | F-02 | Saldo explicable | Confirmado |
| MVP imprescindible | Venta de uno o varios productos, precio histórico, total ARS y **un medio de pago** | F-03 | Flujo comercial principal | Confirmado |
| MVP imprescindible | Descuento de stock coherente y protección ante insuficiencia/concurrencia | F-03 | Integridad de operación | Confirmado |
| MVP imprescindible | Consulta de ventas y anulación total por administrador con motivo y reintegro | F-04 | Corrección auditada | Confirmado |
| Deseable simplificable | Dashboard básico con existencias y resumen simple de ventas | F-02/F-03 | Presentación portfolio; no debe retrasar flujos principales | Propuesto dentro del enfoque aceptado, **no imprescindible** |

**Exclusiones explícitas del MVP**

- Procesar cobros reales, pagos bancarios, pasarelas de pago, reembolsos automáticos, conciliación y estados de deuda.
- Facturación fiscal, comprobantes tributarios o integración con autoridades fiscales.
- Pagos divididos entre varios medios dentro de una misma venta.
- Variantes por talle/color/presentación, lotes, números de serie o unidades fraccionarias.
- Múltiples sucursales y depósitos, transferencias entre ubicaciones.
- Proveedores, órdenes de compra, compras automatizadas y gestión completa de ventas/facturación.
- Correos automáticos de invitación, notificaciones externas y carga de archivos/imagenes como dependencia del MVP.
- Informes avanzados, proyecciones financieras, integraciones de terceros no indispensables.
- Administración global de todos los comercios o soporte con lectura privilegiada de inventarios ajenos.

**Fase posterior, sin compromiso de implementación**

- **Pagos combinados — Confirmado como visión posterior:** una venta podrá dividir el total entre varios medios, por ejemplo `40000,00 ARS` en efectivo + `60000,00 ARS` en tarjeta para un total de `100000,00 ARS`. Las partes deberán sumar exactamente el total. No se implementa en el MVP.
- Alertas de stock mínimo, proveedores/compras, reportes avanzados, variantes, códigos de barras, sucursales/depósitos. **Propuestos** como oportunidades; no aprobados como próximos hitos.
- Potenciales mejoras de administración de usuarios, si la demostración real lo justifica; sin compromiso.

**Orden por valor/dependencias del producto** (no es backlog técnico): identificar comercio y miembros → disponer de productos y existencias → completar venta y movimiento → consultar/anular venta → pulir experiencia visual y dashboard simplificado. Los cuatro flujos tienen aceptación conjunta, aunque se construyan incrementalmente.

**Definición de MVP terminado:** los escenarios de §11 se observan funcionando, especialmente creación e invitación, stock inicial y ajustes, venta sin sobreventa, precios históricos, anulación, roles y separación entre comercios. Los casos relevantes deben persistir tras recargar; el flujo debe ser operable desde interfaces comprensibles en desktop y móvil.

**Evidencia para decidir el siguiente objetivo:** observar a una persona completar una venta y corregir un stock sin explicación externa, detectar pasos confusos, verificar si aparecen intentos reales de dividir pagos o consultar reposición. No se inventa un umbral ni una obligación de ampliar el producto.

## 6. Datos y reglas de negocio

### Entidades a nivel de negocio

| Entidad | Para qué existe | Información relevante | Propiedad / relación | Ejemplo ficticio |
|---|---|---|---|---|
| Usuario | Identificar persona autenticada | Identidad Google estable, correo verificado para invitación | Puede integrar varios comercios | `lucia@ejemplo.com` |
| Comercio | Límite de propiedad de datos | Nombre, identificador | Creado por un usuario Administrador | `Comercial Demo` |
| Membresía | Relacionar usuario, comercio y rol | Usuario, comercio, Administrador/Empleado | Por comercio; rol contextual | Lucía / Comercial Demo / Empleado |
| Invitación | Incorporar empleados | Comercio, destinatario, enlace no adivinable, vigencia, estado | Creada por administrador; aceptada por destinatario | Invitación a `lucia@ejemplo.com` |
| Producto | Ofrecer artículos con precio y existencias | Código, nombre, precio ARS, estado activo/inactivo, stock actual | Solo comercio propietario | `MOU-001`, Mouse inalámbrico |
| Movimiento de inventario | Explicar variaciones del stock | Producto, tipo, diferencia, resultado, motivo cuando corresponde, actor, referencia de origen | Producto/comercio | Entrada +10; ajuste -3 |
| Venta | Conservar la operación comercial | Comercio, actor, fecha, estado, total ARS, medio de pago | Solo comercio propietario | Venta de `25000,00 ARS` en efectivo |
| Ítem de venta | Conservar detalle histórico | Producto de origen, cantidad entera, precio unitario histórico, subtotal | Pertenece a una venta | 2 × `12500,00 ARS` |
| Anulación | Justificar reversión completa | Venta, motivo, responsable, momento y restituciones | Misma venta/comercio | `Venta duplicada` |

Estos datos expresan el dominio; **no constituyen un esquema SQL ni prescriben tablas, endpoints o clases**. Los datos de muestra son ficticios.

### Reglas de negocio verificables

| ID | Regla | Ejemplo válido | Rechazo o límite | Flujo | Estado |
|---|---|---|---|---|---|
| RN-01 | Confirmar una venta registra el negocio y los descuentos de inventario como una sola operación coherente. | Venta 2: se guarda y baja de 10 a 8 | No se permite venta guardada sin descontar el stock | F-03 | Confirmado |
| RN-02 | No vender más de lo disponible. | Hay 10, se venden 2 | Hay 1, se solicitan 2 → no hay venta ni descuento | F-03 | Confirmado |
| RN-03 | Cada movimiento conserva tipo, cantidades, operación relacionada y responsable. | Entrada +10 por empleado | No perder quién produjo un ajuste | F-02–F-04 | Confirmado |
| RN-04 | Un ajuste corrige el inventario según una cantidad física real. | De 30 a 27, ajuste -3 | Cantidad física negativa → rechazar | F-02 | Confirmado |
| RN-05 | El precio unitario usado en una venta queda fijo en su historial. | Venta a 12500; catálogo luego 14000; venta sigue 12500 | Reescritura retroactiva del total | F-03/F-04 | Confirmado |
| RN-06 | Ventas concurrentes no consumen dos veces el mismo stock. | Solo una operación consume la última unidad | Dos ventas confirmadas dejando saldo negativo | F-03 | Confirmado |
| RN-07 | Ajuste por cantidad contada requiere motivo obligatorio y guarda diferencia y responsable. | 15 → 12, `Tres unidades dañadas` | Motivo vacío → no se modifica | F-02 | Confirmado |
| RN-08 | Anulación total conserva la venta y devuelve todas sus unidades mediante movimientos de reversión. | Venta 2 anulada → +2 de vuelta | Eliminación silenciosa del historial | F-04 | Confirmado |
| RN-09 | Solo Administrador del comercio puede anular ventas. | Administrador anula en su comercio | Empleado intenta anular → denegado | F-04 | Confirmado |
| RN-10 | Productos sin variantes, con existencias en unidades enteras. | 4 unidades | 4,5 unidades → inválido | F-02/F-03 | Confirmado |
| RN-11 | Usuario puede pertenecer a varios comercios con roles independientes. | Admin A / Empleado B | Rol de A aplicado automáticamente a B | Todos | Confirmado |
| RN-12 | Invitaciones manuales por enlace ligadas al destinatario, un uso y vencimiento. | Cuenta invitada acepta una vez | Otra cuenta, enlace usado o vencido → rechazado | F-01 | Confirmado |
| RN-13 | Producto permite stock inicial; se registra el movimiento de inicio. | Alta con 20 unidades → saldo 20 y origen visible | Stock inicial negativo → rechazado | F-02 | Confirmado |
| RN-14 | Una venta tiene exactamente un medio de pago declarado: efectivo, tarjeta o transferencia. | Total 25000 en tarjeta | Dividir 10000 efectivo + 15000 tarjeta no disponible en MVP | F-03 | Confirmado |
| RN-15 | Producto desactivado deja de poder venderse, sin perder historial. | Antiguas ventas consultables | Nueva venta del inactivo → rechazada | F-02/F-03 | Confirmado |
| RN-16 | La anulación exige motivo y solo se realiza una vez. | Confirmada → Anulada con `Venta duplicada` | Anulada → segunda anulación o motivo vacío, rechazado | F-04 | Confirmado |
| RN-17 | Toda la aplicación usa ARS, sin conversión, hasta dos decimales para importes. | `12500,50 ARS` | Precio/total en otra moneda | F-02/F-03 | Confirmado |
| RN-18 | Usuario Google autenticado puede crear su propio comercio y ser su primer Administrador. | Usuario crea `Comercial Demo` | Usuario anónimo crea negocio | F-01 | Confirmado |
| RN-19 | Una invitación a empleados otorga rol Empleado, sin control del rol desde datos arbitrarios del cliente. | Destinatario acepta → Empleado | Invitado se autopromueve a Administrador | F-01 | Confirmado |
| RN-20 | Un recurso siempre pertenece a un comercio; pertenencia y rol se verifican en cada acción. | Miembro A accede a producto A | Miembro B lee producto A sin pertenecer a A | Todos | Confirmado |
| RN-21 | Cada persona elige comercio activo y el rol se determina para ese comercio. | Lucía cambia de A a B y usa permisos B | Conserva permisos administrativos de A al operar B | Todos | Confirmado |
| RN-22 | Los empleados pueden registrar entradas y ajustes, pero solo Administrador modifica/desactiva el catálogo. | Empleado ingresa 10 y registra conteo | Empleado edita precio del producto | F-02 | Confirmado |
| RN-23 | Una venta admite más de un producto, pero solo un medio de pago. | Mouse ×2 + Teclado ×1; tarjeta | Múltiples medios en la misma venta | F-03 | Confirmado |

**Estados y transiciones**

- **Venta:** `CONFIRMADA` → `ANULADA` por Administrador, con motivo y restitución. No hay retorno ni segunda anulación. Esos son los únicos estados de venta necesarios en el MVP.
- **Producto:** `ACTIVO` → `INACTIVO` por Administrador; los inactivos no se ofrecen para ventas nuevas y se conservan para historial. **Pendiente no bloqueante:** si el MVP incluirá reactivación `INACTIVO` → `ACTIVO`; propuesta: omitir hasta definir una necesidad real.
- **Invitación:** `PENDIENTE` → `ACEPTADA` o `VENCIDA` (incluido rechazo por uso previo). **Propuesto:** si se precisa un estado técnico `CONSUMIDA`, tratarlo como invitación ya aceptada, no como una nueva opción de negocio. Revocación administrativa: **Pendiente no bloqueante**, no requerida por el flujo aceptado. La redacción de «rechazo por uso previo» admite dos lecturas; su aclaración propuesta figura en P-14, sin cambiar el comportamiento aceptado (un enlace ya usado nunca crea otra membresía).
- **Membresía:** activa tras creación del comercio o aceptación de invitación. Desvinculación y suspensión: **no incluidas** por no haberse acordado su comportamiento.

**Límites y validaciones**

- Cantidades de stock y artículos: **enteros no negativos para saldos**; entradas y líneas de venta de cantidades positivas. Motivos obligatorios no pueden estar vacíos. Las validaciones deben ejecutarse también en el servidor.
- **Propuesto, no confirmado:** código de producto obligatorio y único dentro de cada comercio (puede repetirse entre comercios); nombres de comercio y producto no vacíos. Impacto: evita ambigüedad de catálogo sin imponer unicidad global.
- **Propuesto, no confirmado:** precios unitarios mayores que cero y hasta dos decimales; decidir si se admiten artículos gratuitos sin ampliar los medios de pago. Impacto: define validación del formulario y de la venta.
- **Cálculo confirmado en esencia:** subtotal de ítem = cantidad × precio unitario histórico; total de venta = suma de subtotales, todo en ARS. Dos decimales como máximo, sin conversiones ni impuestos desglosados. **Pendiente no bloqueante:** política precisa de redondeo para multiplicaciones/serialización, si llega a ser necesaria; propuesta: aritmética decimal exacta y redondeo al centavo de ARS.
- **Borrado:** no se elimina el historial de movimientos/ventas para implementar anulación o desactivación. Borrado físico de productos con operaciones, de comercios o de cuentas **no forma parte del MVP**; cualquier política definitiva requiere decisión posterior.
- **Fechas/horarios:** guardar momento de ventas, movimientos, invitaciones y anulaciones. **Pendiente no bloqueante:** zona de presentación; propuesta: almacenar instantes de forma inequívoca y presentarlos según una zona elegida consistentemente en interfaz. No inferir una zona específica del usuario.
- **Concurrencia:** ninguna confirmación puede dejar cantidades negativas por ventas simultáneas. En caso de disputa, una operación puede fallar con mensaje de stock actualizado; no fingir éxito. **Propuesto:** prevenir efectos duplicados si se reintenta la confirmación de una operación; mecanismo exacto a definir al preparar specs, sin alterar la regla de una venta por confirmación válida.
- **Archivos e imágenes:** no aplica al MVP porque el catálogo funciona con datos de texto, códigos y precios. No agregar subida de imágenes por defecto.
- **Datos sensibles:** identidad y correos de personas invitadas, información comercial y ventas requieren acceso por membresía. No utilizar ni versionar datos personales reales, secretos ni cobros reales para la demo.
- **Datos ficticios de demo:** dos comercios `Comercial Demo` y `Tienda Norte`; usuarios `lucia@ejemplo.com`, `pedro@ejemplo.com`; producto `MOU-001`; ventas y movimientos inventados. Estos ejemplos no crean un requisito de precarga automática.

## 7. Interfaz y experiencia

**Intención confirmada:** StockPilot debe verse profesional, moderno, intuitivo y agradable, con experiencia cuidada tanto para visitantes del portfolio como para quienes realizan operaciones repetidas. **El diseño se realizará con el agente de desarrollo sobre React y Material UI; no se usará Claude Design/Artifacts ni un prototipo externo obligatorio.** No hay diseño visual final, marca gráfica, paleta ni referencia aprobada.

**Pantallas/vistas necesarias — Propuestas concretas para expresar los flujos aceptados**

| Vista | Acciones principales | Estados/UI importantes | Flujos |
|---|---|---|---|
| Entrada e inicio de sesión | Ingresar con Google | Sin sesión, cargando, fallo de autenticación | F-01 |
| Selección/creación de comercio | Crear negocio; elegir comercio activo | Sin comercios, uno/varios disponibles, error, acceso denegado | F-01 |
| Integrantes e invitaciones (admin) | Generar y copiar enlace para correo indicado; ver invitación | Enlace listo, pendiente, vencido/usado, permiso denegado | F-01 |
| Aceptación de invitación | Revisar comercio invitante y aceptar | Cuenta correcta, cuenta distinta, vencida/usada, éxito | F-01 |
| Productos/inventario | Buscar visualmente o consultar productos, stock, estado; admin crea/edita/desactiva | Lista vacía, carga, sin resultados, producto inactivo, validación | F-02 |
| Entradas y ajustes | Cargar entrada; conteo real y motivo; consultar movimientos | Validación de cantidad/motivo, confirmación, error y persistencia | F-02 |
| Registro de venta | Añadir ítems, editar cantidades, consultar stock, elegir pago, confirmar | Carrito vacío, stock insuficiente, producto inactivo, confirmación, error | F-03 |
| Historial/detalle de ventas | Consultar ventas; admin anula con motivo | Lista vacía, venta confirmada/anulada, denegado para anular | F-04 |
| Inicio/resumen (simplificable) | Acceder a acciones frecuentes y cifras básicas | Sin datos, carga, datos parciales | F-02/F-03 |

**Comportamiento UX deseado (concretar en la implementación, no como pantallas adicionales)**

- Comercio activo y rol fáciles de reconocer; cambio de comercio explícito, sin mezclar datos entre vistas.
- Registro de venta concentrado en pocos pasos: producto, cantidad, resumen total, medio de pago y confirmación. Mostrar stock disponible y advertencia de falta de unidades **antes** de intentar confirmar cuando sea posible; el servidor siempre valida.
- Importes legibles en ARS; cantidades enteras; historial comprensible para seguir qué pasó y quién lo hizo.
- Formularios con etiquetas, ayudas concisas, mensajes junto al campo, foco manejado tras errores y confirmación clara de operaciones que cambian inventario.
- Desactivación de producto y anulación identificadas como acciones relevantes; no confundir "anular venta" con "devolver dinero".
- Estados visibles: cargando, sin contenido, validación inválida, error de red/servidor, éxito y falta de permisos. En errores que no guardaron información, no comunicar una operación exitosa.
- Navegación por teclado, contraste legible, elementos accionables identificables, diseño adaptado a desktop y móvil; no suponer que una tabla extensa tendrá la misma presentación en pantallas pequeñas.
- Usar componentes consistentes de Material UI y evitar tableros con gráficos decorativos que dificulten registrar ventas.
- **Propuesto:** estética de SaaS empresarial sobria, tipografía clara, jerarquía visual consistente y feedback discreto. **Pendiente no bloqueante:** tema claro/oscuro, colores, branding y bocetos finales; el agente puede elaborar opciones y compararlas en revisiones visuales, sin introducir otra herramienta obligatoria.
- **Idioma propuesto:** español para MVP, con formatos monetarios ARS y fechas consistentes. Internacionalización multilingüe **no aplica al MVP** por no estar requerida; traducciones futuras no están comprometidas.

## 8. Integraciones y operación

- **Integración necesaria confirmada:** Google OpenID Connect para autenticación. La configuración real del proveedor, credenciales y dominios autorizados se resolverá después y fuera de este documento. Deben contemplarse fallos o cancelación de autenticación con un estado de error comprensible.
- **Invitaciones:** los enlaces se comparten manualmente; **no** se contrata ni integra un proveedor de correo en el MVP. Si el invitado no puede autenticarse o el enlace ya no es válido, no adquiere membresía.
- **Medios de pago:** efectivo, tarjeta y transferencia son datos declarativos de ventas; **no hay integración** con bancos, terminales ni pasarelas; por tanto no se valida recepción efectiva del dinero.
- **Operación inicial:** entorno local/demostrativo, con PostgreSQL en contenedores, backend y cliente según §9. Ningún negocio real necesita estar conectado para validar la demo.
- **Despliegue público de la app:** por definir; no hay proveedor, dominio ni gasto autorizados. El código sí se planifica público en GitHub.
- **Volumen y concurrencia:** no hay cifras confirmadas. Sí existe requisito funcional de consistencia para dos empleados operando simultáneamente sobre las últimas unidades de un producto. No prometer cargas masivas no acordadas.
- **Presupuesto/servicios de pago:** por definir; no agregar servicios pagos por defecto.
- **Respaldo/retención de datos en producción:** no aplica todavía como política operativa, porque no se ha acordado una puesta en producción con comercios reales. Antes de habilitar ese uso debe decidirse preservación/recuperación y privacidad; no inventar períodos legales.
- **Privacidad y repositorio público:** publicar código y datos de demostración **ficticios**, nunca sesiones, claves OIDC, tokens de invitación reales, datos de clientes/empleados reales ni bases de datos comerciales. La demo no necesita tarjetas ni datos bancarios.
- **Operación ante fallo:** error al persistir una venta o un ajuste no debe mostrarse como operación exitosa. El sistema debe conservar el saldo anterior si la operación se rechaza y permitir al usuario revisar el estado actual.

## 9. Base técnica ya acordada

Este bloque refleja los **defaults técnicos y de proceso confirmados antes de implementar**; su presencia no significa que las herramientas o carpetas ya existan.

- **Repositorio:** monorepo con `server/`, `client/` y `plantilla/` local; `e2e/` cuando corresponda. Un Git en la raíz. El archivo completado es `PROJECT_CONTEXT.md` en la raíz, **fuera de `plantilla/`**.
- **Separación de kit y producto:** `plantilla/` mantiene formularios y recursos genéricos exclusivamente locales y excluidos de Git. El contexto y documentos del producto (`AGENTS.md`, README, `docs/`) son autosuficientes y se versionan en la raíz.
- **Backend:** Java 21 LTS, Maven Wrapper, Spring Boot GA mantenido y compatible; Spring MVC, JPA, Validation, Security, OAuth2 Client, Actuator y Flyway. Las versiones reales y dependencias deben verificarse en el repositorio.
- **Base de datos:** PostgreSQL en contenedores, recomendado major 18 si es compatible; fijar patch efectivo y usar la misma versión efectiva en desarrollo, integración y E2E. Migraciones con Flyway desde el inicio; Hibernate valida el esquema.
- **Frontend:** React + TypeScript estricto + Vite; React Router, Material UI/Emotion, TanStack Query y `fetch` centralizado. Node 24 LTS como punto de partida sujeto a verificación de engines.
- **Formularios de negocio:** usar React Hook Form, Zod y resolvers donde corresponda: productos, inventario, venta, comercio/invitaciones/anulación.
- **Autenticación:** Google OIDC, sesión en backend, CSRF y autorización comprobada en servidor. No almacenar tokens de acceso en `localStorage`.
- **Contenedores:** Docker Compose V2 para `db`, `server`, `client` y runners de compilación y pruebas; el host puede servir al IDE, pero debe existir camino containerizado.
- **Calidad:** unitarios backend/frontend, integración PostgreSQL con Testcontainers, E2E con Playwright y contrato OpenAPI. Los criterios de §11 son referencia de producto para esos tests.
- **Preparación técnica posterior:** con un modelo de frontera, GPT-6.1 Sol mediante Codex u Opus 5.5 mediante Claude Code, en esfuerzo alto según disponibilidad efectiva; revisión cruzada recomendable y comprobación de checklist antes del traspaso a Junie Lite en IntelliJ IDEA con AIR. La preparación M0 se organiza en cuatro PRs por defecto según el kit, salvo ajuste justificado.
- **Interfaz:** el diseño final se realiza directamente en el proyecto con los agentes y validaciones visuales; **sin Claude Design/Artifacts**, sin incorporar un prototipo externo obligatorio, sin cambiar React/Material UI.
- **GitHub:** repositorio público y licencia MIT por defecto; ruleset inicial y CI responsable con el uso de la capa gratuita. Nombre/owner y titular de licencia por confirmar.
- **Instrucciones de agentes y proceso:** `AGENTS.md` como fuente de instrucciones, `CLAUDE.md` que lo importe; preparación con specs y traspaso; una tarea/PR en vuelo y revisión separada de implementación, siguiendo la política del kit. ROADMAP/BACKLOG/STATUS se producen después, sin convertir este contexto en backlog técnico.
- **Crecimiento:** los objetivos futuros se proponen y aceptan por separado. No incorporar pagos combinados ni otros diferidos solo porque figuran en visión posterior.
- **No se declara instalada ni probada ninguna herramienta, scaffold, CI, despliegue o integración por el mero hecho de mencionarla aquí.**

## 10. Estado del scaffold y herramientas

**Situación:** conversación de definición de producto; **no hubo inspección del repositorio ni validación de entorno**. Todos los elementos siguientes requieren comprobación posterior.

**Actualización 2026-10-12 (v1.1):** el inventario efectivo de herramientas, scaffolds y versiones se registra en `docs/SETUP.md`, y el avance verificable de la preparación en `docs/HANDOFF.md`. El cuadro siguiente conserva el estado de conocimiento al definir el producto; no se duplica aquí el estado técnico vivo.

| Elemento | Estado de conocimiento | Resolución posterior |
|---|---|---|
| `server/` de Spring Initializr | **Por verificar en el repositorio** | Dueño genera; agente de frontera inventaría y conserva |
| Java/Boot/Maven Wrapper, package y dependencias | **Por verificar en el repositorio** | Registrar versiones y compatibilidad efectivas |
| `client/`, React/Vite/Node y lockfile | **Por verificar en el repositorio** | Dueño genera; agente contrasta engines y dependencias |
| Esquema PostgreSQL/Flyway | **Por verificar en el repositorio** | Definir migraciones al preparar el código, según las reglas aceptadas |
| Git, ramas, GitHub remoto | **Por verificar en el repositorio** | Confirmar nombre/owner antes de publicar; licencia MIT por defecto |
| Git Bash, GitHub CLI, Java, Node del host | **Por verificar en el entorno** | Comprobar, sin asumir instalación previa |
| Docker Engine/Desktop y Compose V2 | **Por verificar en el entorno** | Validar contenedores Linux y runners |
| Google OAuth real y sesión | **Por verificar en el entorno** | Configurar credenciales por canal seguro, ejecutar prueba real separada |
| Codex / Claude Code, modelo y esfuerzo | **Por verificar en la herramienta** | Seleccionar modelo disponible para preparación; no afirmar versiones instaladas |
| IntelliJ IDEA, AIR y Junie Lite | **Por verificar en el entorno** | Comprobar alcance real sobre raíz al traspasar |
| `plantilla/` local y genérica | **Por verificar en el repositorio** | Copiar luego; excluir de Git sin modificar el formulario |
| `PROJECT_CONTEXT.md` en la raíz | **Por verificar en el repositorio** | Copiar **este archivo** a la raíz; no sobreescribir `plantilla/PROJECT_CONTEXT.md` |
| CI, OpenAPI, tests, `docs/HANDOFF.md` | **Por verificar en el repositorio** | Preparar y validar con evidencia real |
| Context7/web/accesos externos del agente | **Por verificar en el entorno** | Registrar capacidades reales y limitaciones |

- Archivos adicionales o código existente: **por verificar en el repositorio**; no suponer que ya existen.
- El kit y la plantilla adjunta son referencias de preparación, no pruebas de herramientas instaladas.
- La checklist de M0 y del traspaso se completará con resultados verificables, no mediante una declaración anticipada en este documento.

## 11. Aceptación del producto y dudas

Los siguientes criterios describen resultados observables del **MVP aceptado**. No implican que estén ya implementados ni testeados.

| ID | Flujo/regla | Dado | Cuando | Entonces | Estado |
|---|---|---|---|---|---|
| CA-01 | F-01 / RN-18 | Usuario Google autenticado sin comercios | Crea `Comercial Demo` | Ve el comercio y figura como Administrador; persiste al recargar | Confirmado |
| CA-02 | F-01 / RN-12, RN-19 | Administrador crea invitación para `lucia@ejemplo.com` | Lucía abre el enlace con esa identidad y acepta | Accede como Empleado solo a ese comercio; no necesita email automático | Confirmado |
| CA-03 | F-01 / RN-12 | Invitación vencida/usada o sesión de otra cuenta | Se intenta aceptar | No se crea membresía y se explica el rechazo | Confirmado |
| CA-04 | F-02 / RN-13 | Administrador del comercio sin el producto | Crea `MOU-001` con precio ARS y 20 unidades | Producto visible, saldo 20 y movimiento de inicio consultable; persiste al recargar | Confirmado |
| CA-05 | F-02 / RN-07 | Producto con 15 unidades | Empleado informa conteo real 12 y motivo válido | Saldo 12; movimiento -3 con motivo y empleado; persiste | Confirmado |
| CA-06 | F-02 / RN-07 | Producto con 15 unidades | Empleado intenta ajustar a 12 sin motivo | Se rechaza; el saldo sigue en 15 | Confirmado |
| CA-07 | F-03 / RN-01, RN-14 | Producto activo con 10 unidades | Miembro vende 2 a `12500,00 ARS` y selecciona tarjeta | Venta confirmada por `25000,00 ARS`; stock 8; venta y movimiento persisten tras recargar | Confirmado |
| CA-08 | F-03 / RN-02 | Producto con 1 unidad | Miembro intenta vender 2 | Mensaje de stock insuficiente; no se guarda venta ni movimiento; saldo sigue en 1 | Confirmado |
| CA-09 | F-03 / RN-06 | Solo 1 unidad disponible; dos empleados autorizados | Ambos intentan confirmar una venta de 1 a la vez | Como máximo una venta consume esa unidad; no hay stock negativo | Confirmado |
| CA-10 | F-03 / RN-05 | Venta confirmada a `12500,00 ARS` por unidad | Administrador cambia precio del catálogo a `14000,00 ARS` | El historial de la venta mantiene `12500,00 ARS` unitarios y total original | Confirmado |
| CA-11 | F-02 / RN-15, RN-22 | Producto activo y empleado | Empleado intenta desactivarlo; después administrador lo desactiva | Intento del empleado denegado; desactivación administrativa efectiva; ventas previas siguen visibles y no se permite nueva venta | Confirmado |
| CA-12 | F-01 / RN-20, RN-21 | Lucas es Administrador de Comercio A y Empleado de Comercio B | Cambia el comercio activo a B | Puede operar como Empleado en B, no anular ventas allí ni acceder a datos ajenos | Confirmado |
| CA-13 | Todos / RN-20 | Integrante de Comercio B conoce identificador de producto/venta de A | Intenta leer o modificar mediante la aplicación o petición al servidor | Acceso denegado sin divulgar datos de A | Confirmado |
| CA-14 | F-04 / RN-08, RN-16 | Venta confirmada de 2 unidades con stock actual 8 | Administrador indica `Venta duplicada` y anula | Estado ANULADA, movimiento de +2, saldo 10, detalle y motivo conservados tras recargar | Confirmado |
| CA-15 | F-04 / RN-09 | Empleado autorizado a vender | Intenta anular una venta de su comercio | Servidor deniega y venta/stock no cambian | Confirmado |
| CA-16 | F-04 / RN-16 | Venta ya anulada | Se intenta anular de nuevo | Se rechaza sin segundo reintegro | Confirmado |
| CA-17 | F-04 / RN-16 | Venta confirmada | Administrador intenta anular sin motivo | Se rechaza; no cambia estado ni stock | Confirmado |
| CA-18 | F-03 / RN-23 | Dos productos activos con stock y precio | Empleado los añade a la misma venta y elige efectivo | Se guarda una venta con dos líneas y un solo medio de pago; total igual a la suma de subtotales | Confirmado |
| CA-19 | F-01/F-02 | Usuario sin sesión o sin pertenencia al comercio | Intenta acceder al catálogo o generar entrada | No puede consultar ni modificar recursos privados | Confirmado |

**Errores especialmente importantes que deben evitarse**

- Venta grabada sin su descuento de stock, o descuento efectuado sin registrar venta.
- Stock negativo por dos ventas concurrentes.
- Anulación aplicada dos veces, sin motivo o por empleado.
- Acceso entre comercios por un identificador conocido o por cambiar de selector.
- Pérdida de precio histórico al editar el producto.
- Enlace de invitación reutilizable, vencido aceptado o aceptado desde identidad distinta.
- Mensaje de éxito para una operación que fue rechazada o cuya persistencia falló.

**Decisiones reservadas para el dueño:** ampliaciones de alcance, puesta en producción, datos reales, nuevos permisos/roles, integraciones externas y cambio del stack/visibilidad/licencia por defecto.

### Pendientes y propuestas (no reabrir el MVP sin motivo)

| ID | Cuestión | ¿Bloquea entender el MVP? | Propuesta e impacto | Responsable/siguiente acción |
|---|---|---|---|---|
| P-01 | Vencimiento exacto de invitaciones | No | Propuesta: 7 días desde su creación; cambia cuándo se requiere generar otra | Dueño valida en preparación |
| P-02 | Campos y unicidad del código de producto | No | Propuesta: obligatorio y único por comercio; evita confusiones en catálogo | Dueño/agent refinan specs |
| P-03 | Precio cero y límites de entrada | No | Propuesta: precio mayor que cero, cantidades enteras; decidir si existen productos gratuitos | Dueño valida antes de pruebas de límite |
| P-04 | Reactivación de productos inactivos | No | Propuesta: fuera del MVP hasta que haya un caso; afecta navegación del catálogo | Dueño confirma si aparece necesidad |
| P-05 | Zona horaria y formato preciso de fecha | No | Propuesta: conservar instantes coherentes y formato visible uniforme; evita fechas ambiguas | Preparación UX/técnica |
| P-06 | Diseño visual final, branding, tema | No | Propuesta: tema profesional de Material UI con revisión visual directa en la aplicación; sin Claude Design | Agente propone; dueño revisa si desea |
| P-07 | Dashboard básico | No | Propuesta: resumen simple sin analítica compleja; prescindible si retrasa los flujos | Priorizar por experiencia real |
| P-08 | Detalles de validación/cálculo ARS | No | Propuesta: cálculo decimal exacto con dos posiciones; preservar centavos | Preparación de specs/tests |
| P-09 | Reintentos y doble confirmación accidental | No | Propuesta: una confirmación lógica produce una sola venta; definir protección observable sin añadir infraestructura sin necesidad | Preparación de specs/tests |
| P-10 | Retirar miembros, transferir administración, revocar invitaciones | No | No agregar al MVP: comportamientos no acordados; ampliar solo con decisión nueva | Dueño, fase posterior eventual |
| P-11 | Nombre/owner del repositorio y titular MIT | No | **Resuelto 2026-10-12:** repo público `MatiasNicolasAcevedo/stockpilot`; titular MIT Matias Nicolas Acevedo | Dueño — cerrado |
| P-12 | Disponibilidad efectiva de herramientas/versiones y Google OAuth | No para intención; sí para ejecutar la preparación | **En curso:** herramientas y versiones comprobadas el 2026-10-12 (`docs/SETUP.md`); Google OAuth real pendiente de credenciales del dueño | Agente de frontera y dueño |
| P-13 | Hosting, presupuesto, respaldo para uso real | No | Mantener demo local; exigir decisión nueva antes de producción con datos reales | Dueño, si se despliega |
| P-14 | Redacción del estado de invitación ante reutilización (§6, «incluido rechazo por uso previo») | No | Propuesta: un intento de reutilizar una invitación `ACEPTADA` se rechaza y la invitación conserva `ACEPTADA`; `VENCIDA` aplica a una `PENDIENTE` cuyo plazo expiró. Impacto: modelo de estados y mensajes de la spec de invitaciones; el resultado de negocio (sin nueva membresía) no cambia | Dueño valida al especificar invitaciones (F-01) |

**Pendientes bloqueantes para entender el MVP:** **ninguno identificado** en el alcance aceptado. Una divergencia futura sobre permisos, anulación o transacciones sería una **nueva decisión de producto**, no licencia para inventar comportamiento.

**Control antes de preparación — sustentado por lo conversado, no por pruebas de código**

- [x] Problema, usuario y resultado del MVP concretos y aceptados.
- [x] Cuatro flujos, flujo central, exclusiones y crecimiento diferido definidos.
- [x] Roles, límites entre comercios, propiedad de datos y reglas críticas suficientemente descritos.
- [x] Ejemplos ficticios de éxito, validación/error, concurrencia y acceso denegado.
- [x] Confirmado/propuesto/pendiente distinguidos; sin decisiones bloqueantes conocidas.
- [x] Versiones/capacidades desconocidas indicadas por verificar; sin secretos.
- [ ] Código, Docker, Google real, CI, pruebas y handoff técnico: **pendientes de preparación y verificación**, no validados en esta conversación.

## 12. Cambios del contexto

| Versión / fecha | Sección o IDs | Cambio y motivo | Estado de aceptación | Impacto pendiente |
|---|---|---|---|---|
| **1.0 / fecha de aprobación no registrada** | §1–§11, F-01–F-04, RN-01–RN-23, CA-01–CA-19 | Contexto inicial específico de StockPilot: comercio multiempresa, roles por comercio, invitaciones, productos, movimientos, ventas, anulación y pruebas observables. Se reemplazó la cabecera del formulario genérico por la identidad del producto. | **MVP aceptado expresamente por el dueño del producto** | Preparación del repositorio y verificación del entorno; pendientes no bloqueantes P-01–P-13 |
| **1.0 / fecha de aprobación no registrada** | §5 / visión posterior | Pagos combinados registrados exclusivamente para una fase posterior; el MVP mantiene un único medio de pago por venta. | **Decisión de visión posterior confirmada**, implementación no autorizada | Evaluar solo tras observar necesidades del MVP |
| **1.0 / fecha de aprobación no registrada** | §1, §7, §9 | Se descarta el uso de Claude Design/Artifacts para evitar complejidad; el diseño se define/refina directamente con agentes en React/Material UI y revisión visual. | **Confirmado** | Calidad visual a validar durante implementación, sin exigir prototipo externo |
| **1.1 / 2026-10-12** | Cabecera, §1, §6 (invitación), §10, §11 (P-11, P-12, P-14) | Revisión de preparación (T-000, Opus 5.5 / Claude Code): ubicación real del archivo; repo `MatiasNicolasAcevedo/stockpilot` y titular MIT confirmados por el dueño en la sesión de preparación; referencia al inventario técnico vivo en `docs/` en lugar de duplicarlo; P-11 resuelto, P-12 actualizado; P-14 nuevo para aclarar una redacción ambigua de estados de invitación. Sin cambios de alcance, reglas RN, flujos ni criterios CA. | Repo/titular **confirmados por el dueño**; P-14 **propuesto** | P-14 se valida al especificar invitaciones |
| **1.2 / 2026-10-16** | Cabecera; continuidad de §1, §5, §9–§11 | El dueño informa que el nombre ya existe y decide frenar StockPilot antes del inicio de Junie. Autoriza completar la base funcionando/conectada, tests incluidos E2E y Swagger, consolidar kit y extraer/validar/publicar starter genérico para definir una app nueva y comenzar desde esa base. F-01…F-04, RN y CA quedan históricos; no se renombra ni se continúa el MVP. | **Pedido explícito del dueño**; sin evaluación jurídica de la marca | T-003 B/C conservan contrato técnico; D replantea explícitamente cierre/adopción y smoke Swagger; E evidencia/revisión/merge. Kit/starter fuera de T-003, después de M0 reconciliada; registrar detención antes de Junie. S-001 v1/ADR 0002 intactos; no se acredita ninguna prueba nueva por esta decisión |

Las próximas revisiones de intención deben registrarse aquí con su aceptación real y su efecto sobre flujos, reglas y criterios. Ajustes menores de trabajo dentro de un objetivo van al ROADMAP/BACKLOG cuando existan, sin introducirlos en este documento. El historial de cambios del kit genérico sigue separado del historial de StockPilot.

**Fin del contexto aceptado de StockPilot.**
