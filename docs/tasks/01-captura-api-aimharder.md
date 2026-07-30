# Tarea 01 — Script de captura de la API de AimHarder

```
STA · STANDARD · EXECUTE · crear scripts/capturar-aimharder.ts

Tipo:         investigación (habilitadora de corrección)
Estado:       proyecto existente, en producción con un cliente real
Riesgo:       bajo en escritura (el script solo lee de la API)
              ALTO en datos (/clients expone IBAN, DNI y contacto de emergencia)
Intervención: EXECUTE limitado a crear UN fichero nuevo bajo scripts/.
              NO autoriza modificar src/, ni ejecutar el script.
```

---

## 1. Por qué existe esta tarea

`docs/architecture/aimharder-api-hallazgos.md` documenta varios defectos del
código actual. Algunos están verificados; otros dependen de suposiciones sobre
lo que la API devuelve realmente. Corregir los segundos sin datos reales sería
cambiar una suposición por otra.

Estado actual de las afirmaciones críticas:

| Afirmación | Estado | Cómo se resuelve |
|---|---|---|
| `precioConIva` devuelve `NaN` | `VERIFICADO` (ejecutado) | ya no depende de esta tarea |
| `ocupation` no existe en `/calendar` | `PROVISIONAL` (solo doc) | **esta tarea** |
| `taxes` es porcentaje o importe | `DESCONOCIDO` | **esta tarea** |
| Duración de access y refresh token | `DESCONOCIDO` | **esta tarea** |
| Envoltorio `data` según endpoint | `EN CONFLICTO` | **esta tarea** |
| Formato de `mobile_number` en `/clients` | `DESCONOCIDO` | **esta tarea** |

Ninguna se resuelve leyendo documentación. Requieren una respuesta real de la
cuenta de Ekin.

## 2. Qué hay que construir

Un script de un solo uso: `scripts/capturar-aimharder.ts`.

Se ejecuta a mano, desde local, con las credenciales de Ekin. No forma parte
del runtime de la aplicación ni se despliega.

### 2.1 Comportamiento

1. Leer las credenciales del entorno. **No leerlas de Supabase**: el script
   debe poder ejecutarse aislado, sin tocar la base de datos de producción.

   ```
   AIMHARDER_ACCESS_TOKEN
   AIMHARDER_REFRESH_TOKEN
   CAPTURA_DIR            # ruta absoluta de salida, FUERA del repositorio
   ```

   Si falta cualquiera de las tres, abortar con un mensaje claro. No usar
   valores por defecto ni rutas dentro del repositorio.

2. Llamar a estos endpoints, en este orden, con `Authorization: Bearer <token>`
   y `Content-Type: application/json`:

   | # | Petición | Token | Notas |
   |---|---|---|---|
   | 1 | `GET /calendar/<hoy>` | access | fecha en `YYYY-MM-DD` |
   | 2 | `GET /calendar/<hoy+1>` | access | contraste entre dos días |
   | 3 | `GET /memberships` | access | |
   | 4 | `GET /clients?id_from=1&id_to=3` | access | **máximo 3 clientes** |
   | 5 | `GET /auth/tokens/refresh` | **refresh** | ejecutar el ÚLTIMO (ver 2.3) |

   Base: `https://api.aimharder.com`.

3. Volcar de cada llamada, a `CAPTURA_DIR`, un fichero `NN-<nombre>.json` con:

   - `status` HTTP
   - cabeceras de respuesta
   - **cuerpo crudo como texto, sin parsear** (`await respuesta.text()`)
   - además, el cuerpo parseado si el JSON es válido

   El cuerpo crudo es obligatorio: es la única forma de distinguir
   `"price": "10.00"` (string) de `"price": 10.00` (número), que es
   precisamente uno de los datos que buscamos.

4. Escribir un `RESUMEN.md` en `CAPTURA_DIR` con, para cada llamada: endpoint,
   status, si el cuerpo venía envuelto en `data`, y la lista de claves de nivel
   superior del primer elemento. Sin valores, solo nombres de campo.

5. No abortar el conjunto si una llamada falla. Registrar el fallo y continuar.
   Un 4xx también es información.

### 2.2 Redacción obligatoria de datos personales

`GET /clients` devuelve IBAN, documento de identidad, contacto de emergencia,
notas internas y datos de facturación. **Esos datos no pueden quedar en claro.**

Antes de escribir a disco, sustituir el valor de estos campos por la cadena
`"<REDACTADO>"`, conservando la clave y anotando en su lugar el tipo y la
longitud del original (ej. `"<REDACTADO string(24)>"`):

```
account_number, bank_identification_code, bank_account_owner,
personal_id, date_of_birth, notes,
emergency_contact_name, emergency_contact_relationship,
emergency_contact_phone, emergency_contact_email,
invoice_data (objeto completo)
```

Excepción deliberada: `mobile_number`, `land_number` y `email` se conservan
**solo del primer cliente devuelto**, porque necesitamos ver su formato exacto
(prefijo internacional, espacios, guiones) para poder cruzarlo con el campo
`From` de Twilio. En el resto, redactar.

La redacción se aplica también al cuerpo crudo antes de escribirlo.

### 2.3 Precaución con el refresco de tokens

`GET /auth/tokens/refresh` **invalida el par de tokens anterior**. Si se ejecuta
antes que el resto, las llamadas siguientes fallarán con el token viejo.

Por eso va el último. Y por eso el script debe imprimir en consola, al terminar,
un aviso visible:

```
ATENCIÓN: se han generado tokens nuevos. Los anteriores ya no sirven.
Actualiza la tabla aimharder_tokens antes de usar la aplicación,
o el bot de producción dejará de funcionar.
```

Los tokens nuevos se escriben al fichero de captura **redactados**: conservar
únicamente los campos `access-token-expires-at` y `refresh-token-expires-at`,
que son el dato que buscamos. Los tokens en sí, `"<REDACTADO>"`.

## 3. Restricciones

- **No tocar nada bajo `src/`.** Esta tarea no corrige ningún defecto; solo
  recoge evidencia.
- **No importar desde `src/lib/aimharder.ts`.** El script debe ser autónomo. Si
  reutilizase el módulo actual heredaría su comportamiento de refresco
  automático, que contaminaría la captura precisamente en lo que queremos medir.
- **No escribir dentro del repositorio.** La ruta de salida viene de
  `CAPTURA_DIR` y debe estar fuera. Si la ruta cae dentro del repositorio,
  abortar.
- **No añadir dependencias.** `fetch` nativo y el `fs` de Node bastan.
- **No commitear ninguna captura.** Añadir `scripts/capturas/` a `.gitignore`
  como red de seguridad adicional, aunque la salida vaya fuera.

## 4. Definición de Hecho

- [ ] `scripts/capturar-aimharder.ts` existe y es autónomo.
- [ ] `npm run lint` pasa.
- [ ] `npm run build` pasa.
- [ ] El script aborta con mensaje claro si falta una variable de entorno o si
      `CAPTURA_DIR` apunta dentro del repositorio.
- [ ] Todos los campos de la lista de 2.2 se redactan.
- [ ] `git status` no muestra ningún fichero de captura.
- [ ] En el informe final se indica explícitamente **si el script se ejecutó o
      no**. No se ejecuta en esta tarea: lo ejecuta el propietario con las
      credenciales reales.

## 5. Qué informar al terminar

- Ruta del fichero creado.
- Comando exacto de ejecución, con las variables de entorno necesarias.
- Resultado literal de `lint` y `build`.
- Cualquier decisión de implementación que se haya apartado de este documento,
  y por qué.

No afirmar que la captura funciona. No se habrá probado contra la API real.
