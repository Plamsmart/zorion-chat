# Recomendación de arquitectura: asistente agnóstico de canal

**Estado:** referencia de diseño — no implementada.
**Rama:** `zabal-develop` (no integrada en `main`).
**Modo de trabajo:** `INVESTIGATE` / `RECOMMEND` — este documento no modifica código,
esquema, migraciones ni configuración.
**Repositorio:** `zorion-chat` (proyecto Ekin).

## Leyenda

Cada afirmación de este documento está etiquetada para distinguir su naturaleza:

- **[HECHO OBSERVADO]** — verificado directamente en el código, el esquema o el
  historial de git del repositorio en el momento del análisis.
- **[REQUISITO CONFIRMADO]** — confirmado explícitamente por el propietario del
  proyecto en conversación, no inferido del código.
- **[RECOMENDACIÓN]** — propuesta de diseño de quien redacta este documento;
  no es una decisión tomada.
- **[PREGUNTA ABIERTA]** — decisión pendiente que requiere autoridad humana
  antes de poder avanzar; no se resuelve en este documento.
- **[DECISIÓN]** — decisión ya tomada por el propietario del proyecto, con
  fecha. Sustituye a la pregunta abierta correspondiente. No se rediscute sin
  evidencia nueva.

---

## 1. Contexto y alcance del análisis

**[HECHO OBSERVADO]** El repositorio implementa "Zorion Chat" (proyecto Ekin):
una aplicación Next.js 16 (App Router) con panel de administración
(`/admin`, protegido con Supabase Auth), un widget de chat web embebible, un
webhook de WhatsApp, y una integración vertical con AimHarder (reservas y
cancelaciones de clases de gimnasio). La persistencia es Supabase
(`bots`, `conversaciones`, `mensajes`, `conocimiento`, `aimharder_tokens`).

**[REQUISITO CONFIRMADO]** El canal definitivo (o combinación de canales) con
el que operará el asistente todavía no está decidido. Los candidatos
mencionados son WhatsApp, Instagram, la web de Ekin, o una combinación de
varios. **La web de Ekin es el único canal actualmente operativo
confirmado.** Ningún proveedor de mensajería (Twilio, Meta u otro) debe
tratarse como elegido.

**[REQUISITO CONFIRMADO]** Cada cliente final tendrá su propio panel y su
propio bot, aislados entre sí. El estado actual del repositorio corresponde a
una fase de desarrollo y pruebas previa a producción.

**Alcance de este documento:** producir una referencia arquitectónica
trazable del estado actual observado y de una dirección recomendada para
separar el núcleo del asistente de sus canales, sin comprometer ninguna
decisión de proveedor, canal o esquema. No se ha modificado ningún archivo de
código, esquema, migración o configuración como parte de este trabajo.

---

## 2. Arquitectura actual observada

**[HECHO OBSERVADO]** Los puntos de entrada del asistente son:

| Punto de entrada | Canal | Formato de entrada | Formato de salida |
|---|---|---|---|
| `src/app/api/chat/route.ts` | Web (widget) | JSON (`mensaje`, `bot_id`, `session_id`) | Stream de texto plano |
| `src/app/api/whatsapp/route.ts` | WhatsApp | `POST` form-data (`From`, `To`, `Body`); `GET` con `hub.challenge` | TwiML (XML) |

**[HECHO OBSERVADO]** Ambos puntos de entrada llaman directamente a las
mismas funciones de `src/lib/bot.ts`:

- `buscarBotActivoPorId` / `buscarBotActivoPorWhatsapp` — resolución del bot.
- `buscarOCrearConversacion` — resolución/creación de conversación por
  `(bot_id, canal, identificador)`.
- `obtenerHistorial`, `guardarMensaje` — historial de mensajes.
- `construirSystemPrompt`, `construirMensajesParaOpenAI` — construcción del
  contexto para OpenAI (config del bot + `conocimiento` + calendario
  AimHarder si está configurado).
- `detectarIntencionReserva` / `detectarIntencionCancelacion` y
  `procesarIntencionReserva` / `procesarIntencionCancelacion` — detección y
  ejecución de intención de reserva/cancelación contra AimHarder.

**[HECHO OBSERVADO]** No existe hoy una función única de entrada al núcleo
del asistente; cada adaptador de canal repite la misma secuencia de llamadas
a `bot.ts` con su propio formato de entrada/salida.

**[HECHO OBSERVADO]** `src/lib/aimharder.ts` mantiene estado en memoria a
nivel de módulo (`accessTokenActual`, `refreshTokenActual`, bandera de
bloqueo de refresco) y persiste tokens en la tabla `aimharder_tokens`, cuya
única fila tiene `id` fijo (`"ekin"`).

**[HECHO OBSERVADO]** La tabla `bots` no tiene ningún campo de propiedad
(`owner_id`/`tenant_id`). Las server actions de administración
(`src/lib/actions/bots.ts`) usan `createAdminClient()` (rol de servicio, que
evita RLS) sin filtrar por propietario. Las políticas RLS de `bots`,
`conocimiento`, `conversaciones` y `mensajes` conceden acceso total al rol
`authenticated` (`using (true)`).

---

## 3. Mapa objetivo de las cinco capas

**[RECOMENDACIÓN]**

```
Adaptadores de canal (web · WhatsApp · Instagram · otros, según se decida)
        │  normalizan → { botId, canal, identificadorExterno, mensajeEntrante }
        ▼
Núcleo del asistente (agnóstico de canal)
        │  - resuelve conversación e identidad de usuario
        │  - construye contexto (config del bot + conocimiento)
        │  - consulta el registro de capacidades verticales activas del bot
        │  - fallback: completion de OpenAI
        │  - persiste historial
        ▼
Capacidades verticales (plugins por bot)
        │  - AimHarder (reservas/cancelaciones) — hoy el único plugin
        │  - futuras capacidades, activables por bot
        ▼
Persistencia (Supabase) — con aislamiento por tenant en todo lo multi-cliente
```

El objetivo de este mapa es que añadir o retirar un canal, o añadir una
nueva capacidad vertical para un cliente, sea un cambio de composición
(qué adaptador o qué plugin está activo), no un cambio en la lógica interna
del asistente.

---

## 4. Separación entre núcleo, canales, capacidades verticales, identidad y persistencia

### 4.1 Núcleo del asistente

**[HECHO OBSERVADO]** Parte de esta separación ya existe en `bot.ts`: la
resolución de conversación, el historial y la construcción del prompt son
funciones agnósticas de canal.

**[RECOMENDACIÓN]** Exponer una única función de entrada
(`procesarMensaje(botId, canal, identificadorExterno, mensaje)`) que
encapsule la secuencia completa (resolver conversación → construir contexto
→ consultar capacidades activas → completar con OpenAI → persistir), de
forma que los adaptadores de canal solo traduzcan formato y llamen a esa
única función.

### 4.2 Integraciones de canal

**[RECOMENDACIÓN]** Cada canal se reduce a un adaptador fino responsable
únicamente de: (a) verificar/autenticar la petición según el protocolo del
proveedor, (b) traducir el payload nativo a la forma normalizada de entrada
del núcleo, y (c) formatear la respuesta del núcleo al protocolo de salida
del proveedor (TwiML, JSON de Graph API, stream de texto, u otro).

### 4.3 Capacidades verticales

**[RECOMENDACIÓN]** Extraer la lógica de AimHarder de `bot.ts` a un módulo
de capacidad con un contrato explícito, por ejemplo:

- `detectarIntencion(mensaje, historial) → boolean`
- `procesar(mensaje, conversacion) → respuesta | null`

El núcleo consultaría un registro de capacidades activas **por bot**, en
lugar de invocar AimHarder directamente y de forma incondicional para
cualquier bot de la plataforma.

### 4.4 Identidad y continuidad del usuario

**[HECHO OBSERVADO]** `conversaciones.identificador` almacena el
identificador nativo del canal (teléfono en WhatsApp, `session_id` en web).
No existe ninguna entidad que relacione a la misma persona a través de
distintos canales.

**[PREGUNTA ABIERTA]** ¿Se requiere continuidad de identidad entre canales
(reconocer a la misma persona si escribe por varios canales) o el historial
separado por canal es aceptable? Ver sección 8.

### 4.5 Persistencia

**[HECHO OBSERVADO]** El esquema actual (`supabase/schema.sql`) modela
`bots`, `conversaciones`, `mensajes`, `conocimiento` y `aimharder_tokens` sin
ningún concepto de propietario/tenant a nivel de fila.

**[RECOMENDACIÓN]** Cualquier evolución de esquema para aislamiento
multi-tenant (sección 7) y para identidad cruzada de canal (sección 4.4)
debería revisarse en conjunto, ya que ambas añaden una entidad de alcance
transversal (`tenant`/`usuario`) sobre el mismo modelo actual.

---

## 5. Deuda técnica confirmada: webhook híbrido Twilio/Meta

**[HECHO OBSERVADO]** `src/app/api/whatsapp/route.ts` mezcla dos protocolos
de webhook de proveedores distintos y no intercambiables:

- El método `GET` verifica `hub.challenge`, patrón de verificación de
  **Meta Graph API** (WhatsApp Cloud API e Instagram Messaging comparten esta
  infraestructura de webhooks).
- El método `POST` procesa form-data (`From`, `To`, `Body`) y responde en
  TwiML, patrón propio de **Twilio**. El propio `.env.example` del repositorio
  solo define variables de Twilio (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
  `TWILIO_WHATSAPP_NUMBER`), marcadas como "reservado para uso futuro, no
  leído aún por la aplicación".

**[HECHO OBSERVADO]** El `POST` no valida ninguna firma de origen (no hay
verificación de `X-Twilio-Signature` ni de firma de Meta), por lo que hoy
cualquier origen puede invocar este endpoint con datos arbitrarios.

Esta mezcla se registra como deuda técnica confirmada. No se elimina ni se
resuelve ningún lado en esta fase, dado que el proveedor de WhatsApp (si lo
hay) no está decidido.

---

## 6. Problema de activación global de AimHarder

**[HECHO OBSERVADO]** `aimharderEstaConfigurado()` en `src/lib/bot.ts`
comprueba la existencia de una única fila en `aimharder_tokens` con `id`
fijo (`"ekin"`), y esa comprobación activa la lógica de reserva/cancelación
para **cualquier bot** de la plataforma que reciba un mensaje, no solo para
el bot al que pertenece la integración.

**Consecuencia:** en cuanto exista una integración de AimHarder activa para
un cliente, todos los demás bots de otros clientes heredarían el flujo de
reserva de clases de gimnasio, aunque no tengan relación con esa integración.

**[RECOMENDACIÓN]** Este problema se resuelve como consecuencia directa de
la separación descrita en 4.3: la activación de la capacidad debe
consultarse por `bot_id`, y `aimharder_tokens` debería quedar indexada por
`bot_id` en lugar de por un identificador de cliente fijo.

---

## 7. Requisito confirmado de aislamiento multi-tenant

**[REQUISITO CONFIRMADO]** Cada cliente tendrá su propio panel y su propio
bot, de forma aislada entre clientes.

**[HECHO OBSERVADO]** El estado actual del código no soporta esto:

- `bots` no tiene `owner_id`/`tenant_id`.
- Las server actions de administración usan el rol de servicio sin filtrar
  por propietario.
- Las políticas RLS de `bots`, `conocimiento`, `conversaciones` y `mensajes`
  conceden acceso total (`using (true)`) a cualquier rol `authenticated`.
- El cliente de navegador de Supabase (`src/lib/supabase/client.ts`) solo se
  usa hoy para login/logout, no para consultas de datos directas — por lo
  que el riesgo de las políticas RLS abiertas es hoy latente, no explotado
  activamente, pero sería el único control si en el futuro se añade una
  consulta directa desde el navegador.

Esta es una brecha confirmada entre el estado actual y el objetivo de
producto, no una suposición. No se corrige en esta fase.

---

## 8. Decisiones todavía abiertas

**[DECISIÓN · 2026-07-30]** Canales de despliegue: **web + WhatsApp**. El
asistente debe comportarse por WhatsApp igual que por el widget web: el socio
escribe al número de Ekin y le responde el mismo asistente. Instagram queda
fuera de alcance. Sustituye a la pregunta abierta anterior sobre canal.

**[DECISIÓN · 2026-07-30]** Proveedor de WhatsApp: **Twilio**.

Razones, en orden de peso:

1. **Tiempo hasta la primera prueba real.** Partiendo de cero, Meta Cloud API
   directo exige Business Manager y verificación del negocio de Ekin antes de
   poder enviar un solo mensaje. El sandbox de Twilio permite probar desde un
   móvil propio sin verificación previa, mientras el core se corrige.
2. **Menor cambio de código.** El `POST` de `src/app/api/whatsapp/route.ts` ya
   responde TwiML y `twilio` ya figura en `package.json`.
3. La documentación de Twilio incluye un flujo guiado de alta que conecta la
   cuenta de Meta, crea la WABA y verifica el número.

**Coste aceptado:** Twilio aplica un margen por mensaje sobre la tarifa de
Meta. Irrelevante con un cliente y tráfico reactivo; material a escala con
mensajería proactiva.

**Condición de reversibilidad — vinculante.** Esta decisión solo es barata de
revertir si la limpieza del webhook híbrido (sección 5) produce un **adaptador
de canal** conforme a la sección 4.2, y no una simple eliminación de las líneas
de Meta. El núcleo no debe conocer al proveedor. Si se implementa sin esa
separación, la decisión deja de ser reversible y pasa a ser un compromiso
arquitectónico, lo que contradice la sección 4.1.

**Alcance del canal en esta fase: reactivo.** El socio inicia la conversación
y el asistente responde. Todo ello ocurre dentro de la ventana de atención al
cliente de 24 horas de WhatsApp, que no requiere plantillas aprobadas.

**[PREGUNTA ABIERTA]** Mensajería proactiva (recordatorios, anti-no-show,
reactivación de inactivos). Fuera de la ventana de 24 horas, WhatsApp solo
permite mensajes con plantilla aprobada previamente por Meta, facturados por
mensaje. Esto afecta a buena parte del backlog de producto y no es un problema
de implementación, sino de aprobación y de coste por mensaje. No se aborda en
esta fase, pero debe planificarse antes de prometer esas funciones a un
cliente.

**[PREGUNTA ABIERTA]** Continuidad de identidad entre canales: si la misma
persona escribe por varios canales, ¿debe reconocerse como el mismo usuario
o el historial separado por canal es aceptable? Condiciona si se necesita
una entidad `usuario`/`contacto` transversal (sección 4.4).

**[PREGUNTA ABIERTA]** Modelo de autenticación para el aislamiento
multi-tenant: por ejemplo, un usuario de Supabase Auth por cliente con
`tenant_id`, frente a otro esquema (API key por proyecto, organización con
múltiples usuarios, etc.). Condiciona el diseño de RLS y de las server
actions (sección 7).

**[PREGUNTA ABIERTA]** Alcance de las capacidades verticales más allá de
AimHarder: si se planean más integraciones por cliente, conviene decidir si
el "registro de capacidades" (sección 4.3) se diseña ahora de forma genérica
o se generaliza cuando aparezca la segunda integración real.

---

## 9. Riesgos y bloqueantes antes de producción

| Riesgo | Origen | Bloqueante para producción |
|---|---|---|
| Sin validación de firma en el webhook de WhatsApp | Sección 5 | Sí, si WhatsApp se confirma como canal |
| Activación global de AimHarder entre bots | Sección 6 | Sí, en cuanto haya un segundo bot con integración distinta |
| Sin aislamiento multi-tenant en esquema, RLS y server actions | Sección 7 | Sí, requisito confirmado de producto |
| Sin continuidad de identidad entre canales | Sección 4.4/8 | Solo si se confirma como requisito |
| Estado en memoria de tokens AimHarder no coordinado entre instancias | Sección 2 (hecho observado, no repetido en detalle aquí) | Depende del modelo de despliegue (serverless vs. proceso persistente) |

Ninguno de estos riesgos bloquea el trabajo de desarrollo/pruebas actual;
todos son bloqueantes identificados **antes de** un despliegue a producción
con clientes reales.

---

## 10. Orden recomendado de implementación

**[RECOMENDACIÓN]** Este orden minimiza trabajo desechable, dado que cada
paso no depende de decisiones aún no tomadas (canal, proveedor, continuidad
de identidad):

1. Extraer el núcleo del asistente a una única función de entrada agnóstica
   de canal (sección 4.1), sin cambiar el comportamiento observable.
2. Extraer AimHarder a un módulo de capacidad por bot (sección 4.3),
   resolviendo de paso el problema de activación global (sección 6).
3. Diseñar y aplicar el aislamiento multi-tenant en esquema, RLS y server
   actions (sección 7) — es un requisito confirmado, independiente de qué
   canal se elija.
4. Resolver las preguntas abiertas de canal/proveedor (sección 8) y
   construir el adaptador de canal correspondiente sobre el núcleo ya
   extraído.
5. Si se confirma el requisito de continuidad de identidad entre canales
   (sección 4.4), diseñar la entidad `usuario`/`contacto` transversal;
   en caso contrario, omitir este paso.

---

## 11. Fuera de alcance de esta fase

Explícitamente no se abordan en este documento ni en el trabajo asociado:

- Elección de canal o de proveedor de mensajería.
- Cualquier cambio de código, esquema, migración o configuración.
- Implementación del registro de capacidades o del núcleo unificado.
- Corrección de las políticas RLS o de las server actions de administración.
- Validación de firma del webhook de WhatsApp.
- Diseño detallado de la entidad de identidad cruzada de canal.
- Revisión de la interfaz de usuario del panel de administración.
