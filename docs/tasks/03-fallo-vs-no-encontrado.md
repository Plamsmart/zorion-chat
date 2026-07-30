# Tarea 03 — Distinguir "ha fallado" de "no existe", en los tres sitios que quedan

```
STA · STANDARD · EXECUTE · cerrar los restos de la tarea 02

Tipo:         corrección (continuación de docs/tasks/02-nan-y-degradacion.md)
Estado:       proyecto existente; el defecto sobrevive en el flujo de reserva
Riesgo:       medio — el camino afectado es el que reserva plazas reales
Intervención: EXECUTE sobre src/lib/bot.ts, src/lib/aimharder.ts
              y src/app/api/aimharder/calendario/route.ts.
              Esta tarea SÍ autoriza tocar esa ruta; la 02 no lo hacía.
```

---

## 1. Por qué existe esta tarea

La tarea 02 hizo bien su trabajo, pero su alcance estaba mal recortado: nombraba
`construirSystemPrompt` y no las otras dos rutas por las que pasa el mismo dato.
El resultado es que el mismo defecto —confundir un fallo de consulta con un
resultado vacío— sigue vivo en dos sitios, y en uno de ellos hace más daño que
en el que se corrigió.

Esto no es un defecto de la tarea 02. Es un defecto del enunciado de la tarea 02.

Regla que se aplica en los tres casos, la misma del `CLAUDE.md` §0:

> Una llamada fallida no es un resultado vacío. Degradar de forma explícita,
> nunca en silencio.

## 2. Defecto A — el flujo de reserva dice "no existe" cuando quiere decir "no lo sé"

**CRÍTICO.** Es el más grave de los tres porque ocurre mientras alguien intenta
reservar.

`buscarClaseCoincidente` (`src/lib/bot.ts`, ~línea 502):

```ts
const resultado = await obtenerClasesCalendario(fecha);
if (!resultado.ok) continue;     // el fallo se descarta en silencio
...
return null;                     // indistinguible de "no hay coincidencia"
```

Y quien la llama, `procesarIntencionReserva`:

```ts
if (!clase) {
  return `No encontré ninguna clase que coincida con "..." en el calendario del ...`;
}
```

Si AimHarder no responde, el socio recibe **"no encontré ninguna clase que
coincida"**. Es falso: no es que la clase no exista, es que no se ha podido
mirar. El socio corrige el nombre de la clase, vuelve a fallar, y se rinde.

### Corrección

1. `buscarClaseCoincidente` devuelve un resultado de tres estados, coherente con
   el que ya introdujo la tarea 02:

   - clase encontrada;
   - consultado correctamente y sin coincidencia;
   - **no se ha podido consultar** (una o varias fechas fallaron).

2. Si alguna de las fechas consultadas falla y **no** se encuentra coincidencia
   en las demás, el resultado es "no se ha podido consultar". No se degrada a
   "no encontrada". Si se encuentra coincidencia en otra fecha, el hallazgo
   manda y el fallo parcial no importa.

3. `procesarIntencionReserva` distingue los dos mensajes:

   - Sin coincidencia (consulta correcta): se mantiene el texto actual.
   - Fallo de consulta: mensaje nuevo, que **no niegue la existencia de la
     clase** ni pida al socio que corrija un dato que probablemente esté bien.
     Debe reconocer el problema como propio y ofrecer una salida. Por ejemplo:

     ```
     No he podido consultar el calendario en este momento, así que no puedo
     confirmar tu reserva. Vuelve a intentarlo en unos minutos o resérvala
     directamente en la app de AimHarder.
     ```

4. Bajo ningún concepto se debe intentar la reserva sin haber resuelto la clase.
   Sigue rigiendo "el LLM propone, el código confirma".

## 3. Defecto B — el `NaN` sigue vivo en la ruta de calendario

`src/app/api/aimharder/calendario/route.ts` conserva el código original:

```ts
plazasLibres: Math.max(clase.limit - clase.ocupation, 0),   // NaN
entrenador: clase.coach ?? null,                            // 'coach' ya no existe
```

La tarea 02 no lo tocó porque su enunciado se lo prohibía. **Esta tarea lo
autoriza expresamente.**

Comprobado: esta ruta no tiene consumidores dentro de `src/`, de modo que el
impacto hoy es bajo. Aun así es un endpoint público que devuelve datos falsos, y
mientras siga así bloquea el defecto C.

### Corrección

1. Reutilizar las funciones que ya existen en `src/lib/bot.ts`
   (`leerOcupacion` / `calcularPlazasLibres`) en lugar de duplicar la lógica.
   Exportarlas si hace falta. **No escribir una segunda implementación**: dos
   copias de esta regla acabarán divergiendo, que es exactamente cómo hemos
   llegado hasta aquí.
2. `plazasLibres` pasa a ser `number | null` también en la respuesta JSON. Un
   `null` explícito es información; un `NaN` serializado no lo es.
3. `coach` → `staff_name`.
4. El `catch` existente devuelve un 502, lo cual es correcto: aquí sí hay un
   canal para señalar el fallo. Mantenerlo.

## 4. Defecto C — la interfaz sigue mintiendo

En `src/lib/aimharder.ts`:

```ts
ocupation: number;        // declarado obligatorio
occupation?: number;
```

`ocupation` no aparece en la respuesta documentada de la API
(`docs/architecture/aimharder-api-hallazgos.md` §1.1). Declararlo obligatorio
afirma en el sistema de tipos algo que no se ha verificado — el mismo error que
tenía `price: number` antes de la tarea 02.

La tarea 02 no pudo corregirlo porque hacerlo rompía la compilación de la ruta
del defecto B. Una vez corregida esa ruta, el bloqueo desaparece.

### Corrección

`ocupation?: number` y `occupation?: number`, ambos opcionales. `leerOcupacion`
ya está preparada para ello.

## 5. Restricciones

- Tres ficheros autorizados y **ninguno más**:
  `src/lib/bot.ts`, `src/lib/aimharder.ts`,
  `src/app/api/aimharder/calendario/route.ts`.
- No tocar `src/app/api/chat/route.ts` ni `src/app/api/whatsapp/route.ts`.
- No tocar el esquema de base de datos.
- **No cambiar la fórmula del IVA** ni el rango de cordura. Sigue pendiente de
  la tarea 01.
- No introducir caché. Sigue siendo otra tarea.
- No instalar ningún framework de tests.
- No tocar las expresiones regulares de intención (`PALABRAS_CLAVE_RESERVA`,
  `REGEX_BOOKING_ID`). Son un problema real y grave, pero se resuelven
  sustituyéndolas por *function calling*, no parcheándolas. Otra tarea.
- Comentarios y textos de cara al usuario, **en castellano**.

## 6. Nota sobre un valor por cliente

`RANGO_PRECIO_PLAUSIBLE` lleva el comentario *"para un precio con IVA en EKIN"*.
Es un valor por cliente escrito a fuego, lo que choca con la regla de
multi-tenant del `CLAUDE.md` §0.

**No se corrige en esta tarea** — hacerlo bien exige decidir dónde vive la
configuración por bot, que es una decisión de arquitectura pendiente. Basta con
reformular el comentario para que no ate el valor a un cliente concreto y deje
constancia de que es un umbral provisional de cordura, no un parámetro de Ekin.

## 7. Definición de Hecho

- [ ] `npm run lint` pasa **sin errores** (ver sección 8: el bloqueo del lint se
      resuelve fuera de esta tarea; si sigue roto al empezar, decirlo y acotar el
      lint a los tres ficheros autorizados, documentándolo).
- [ ] `npm run build` pasa.
- [ ] Ninguna ruta del código puede producir `NaN`, ni en el prompt ni en una
      respuesta JSON.
- [ ] Con el calendario inaccesible, el flujo de reserva **no** afirma que la
      clase no existe.
- [ ] La lógica de ocupación existe en **un solo sitio** del repositorio.
- [ ] El diff no toca ficheros fuera de los tres autorizados.

### Comprobación mínima exigida

Sin framework de tests, y sin instalar ninguno. Dejar constancia del resultado
literal:

1. Simular el fallo de `getCalendario` (por ejemplo, apuntando temporalmente
   `AIMHARDER_BASE_URL` a un host inexistente, o forzando un `throw`) y ejecutar
   `procesarIntencionReserva` con datos completos. **Pegar el texto exacto que
   devuelve.** No debe contener "no encontré ninguna clase".
2. Con la misma simulación, comprobar que `construirSystemPrompt` sigue
   devolviendo un prompt válido con los bloques de degradación.
3. Revertir la simulación y confirmar que el código queda como estaba.

Si alguna de estas comprobaciones no se ejecuta, **decirlo explícitamente**.

## 8. Fuera de esta tarea, pero bloqueante

`npm run lint` falla hoy con 6 errores, todos en
`.claude/skills/*/scripts/`, un directorio sin versionar y ajeno al proyecto.
Mientras siga así, la Definición de Hecho de cualquier tarea es inverificable.

Lo resuelve el propietario del repositorio añadiendo `.claude/**` a los
`globalIgnores` de `eslint.config.mjs` — el flat config de ESLint 9 no lee
`.gitignore` por su cuenta — y `.claude/` al `.gitignore` si procede.

**No lo hagas tú en esta tarea:** `eslint.config.mjs` no está entre los ficheros
autorizados y es configuración del repositorio.

## 9. Qué informar al terminar

- `git diff --stat`.
- Salida literal de `lint` y `build`.
- El texto exacto devuelto por el flujo de reserva con el calendario caído.
- Dónde ha quedado la lógica de ocupación y quién la consume.
- Cualquier desviación respecto a este documento, y por qué.
