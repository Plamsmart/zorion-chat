# El asistente de Ekin en WhatsApp

**Qué vamos a montar, cómo funciona y qué necesitamos de vosotros**

Documento para Ekin · 30 de julio de 2026

---

## 1. De qué va esto

Estamos montando un asistente que atiende a vuestros socios por WhatsApp.
Alguien escribe al número de Ekin y recibe respuesta al momento: horarios de
clases, tarifas, cómo apuntarse, dudas del día a día. A cualquier hora, también
un domingo a las once de la noche.

Ya funciona en un chat de web. Lo que falta es conectarlo al WhatsApp del box,
que es donde vuestros socios ya escriben.

**La idea de fondo:** no perdéis clientes por atender mal. Los perdéis porque no
da la vida para estar pendiente de trescientas personas a la vez. El asistente
se encarga de lo repetitivo para que vosotros os dediquéis a lo demás.

---

## 2. Cómo funciona, en cristiano

WhatsApp no permite que un programa se conecte a la aplicación normal del móvil.
Para que un sistema pueda responder automáticamente, Meta —la empresa dueña de
WhatsApp— exige pasar por lo que llaman su **plataforma para empresas**. Es la
misma vía que usan los bancos o las aerolíneas cuando te mandan un mensaje.

Eso implica dos cosas:

- Meta tiene que **verificar que Ekin es una empresa real**. Es un trámite, con
  papeleo y unos días de espera.
- El número de teléfono tiene que estar **dado de alta en esa plataforma**.

No hay forma de saltarse esto. Cualquiera que os ofrezca un WhatsApp automático
pasa por aquí, lo cuente o no.

---

## 3. Las dos formas de conectarlo

Hay dos caminos, y os explicamos los dos porque el dinero es vuestro.

### Opción A — a través de Twilio *(la que recomendamos)*

Twilio es una empresa que hace de intermediario con Meta. Se encarga del
papeleo, tiene un asistente de alta paso a paso, y sobre todo permite **probar
el sistema desde el primer día** sin esperar a que Meta apruebe nada.

- ✅ Podemos empezar a probar esta misma semana, sin bloquear nada por vuestra parte
- ✅ El trámite con Meta es guiado, no a ciegas
- ❌ Cobra una pequeña comisión por mensaje, encima de lo que cobra Meta

### Opción B — directamente con Meta

Sin intermediario y sin comisión, pero **no se puede enviar ni un mensaje de
prueba hasta que Meta os haya verificado**. Y ese trámite es de días.

- ✅ Algo más barato por mensaje
- ❌ Bloquea las pruebas hasta que termine la verificación
- ❌ Todo el papeleo lo lleváis vosotros, sin guía

### Qué hemos decidido y por qué

**Empezamos con Twilio.**

El motivo no es el precio, es el tiempo. Con Twilio podemos tener el asistente
funcionando y probado mientras vosotros hacéis el trámite en paralelo. Con la
opción B, todo el mundo espera.

La diferencia de coste, con un solo gimnasio y el volumen de mensajes que tenéis,
es de céntimos al mes. Empieza a notarse con mucho más tráfico.

**Y no es una puerta que se cierre.** Lo estamos construyendo de forma que
cambiar de Twilio a Meta más adelante sea un cambio pequeño por nuestra parte,
sin tocar nada de lo que vosotros veis. Si en un año interesa dar el salto, se
da.

---

## 4. Lo que necesitamos de vosotros

Son tres cosas. La primera es la importante.

### 4.1 Decidir qué número usa el asistente

**Esta es la decisión que más condiciona todo lo demás. Antes de nada
necesitamos saber una cosa:**

> **¿Usáis ahora mismo la aplicación *WhatsApp Business* en el móvil para
> hablar con los socios? ¿Con qué número?**

Según la respuesta, hay dos caminos:

**Un número nuevo, solo para el asistente**

Lo más limpio. Nadie pierde nada, vuestro WhatsApp de siempre sigue igual, y el
asistente vive en su propio número. El único inconveniente es que hay que
comunicar el número nuevo a los socios.

**El número que ya usa Ekin**

Los socios ya lo tienen guardado, no hay que enseñar nada nuevo. Pero cuidado:
tradicionalmente, conectar un número a la plataforma de empresas significaba
**dejar de poder usarlo en la aplicación del móvil**. Meta ha introducido
recientemente una modalidad que permite las dos cosas a la vez, pero no está
disponible en todos los casos.

**Si vais por aquí, lo confirmamos nosotros antes de tocar nada.** No vamos a
dejaros sin WhatsApp por sorpresa.

> **Nuestra recomendación:** si el WhatsApp actual lo usáis a diario para hablar
> con la gente, empezad con un número nuevo. Es reversible, no arriesga vuestra
> herramienta de trabajo, y siempre se puede cambiar después.

### 4.2 Los datos para verificar Ekin ante Meta

Meta pide acreditar que la empresa existe. Lo que suelen solicitar:

- Nombre legal de la empresa, tal y como figura en Hacienda
- CIF / NIF
- Dirección física del box
- Teléfono de contacto de la empresa
- Página web o perfil público (Instagram sirve, si no hay web)
- Un documento oficial que acredite la empresa: escritura de constitución,
  certificado de alta censal o similar

Es importante que **el nombre y la dirección coincidan exactamente** con los
documentos oficiales. La mayoría de rechazos vienen de una letra distinta o una
dirección que no cuadra.

El asistente de alta de Twilio os dará la lista definitiva cuando llegue el
momento. Esta es la lista de lo habitual, para que lo vayáis reuniendo.

### 4.3 Un poco de paciencia con los plazos

- **Verificación de la empresa por parte de Meta:** de 3 a 5 días laborables
  normalmente. Puede alargarse si algún dato no cuadra.
- **Conexión técnica una vez aprobado:** cuestión de horas.

Mientras tanto nosotros no estamos parados: seguimos afinando el asistente y
probándolo con nuestros propios teléfonos.

---

## 5. Qué NO cambia

- **No perdéis el control.** Podéis leer todas las conversaciones y apagar el
  asistente cuando queráis.
- **El asistente no suplanta a nadie.** Siempre se identifica como asistente,
  nunca finge ser una persona. Es una norma nuestra y no es negociable.
- **No sustituye a AimHarder.** Sigue siendo vuestra agenda. El asistente habla
  con ella; no la reemplaza.
- **No os obliga a cambiar de rutina.** Si algo se le escapa, la conversación
  llega a vosotros como siempre.

---

## 6. Los datos de vuestros socios

Nos parece justo que lo sepáis sin tener que preguntarlo.

- Las conversaciones se guardan para que el asistente tenga memoria de lo
  hablado y no os haga repetir las cosas.
- **Los datos sensibles no se tocan.** Cuentas bancarias, DNI y contactos de
  emergencia que guardáis en AimHarder no entran en el sistema del asistente.
- Todo se aloja en servidores de la Unión Europea.
- Si en algún momento queréis que borremos algo, se borra.
- El día que queramos hacer algo distinto con esos datos, os lo preguntaremos
  antes. No después.

---

## 7. Siguientes pasos

**Vosotros:**

1. Contestar a la pregunta del apartado 4.1: qué número usa el asistente.
2. Ir reuniendo la documentación del 4.2.

**Nosotros:**

1. Dejar el asistente afinado y probado en nuestros teléfonos.
2. Acompañaros en el trámite de alta cuando toque.
3. Conectar el número y hacer una prueba conjunta antes de abrirlo a los socios.

---

Cualquier duda, preguntad sin problema. Preferimos explicar tres veces algo
antes de que os llevéis una sorpresa.

**Zabal y Pedro**
