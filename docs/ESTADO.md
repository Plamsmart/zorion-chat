# Estado del proyecto — 30 de julio de 2026

Punto de situación al cerrar la sesión. Sirve para retomar sin releer nada más.

```
STA · Cierre de sesión · PARCIALMENTE COMPLETADO
Rama: zabal-develop (511debc) · pusheada · NO mergeada a main
Lint: 0 errores, 1 warning preexistente · tsc --noEmit: limpio
Build: no verificado de forma independiente (ver §5)
```

---

## 1. Qué se ha hecho hoy

**Cuatro commits en `zabal-develop`:**

| Commit | Qué |
|---|---|
| `a59e0e0` | Kernel STA movido a `STA/` y `CLAUDE.md` ampliado con el §0 de contexto de proyecto |
| `9339ef1` | Hallazgos de la API de AimHarder, tres specs de tarea, decisión de canal |
| `2699d01` | Corrección de los `NaN` de calendario y tarifas, degradación explícita |
| `511debc` | `.claude/` excluido del lint y del control de versiones |

**Defectos corregidos** (tareas 02 y 03, ambas revisadas contra el diff):

- `plazasLibres` producía `NaN` porque el código leía `ocupation`, campo que no
  aparece en la respuesta documentada de AimHarder. Ahora es `number | null` y
  el prompt omite la disponibilidad en lugar de inventarla.
- El entrenador nunca aparecía: el campo es `staff_name`, no `coach`.
- Los precios producían `NaN` porque la API devuelve `price` y `taxes` como
  strings y el código los sumaba con `+`, que concatena. Ahora se normalizan y
  se descarta la tarifa si el resultado no es plausible.
- Calendario y tarifas fallaban de forma opuesta y ambas mal: una se tragaba el
  error y mentía, la otra propagaba y tumbaba la petición entera. Ahora
  distinguen tres estados y degradan con un aviso explícito en el prompt.
- El flujo de reserva decía "no encontré esa clase" cuando en realidad no había
  podido consultar el calendario. Ahora son dos mensajes distintos.

**Documentos creados:**

- `docs/architecture/aimharder-api-hallazgos.md` — contraste de la API oficial
  con el código. Es el documento de referencia; empezar por aquí.
- `docs/tasks/01`, `02`, `03` — specs de tarea. La 02 y la 03 están hechas.
- `docs/comercial/` — **sin versionar a propósito.** Ver §4.

**Decisión registrada** en `channel-agnostic-assistant-recommendation.md` §8:
proveedor de WhatsApp = **Twilio**, con condición vinculante de extraer un
adaptador de canal para que siga siendo reversible.

## 2. Dónde está cada cosa

```
main            c355a8c   ← producción. TODAVÍA MUESTRA NaN.
zabal-develop   511debc   ← todo lo de hoy. Pusheado. Sin mergear.
```

**Importante:** cualquier URL de producción sigue diciendo `NaN€`. Para enseñar
el bot hay que usar el deployment de preview de `zabal-develop` (comprobar antes
que las variables de entorno estén definidas también para Preview).

## 3. Lo siguiente, por orden

1. **PR de `zabal-develop` a `main`** y merge. Desbloquea que Alberto pueda
   probar sin ver `NaN`.
2. **Spec 04 — firma del webhook de WhatsApp.** Es el bloqueante duro para
   producción: hoy `/api/whatsapp` acepta cualquier POST y se cree el campo
   `From`, así que se puede suplantar a cualquier socio. Combinado con
   `REGEX_BOOKING_ID = /\d{5,}/` y con que la API de AimHarder cancela sin
   comprobar propiedad, un tercero puede cancelar la reserva de otro.
3. **Sandbox de Twilio.** Trabajo de consola, no de código. Recordar meter el
   número prestado en el campo `whatsapp_numero` del bot, con `+` y sin
   espacios: el webhook busca por igualdad exacta y si no cuadra devuelve 404
   en silencio.
4. **Tarea 01 — captura de la API.** Requiere credenciales reales. Desbloquea
   cuatro decisiones pendientes (ver §5).
5. **Tokens por tenant** (+ persistir `expires_at`, que la API ya devuelve).
6. **Function calling**, que se lleva por delante las regex de intención.
7. **Identidad del socio** cruzando `mobile_number` de `/clients`.

Fuera de código, con plazo de calendario: Alberto tiene que verificar Ekin en
Meta (1-5 días hábiles). Ya tiene el PDF y el WhatsApp.

## 4. Decisiones deliberadas que conviene no deshacer sin pensar

**`docs/comercial/` sí se versiona, pero solo material neutro.** Contiene el PDF
del alta en Meta que se le pasa al cliente y el documento explicativo que sirve
de plantilla para el siguiente box.

Hubo además una carta a Alberto que hablaba de los defectos del código de Pedro
y de la relación entre los tres socios. **Se descartó y se borró a propósito**,
para que esas conversaciones ocurran hablando y no a través de un `git diff`.
Criterio a mantener: en el repositorio va material que cualquiera de los tres
socios pueda leer sin contexto previo. Lo demás, fuera.

**`.claude/` está en `.gitignore`.** Contenía skills de Prisma y de GitHub
Actions en un proyecto de Supabase, y una de TDD en un repositorio sin tests.
Pendiente: borrar las que no aplican, no solo ignorarlas.

**La fórmula del IVA no se ha tocado.** La documentación define `taxes` como
"porcentaje o importe" sin garantizarlo. Se mantiene la interpretación de
porcentaje hasta confirmarlo con datos reales.

## 5. Lo que NO está verificado

Distinguir esto de lo verificado es la mitad del valor de este documento.

- **`npm run build`** — lo reporta Claude Code como correcto, pero no se pudo
  reproducir de forma independiente. Se usó `npx tsc --noEmit` como sustituto,
  que sí pasa limpio.
- **Comportamiento contra la API real de AimHarder.** Todo el análisis sale de
  la documentación oficial, no de respuestas reales.
- **Si `ocupation` existe sin estar documentado.** El código lo tolera si llega,
  pero no se ha confirmado.
- **Si `taxes` es porcentaje o importe.**
- **Duración real de los tokens.** De ello depende si el cron diario
  (`0 2 * * *`) sirve de algo o es decorativo.
- **Formato de `mobile_number`** en `/clients`. Condiciona cómo cruzarlo con el
  `From` de Twilio.

Las cinco últimas las resuelve la tarea 01.

## 6. Deuda conocida, no abordada

- Webhook sin verificación de firma (ver §3.2).
- Webhook híbrido: `GET` con patrón de Meta, `POST` con patrón de Twilio.
- Multi-tenant: tokens de AimHarder en variables de módulo, compartidas entre
  peticiones. Con dos clientes es una fuga de credenciales.
- `aimharderEstaConfigurado()` es global, no por bot.
- Políticas RLS abiertas (`using (true)`) en `bots`, `conocimiento`,
  `conversaciones` y `mensajes`.
- Ocho llamadas HTTP a AimHarder por cada mensaje, sin caché. Es un problema de
  coste por conversación, no solo de latencia.
- Cero tests y ningún framework instalado.
- La ruta `/api/aimharder/calendario` importa de `@/lib/bot`, lo que arrastra el
  cliente de OpenAI y el admin de Supabase a una ruta que no los necesita.
  `calcularPlazasLibres` debería vivir en `aimharder.ts`.
- Sin contrato de encargado del tratamiento con el cliente. Necesario antes del
  cliente 2, no antes del 20.

## 7. Cómo se trabaja aquí

Las tareas se escriben como specs en `docs/tasks/NN-*.md` y se ejecutan con
`ejecuta docs/tasks/NN-*.md`. El informe que devuelve el ejecutor **no es
evidencia**: se revisa el `git diff`. Las dos tareas de hoy se revisaron así, y
en la primera apareció un defecto real que el informe no mencionaba porque el
spec no cubría esa función.

Corolario aprendido hoy: cuando el resultado falla, revisar primero el
enunciado. La tarea 03 existe porque el alcance de la 02 estaba mal recortado,
no porque el ejecutor fallara.
