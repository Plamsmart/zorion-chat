# Tarea 02 — Corregir los `NaN` y degradar sin mentir

```
STA · STANDARD · EXECUTE · corregir src/lib/bot.ts y src/lib/aimharder.ts

Tipo:         corrección
Estado:       proyecto existente, defectos visibles para el cliente final
Riesgo:       medio — toca el camino que alimenta el prompt de los DOS canales
Intervención: EXECUTE limitado a src/lib/bot.ts y src/lib/aimharder.ts.
              NO autoriza tocar rutas de API, esquema, ni el widget.
```

Esta tarea **no depende** de la tarea 01. Solo contiene correcciones que son
ciertas con la evidencia ya disponible.

---

## 1. Por qué existe esta tarea

Hay dos defectos que hoy producen texto falso en el prompt que se envía al
modelo, y por tanto en lo que el asistente le dice a un socio de Ekin. Los dos
están en el núcleo compartido, así que afectan por igual al widget web y a
WhatsApp.

Fuente: `docs/architecture/aimharder-api-hallazgos.md`, secciones 1.1 y 1.2.

## 2. Defecto A — el nombre del entrenador nunca aparece

`ClaseAimharder` declara `coach`. La respuesta real de `GET /calendar/:date_str`
no tiene ese campo: el nombre del entrenador es **`staff_name`**.

Consecuencia: `entrenador: clase.coach ?? null` es siempre `null`. Fallo
silencioso, nadie lo ha notado.

**Corrección:** renombrar el campo de la interfaz a `staff_name` y leerlo desde
ahí. Añadir también `staff_id` y `waitlist_count`, que sí existen y harán falta
más adelante.

## 3. Defecto B — `plazasLibres` se evalúa a `NaN`

```ts
plazasLibres: Math.max(clase.limit - clase.ocupation, 0),
```

`ocupation` no aparece en la respuesta documentada. Si no llega, la expresión es
`15 - undefined` → `NaN`, y `Math.max(NaN, 0)` → `NaN`. El prompt acaba diciendo
`- 09:00 WOD (NaN/15 plazas libres)`.

**Estado de la evidencia:** `PROVISIONAL`. La documentación no lista el campo,
pero podría existir sin estar documentado. La tarea 01 lo resolverá.

**Corrección, y esto es lo importante — no se trata de poner un `0`:**

Poner `plazasLibres: 0` convertiría un dato ausente en la afirmación "no quedan
plazas", que es exactamente el defecto que el `CLAUDE.md` §0 prohíbe: *never
state as fact what was not retrieved*. Un dato que no ha llegado no es un cero.

Por tanto:

1. `plazasLibres` pasa a ser `number | null`. Se calcula **solo** si `limit` y
   la ocupación son ambos números finitos. En cualquier otro caso, `null`.
2. `formatearClasesParaPrompt` omite la coartada de plazas cuando el valor es
   `null`. La línea queda `- 09:00 WOD — Mikel`, sin inventar disponibilidad.
3. Añadir al prompt, cuando alguna clase tenga `plazasLibres` en `null`, una
   línea explícita:

   ```
   Nota: no dispongo del número de plazas libres. Si te preguntan por
   disponibilidad, indica que hay que confirmarlo en la app de AimHarder.
   ```

   Es preferible admitir el desconocimiento a inventar un número.
4. Leer la ocupación de forma tolerante: aceptar `ocupation` u `occupation`
   (el código actual usa una grafía que no está documentada; puede que la real
   sea otra). Si ninguna existe, `null`. **No inventar un tercer nombre.**

## 4. Defecto C — los precios se muestran como `NaN`

`GET /memberships` devuelve `price` y `taxes` **como strings** (`"10.00"`,
`"21.0"`), pero `TarifaAimharder` los declara `number`. TypeScript no valida en
runtime.

```ts
return Math.round((precio + (precio * taxes) / 100) * 100) / 100;
```

`"10.00" + 2.1` es `"10.002.1"` en JavaScript — concatenación, no suma — y de
ahí `NaN`. Verificado ejecutando la función.

**Corrección:**

1. Declarar `price: number | string` y `taxes: number | string` en la interfaz.
   Refleja la realidad en lugar de esconderla.
2. Normalizar con `Number(...)` al entrar en `precioConIva`.
3. Si el resultado no es finito (`Number.isFinite`), **no mostrar la tarifa**.
   Omitirla de la lista antes que enseñar un precio falso.
4. Comprobación de cordura: si el precio calculado sale fuera de un rango
   plausible, omitir esa tarifa y registrar un `console.warn`. Un precio
   disparatado comunicado a un cliente es un problema comercial.

**Límite explícito de esta tarea:** la documentación define `taxes` como
*"porcentaje o importe"*. Se mantiene la interpretación actual (porcentaje),
porque el ejemplo oficial (`"21.0"`) la respalda. **No cambiar la fórmula.**
Confirmarlo es trabajo de la tarea 01. Dejar un comentario en el código
señalando la suposición y remitiendo a este documento.

## 5. Defecto D — `obtenerTarifas()` puede tumbar el bot entero

```ts
async function obtenerClasesCalendario(fecha) {
  try { ... } catch { return []; }        // se traga el error
}

export async function obtenerTarifas(): Promise<string> {
  const tarifas = await getMemberships();  // sin catch → propaga
}
```

`getMemberships` → `peticionAimharder` → `throw` si la respuesta no es `ok`.
Nadie lo captura en toda la cadena hasta el `POST` de `/api/chat` y
`/api/whatsapp`. Si `/memberships` falla, el bot devuelve un 500 y el socio no
recibe nada.

Las dos funciones fallan mal, en direcciones opuestas: una se traga el error y
miente, la otra se muere.

**Corrección — un único criterio para las dos:**

1. Distinguir tres resultados, no dos: **dato obtenido**, **dato vacío
   confirmado**, y **fallo al consultar**. Hoy los dos últimos se confunden.
2. `obtenerClasesCalendario` deja de devolver `[]` ante un error. Devuelve un
   resultado que distinga "no hay clases ese día" de "no he podido consultar".
3. `obtenerTarifas` captura sus propios errores y nunca propaga.
4. Cuando la consulta falla, el bloque correspondiente del prompt lo dice de
   forma explícita, en castellano y en primera persona:

   ```
   Calendario de clases: no he podido consultarlo en este momento.
   No afirmes horarios ni disponibilidad; ofrece consultarlo en la app.
   ```

   Nunca omitir el bloque en silencio: si desaparece sin más, el modelo se
   inventa el contenido.
5. `construirSystemPrompt` no debe poder lanzar. Un fallo de una integración
   degrada la respuesta; no cancela la conversación.

## 6. Restricciones

- Tocar **solo** `src/lib/bot.ts` y `src/lib/aimharder.ts`.
- No modificar `src/app/api/chat/route.ts` ni `src/app/api/whatsapp/route.ts`.
  Si para cumplir esta tarea pareciera necesario tocarlos, **parar y avisar**:
  significaría que el diseño de la corrección se ha salido del alcance.
- No tocar el esquema de base de datos.
- No cambiar la fórmula del IVA (ver 4).
- No añadir dependencias.
- No introducir caché en esta tarea, aunque se vea la necesidad. Las 8 llamadas
  HTTP por mensaje son un problema real y conocido, pero es otra tarea; mezclar
  rendimiento con corrección hace el diff imposible de revisar.
- Comentarios y textos de cara al usuario, **en castellano**.

## 7. Definición de Hecho

- [ ] `npm run lint` pasa.
- [ ] `npm run build` pasa.
- [ ] Ninguna ruta del código puede producir la cadena `NaN` en el prompt.
- [ ] Con AimHarder inaccesible, `construirSystemPrompt` devuelve un prompt
      válido que declara explícitamente qué no pudo consultarse.
- [ ] El diff no toca ficheros fuera de los dos autorizados.
- [ ] `git diff --stat` incluido en el informe.

### Comprobación mínima exigida

No hay framework de tests en el repositorio y **esta tarea no debe instalar
uno**. Verificar así, y dejar constancia del resultado literal:

1. Un script temporal en Node que llame a `precioConIva` (o a su sustituta) con
   `("10.00", "21.0")`, `(10, 21)`, `("", "")` y `(null, null)`, y muestre la
   salida. Ninguna entrada debe producir `NaN` a la vista del usuario.
2. Comprobar a mano que `formatearClasesParaPrompt` con una clase sin ocupación
   no imprime la coartada de plazas.
3. Borrar el script temporal antes de cerrar.

Si estas comprobaciones no se ejecutan, **decirlo explícitamente**. No afirmar
verificación que no ocurrió.

## 8. Qué informar al terminar

- `git diff --stat`.
- Salida literal de `lint` y `build`.
- Salida literal de la comprobación de la sección 7.
- Cómo queda el bloque del prompt cuando AimHarder falla (pegar el texto real).
- Cualquier desviación respecto a este documento, y por qué.
