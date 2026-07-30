# Hallazgos de la API de AimHarder

Fuente: <https://aimharder.com/api_doc/aimharder/index.html> (apiDoc "API Pública de
AimHarder", v1.0.0, consultada el 2026-07-30).

Este documento contrasta la documentación oficial con la implementación actual en
`src/lib/aimharder.ts` y `src/lib/bot.ts`. Recoge únicamente lo verificable contra
la documentación; lo que requiere una captura real de la API queda marcado como
**pendiente de verificar**.

---

## 1. Defectos confirmados en el código actual

### 1.1 `plazasLibres` se evalúa a `NaN` — CRÍTICO

`ClaseAimharder` declara los campos `ocupation` y `coach`. **Ninguno de los dos
aparece en la respuesta documentada de `GET /calendar/:date_str`.**

Campos reales documentados:

```
schedule_id, time, name, description, duration, limit, waitlist_count,
cancelled, show_cancelled_class, class_id, class_color, staff_photo,
room_id, room_name, room_capacity, room_lattitude, room_longitude,
staff_id, staff_name, staff_gender, class_order, is_event,
class_show_staff, is_public
```

Consecuencia en `src/lib/bot.ts`:

```ts
plazasLibres: Math.max(clase.limit - clase.ocupation, 0),
// limit - undefined  ->  NaN
// Math.max(NaN, 0)   ->  NaN

entrenador: clase.coach ?? null,
// 'coach' no existe: el entrenador es siempre null
```

El texto que llega al system prompt es literalmente
`- 09:00 WOD (NaN/15 plazas libres)`.

Correcciones:

- El nombre del entrenador es **`staff_name`** (no `coach`).
- La ocupación **no se publica en este endpoint**. Existe `waitlist_count`
  (lista de espera), que no es lo mismo. **Pendiente de verificar** con una
  respuesta real si la ocupación llega por otro campo no documentado, o si hay
  que obtenerla de `GET /classes/:class_id` o `GET /classes/:class_id/schedule`.
- Mientras no se confirme, el bot **no debe afirmar plazas libres**. Es preferible
  omitir el dato a inventarlo.

Nota adicional: `room_lattitude` aparece con doble "t" en el ejemplo de respuesta
y con una sola en la tabla de campos. Usar el nombre del ejemplo.

### 1.2 `precioConIva` devuelve `NaN` — CRÍTICO

`price` y `taxes` se documentan como `Number`, pero el ejemplo de respuesta los
devuelve **como strings**:

```json
{ "id": 7, "name": "R1 Ilimitado", "type": "Monthly sessions",
  "price": "10.00", "taxes": "21.0", "deactivation_date": null,
  "online_sale": "activada", "registration_fee": null, "order": 1 }
```

`TarifaAimharder` los declara `number`. TypeScript no valida en runtime, así que
`JSON.parse` entrega strings. Verificado ejecutando la función actual:

| Entrada | Resultado |
|---|---|
| `price="10.00", taxes="21.0"` | `NaN` |
| `price="60.00", taxes="21.0"` | `NaN` |
| `price=10, taxes=21` (números) | `12.1` |

Causa: `precio + (precio * taxes) / 100`. El operador `*` coacciona a número, pero
`+` con un string concatena: `"10.00" + 2.1 === "10.002.1"`, y de ahí `NaN`.

Corrección: normalizar con `Number(...)` al entrar, y rechazar el valor si el
resultado no es finito.

### 1.3 `taxes` es ambiguo en la propia documentación

Definido como *"Impuesto aplicado (porcentaje o importe)"*. El ejemplo (`"21.0"`)
sugiere porcentaje, pero no está garantizado por contrato.

**Pendiente de verificar** contra las tarifas reales de Ekin. Un error aquí
comunica precios falsos a clientes; es un riesgo comercial, no solo técnico.
Hasta confirmarlo, conviene una comprobación de cordura (descartar resultados
fuera de un rango plausible) antes de exponer el precio.

### 1.4 Se exigen datos que la API marca como opcionales

En `POST /classes/booking/guest` solo son obligatorios `schedule_id`,
`booking_date` y `name`. Son **opcionales**: `first_surname`, `second_surname`,
`email`, `phone`, `booking_notes`.

`procesarIntencionReserva` bloquea la reserva hasta disponer de nombre, email y
teléfono. Es fricción añadida por la implementación, no un requisito del
proveedor.

### 1.5 La paginación por cursor se ignora

Los listados (`/clients`, `/memberships`, `/leads`, `/staff`, ...) admiten
`cursor`, `id_from` e `id_to`, y devuelven `pagination.nextCursor`.

`getMemberships` y `getCalendario` hacen `respuesta.data ?? []` sin recorrer
páginas. Irrelevante con pocas tarifas; relevante en cuanto se consuma `/clients`.

### 1.6 Las fechas de expiración de los tokens se descartan

`GET /auth/tokens/refresh` devuelve las cuatro:

```
access-token, access-token-expires-at,
refresh-token, refresh-token-expires-at      (formato YYYY-MM-DD HH:MM:SS)
```

`refrescarToken()` solo registra `access-token-expires-at` en un `console.log` y
no persiste ninguna. Sin ese dato no se puede saber si el cron diario
(`0 2 * * *`, `vercel.json`) llega a tiempo, ni refrescar de forma proactiva.

Recomendación: añadir `access_token_expires_at` y `refresh_token_expires_at` a la
tabla `aimharder_tokens`.

**Pendiente de verificar**: duración real de ambos tokens. Determina si el cron
diario es suficiente o meramente decorativo.

### 1.7 Discrepancia sobre el envoltorio `data`

La documentación es inconsistente consigo misma:

- `POST /classes/booking/guest` documenta la respuesta envuelta:
  `{ "data": { "message": "...", "id": 8989 } }`.
- `GET /auth/tokens/refresh`, `GET /calendar/:date_str` y `GET /memberships`
  muestran ejemplos **sin** envoltorio.

El código asume `data` en todos los casos, y el historial de commits indica que
se llegó a ello empíricamente (`feat: reservas en Aimharder funcionando`,
`fix: los tokens vienen dentro de data`). Se mantiene el comportamiento actual,
pero conviene tolerar ambas formas en lugar de asumir una.

---

## 2. Riesgo de seguridad: cancelación sin comprobación de propiedad

`POST /classes/booking/cancel` acepta **únicamente** `booking_id` (y un `reason`
opcional). La API no verifica que quien cancela sea el titular de la reserva:
la autorización es la del centro, no la del socio.

Combinado con dos defectos propios se convierte en una cadena explotable:

1. `POST /api/whatsapp` no valida `X-Twilio-Signature` → se puede falsificar el
   campo `From` y suplantar a cualquier número.
2. `REGEX_BOOKING_ID = /\b\d{5,}\b/` → cualquier número de cinco o más cifras del
   mensaje se toma como identificador de reserva.
3. La API cancela sin preguntar de quién es.

Resultado: un tercero puede cancelar la reserva de un socio cualquiera. Y el mismo
regex provoca falsos positivos benignos pero embarazosos (un código postal, un
importe) que disparan una cancelación real.

Mitigación: existe `GET /bookings/:booking_id`. Debe consultarse y contrastarse la
reserva con la identidad del interlocutor **antes** de cancelar — que es
exactamente la regla "el LLM propone, el código confirma" del `CLAUDE.md` §0.

Otros códigos de respuesta a tratar de forma explícita:

- `404` — no existe reserva con ese ID.
- `409` — fuera de la ventana de cancelación. Merece un mensaje propio; hoy se
  vuelca el error crudo al usuario.
- `204 No Content` en el caso correcto (el parseo actual ya lo tolera: cuerpo
  vacío → `null`).

---

## 3. Endpoints disponibles y no utilizados

La API cubre buena parte de lo que el proyecto quiere construir.

### 3.1 Identidad y memoria del socio

`GET /clients` devuelve, entre otros campos:

```
id, display_id, name, first_surname, second_surname,
mobile_number, land_number, email, date_of_birth,
creation_date, deactivation_date, deactivation_reason,
personal_id, lead_state, customer_know_by, notes,
class_data { class_id, class_name, schedule_id, reservation_date }
```

**`mobile_number` permite cruzar el número de WhatsApp entrante con el socio
real.** Es la pieza que hoy falta para dejar de tratar a cada persona como
invitada anónima. `class_data` da además la última reserva sin una llamada extra.

Complementan:

- `GET /clients/:id` — ficha completa.
- `GET /clients/:id/bookings` — historial de reservas (frecuencia, preferencias).
- `GET /clients/:id/memberships` — tarifa contratada.

Advertencia RGPD: esta respuesta incluye datos personales sensibles (IBAN,
documento de identidad, contacto de emergencia, notas internas). **No deben
entrar en el contexto del LLM.** Seleccionar explícitamente los campos
necesarios; nunca volcar el objeto completo en el prompt.

### 3.2 Reactivación de clientes inactivos

`GET /clients/without-booking` corresponde directamente a la idea de
"reactivación de dormidos" del backlog. Disponible sin desarrollo previo.

### 3.3 Otros

- `GET /bookings/:booking_id` — verificación previa a cancelar.
- `GET /classes`, `GET /classes/:class_id`, `GET /classes/:class_id/schedule` —
  posible origen del dato de ocupación (**pendiente de verificar**).
- `GET /staff`, `GET /training-rooms` — nombres de entrenadores y salas.
- `GET /leads` — captación.
- Familia `/classes/appointments` — citas, distinta de las reservas de clase.

---

## 4. Detalle de transporte

Todos los ejemplos de la documentación usan `curl --http1.1`. El comentario ya
presente en `src/lib/aimharder.ts` es correcto: el `fetch` nativo de Node usa
HTTP/1.1 por defecto salvo que se habilite `allowH2` explícitamente. No requiere
cambios, pero conviene no introducir un dispatcher propio sin tener esto en
cuenta.

---

## 5. Verificaciones pendientes

Ninguna de estas se puede resolver leyendo documentación. Requieren una captura
real contra la cuenta de Ekin, y bloquean decisiones de diseño. Se abordan en
`docs/tasks/01-captura-api-aimharder.md`.

1. `GET /calendar/:date_str` — ¿llega la ocupación en algún campo? ¿Cómo?
   Sin esto, el bot no puede hablar de disponibilidad.
2. `GET /memberships` — ¿`taxes` es porcentaje o importe? ¿`price` llega como
   string o como número?
3. `GET /auth/tokens/refresh` — duración real del access token y del refresh
   token. Determina la validez del cron diario.
4. Envoltorio `data`: confirmar en qué endpoints aparece.
5. `GET /clients` — ¿en qué formato llega `mobile_number`? ¿Lleva prefijo
   internacional? De ello depende cómo cruzarlo con el `From` de Twilio
   (`whatsapp:+34...`).

Forma recomendada de obtenerlas: un script de un solo uso que llame a cada
endpoint con las credenciales de Ekin y vuelque la respuesta cruda a disco,
**fuera del repositorio** (contiene datos personales).
