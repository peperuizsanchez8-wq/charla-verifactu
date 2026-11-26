# Charla abierta con confirmación de asistencia

Página informativa de una charla gratuita («Verifactu y factura electrónica») organizada por una gestoría para autónomos y pymes. Muestra fecha, hora, lugar, temario y plazas libres, y recoge cada confirmación con zona, nave o local y número de asistentes, respetando el cupo de la sala. Todo funciona en el navegador con `localStorage`.

**Demo:** https://peperuizsanchez8-wq.github.io/charla-verifactu/

> «Gestoría Palmeral», la sala y las direcciones son datos de prueba. Todas las inscripciones son sintéticas.

**Stack:** React 18, Tailwind CSS 3, Vite 5 y `localStorage`. El build genera un único `index.html` autocontenido.

## Cómo correrlo en local

Requisitos: Node 18 o superior.

```bash
git clone https://github.com/peperuizsanchez8-wq/charla-verifactu.git
cd charla-verifactu
npm install
npm run dev        # abre http://localhost:5173/app.html
```

Para generar la versión publicable:

```bash
npm run build      # genera el HTML autocontenido y lo copia a index.html
```

GitHub Pages sirve `index.html` desde la raíz (Settings → Pages → rama `main`, carpeta `/ (root)`). Ese archivo también funciona abierto con doble clic, sin servidor.

El repositorio es plano (sin subcarpetas) a propósito: `app.html` es la entrada de desarrollo de Vite e `index.html` es el build ya compilado.

## Estructura

| Archivo | Contenido |
|---|---|
| `config.js` | **Único objeto `EVENTO`:** fecha, horas, lugar, cupo, temario y zonas. También la clave de `localStorage` |
| `logic.js` | Lógica pura sin React: normalización, validación, cupo, unicidad, datos de ejemplo, persistencia y `.ics` |
| `App.jsx` | Interfaz: encabezado, datos del evento, temario, formulario y vista de la organización |
| `main.jsx`, `index.css` | Arranque de React y estilos de Tailwind |
| `app.html` | Entrada de desarrollo de Vite |
| `index.html` | Build listo para publicar (no editar a mano) |

## Cambiar fecha, lugar, temario, zonas y cupo

Todo está en `config.js`:

```js
export const EVENTO = {
  organizador: 'Gestoría Palmeral',
  titulo: 'Verifactu y factura electrónica: qué cambia en tu negocio',
  fecha: '2027-01-21', horaInicio: '18:30', horaFin: '20:30', zonaHoraria: 'Europe/Madrid',
  lugar: 'Sala Ágora · Calle Ejemplo 12, 03203 Elche (Alicante)',
  cupo: 40,
  temario: [ { horario, titulo, detalle }, … ],   // cuatro bloques
  zonas: [ 'Polígono de Carrús', … ]               // seis zonas de ejemplo
}
```

La pantalla, el contador, el desplegable de zonas y el `.ics` se generan a partir de este objeto. Después de cambiarlo, ejecuta `npm run build`.

## Datos de ejemplo y cómo reemplazarlos

En la primera visita, cuando la clave no existe, se cargan 12 inscripciones (`PV-0001` a `PV-0012`) que ocupan **18 de las 40 plazas**. El contador arranca en **22 libres**. Seis inscripciones son de 2 asistentes y seis de 1. Hay dos negocios con la misma nave (`12`) en zonas distintas, para mostrar que eso está permitido.

- **Reemplazarlos:** editar `datosEjemplo()` en `logic.js`. Para arrancar vacío, devolver `{ inscripciones: [], siguiente: 1 }`.
- **Volver al estado inicial:** botón «Restablecer datos de ejemplo» en la vista de la organización. Solo reescribe la clave propia.

## Clave de localStorage

- **Clave:** `gestoriaPalmeral.charlaVerifactu.v1`
- **Formato:** `{ "inscripciones": [ … ], "siguiente": 13 }`
- **La app no borra ni lee otras claves.** Nunca llama a `localStorage.clear()`. Solo hace `getItem` y `setItem` sobre su propia clave.

Consulta desde la consola: `JSON.parse(localStorage.getItem('gestoriaPalmeral.charlaVerifactu.v1'))`.

## Cómo se arma el archivo .ics

`generarICS()` en `logic.js` produce un iCalendar 2.0 con:

- `VTIMEZONE` de Europe/Madrid, para que la hora sea correcta en cualquier calendario.
- `VEVENT` con `UID` fijo por fecha (si se descarga dos veces, el calendario lo trata como el mismo evento), `DTSTART` y `DTEND` con `TZID`, `SUMMARY` (título), `LOCATION` (lugar) y `DESCRIPTION`.
- Comas, punto y coma y barras escapados según la RFC 5545, con líneas terminadas en `CRLF`.

Se descarga como `charla-verifactu.ics` mediante un `Blob`. **Descargarlo no crea ninguna inscripción ni cambia el contador.**

## Reglas y pruebas

### Modelo de datos

```
Evento       { organizador, titulo, fecha, horaInicio, horaFin, zonaHoraria, lugar, cupo, temario[4], zonas[6] }
Inscripción  { codigo: 'PV-0001', nombre, email, zona, local, rol: 'Titular'|'Equipo', asistentes: 1|2, pregunta, creada }
```

### Validaciones

| Campo | Regla |
|---|---|
| Nombre | Obligatorio |
| Email | Obligatorio y con formato válido |
| Zona | Obligatoria, una de las seis |
| Nave o local | Obligatorio: de 1 a 4 dígitos y una letra opcional (`12`, `12B`, `1290`) |
| Rol | Obligatorio: Titular o Parte del equipo |
| Asistentes | Obligatorio: 1 o 2 |
| Pregunta | Opcional, hasta 300 caracteres, con contador |

Cada error se muestra debajo de su campo.

### Regla «unicidad por negocio»

```
normalizar(s) = s.trim().toLocaleUpperCase('es')
clave = normalizar(zona) + '|' + normalizar(local)
```

- Se compara sin espacios de borde y sin diferencias de mayúsculas: `" 2b "` es igual que `"2B"`.
- La misma nave en **zonas distintas** sí se admite.
- El local se guarda ya normalizado (`2B`).

### Regla de cupo

- `libres = cupo − suma de asistentes`.
- Si los asistentes pedidos son más que las plazas libres, se rechaza el envío y se indica cuántas quedan («Solo queda 1 plaza y has pedido 2»).
- Con 0 plazas libres, el formulario se sustituye por el aviso **«Sala completa»**.

### Prueba guiada y resultado observado

Ejecutada en Chrome sin interfaz (Playwright) a 360 px de ancho, partiendo de los datos de ejemplo:

| # | Acción | Esperado | Observado |
|---|---|---|---|
| 1 | Abrir la página | 22 plazas libres | 22 ✔ |
| 2 | Confirmar Polígono de Torrellano · `2B` · 1 asistente | Código PV-0013, 21 libres | PV-0013, 21 ✔ |
| 3 | Repetir Polígono de Torrellano · `" 2b "` | Rechazo por duplicado | «Ya hay una inscripción para Polígono de Torrellano, nave o local 2B», 21 ✔ |
| 4 | Polígono de Carrús · `2B` (otra zona) | Se admite | PV-0014, 20 ✔ |
| 5 | Nombre vacío, email `mal@x`, local `12345` | Tres errores bajo sus campos | Los tres errores ✔ |
| 6 | Descargar el .ics dos veces | Mismo contador y .ics con título, fecha, hora y lugar | 20 libres; DTSTART 20270121T183000, LOCATION correcto ✔ |
| 7 | Recargar la página | Se mantiene todo | 20 ✔ |
| 8 | Llenar hasta 1 libre y pedir 2 | Rechazo con las plazas que quedan | «Solo queda 1 plaza y has pedido 2» ✔ |
| 9 | Pedir 1 | Se admite y la sala se cierra | 0 libres y aviso «Sala completa» ✔ |
| 10 | Ancho de página a 360 px | Sin scroll horizontal | `scrollWidth` = 360 ✔ |

### Probar un guardado fallido

1. Completar el formulario con datos válidos.
2. En la vista de la organización, marcar **Simular fallo de guardado**.
3. Enviar. Aparece «No pudimos guardar tu inscripción. Lo que escribiste sigue aquí» y los campos conservan su contenido. El contador no cambia.
4. Desmarcar la casilla y volver a enviar: se guarda con el código siguiente, sin saltos.

Observado: el texto se mantuvo y el reintento se guardó como PV-0015. El mismo camino se activa si `localStorage` no está disponible o está lleno, porque el guardado va dentro de `try/catch`.

### Otras claves intactas

Observado: se creó `otraApp.datos = "intacto"`, se pulsó «Restablecer datos de ejemplo» y se recargó la página. La clave ajena seguía igual y en `localStorage` solo apareció además la clave propia.

## Verificación manual

- [ ] Primera carga: 22 plazas libres y 12 inscripciones en la vista de la organización.
- [ ] El botón «Confirmar asistencia» del encabezado lleva al formulario.
- [ ] Pasos 2 a 9 de la prueba guiada.
- [ ] El .ics se abre en Google Calendar, Outlook o el calendario del iPhone con la fecha y la hora correctas.
- [ ] El guardado fallido conserva lo escrito.
- [ ] Se usa con comodidad en un móvil de 360 px.

## Pendiente para producción

Backend y persistencia compartida, emails de confirmación, dominio, políticas legales y contenidos definitivos. `logic.js` no depende de React, así que la validación, el cupo y la unicidad se pueden reutilizar en el servidor.
