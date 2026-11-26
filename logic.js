// Lógica pura: sin React ni DOM, para poder probarla y reutilizarla en un backend.
import { EVENTO, STORAGE_KEY } from './config.js'

/** Normaliza para comparar: sin espacios de borde y sin diferencias de mayúsculas. */
export const normalizar = (s) => String(s ?? '').trim().toLocaleUpperCase('es')

/** Clave única de la inscripción: zona + nave/local, ya normalizados. */
export const claveUnica = (zona, local) => `${normalizar(zona)}|${normalizar(local)}`

export const ocupados = (inscripciones) => inscripciones.reduce((t, i) => t + Number(i.asistentes || 0), 0)
export const libres = (inscripciones, cupo = EVENTO.cupo) => Math.max(0, cupo - ocupados(inscripciones))

export function yaInscrito(inscripciones, zona, local) {
  const k = claveUnica(zona, local)
  return inscripciones.some((i) => claveUnica(i.zona, i.local) === k)
}

const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const RE_LOCAL = /^\d{1,4}[A-Za-zÑñ]?$/

/** Devuelve { errores, general }: errores por campo y un error general (cupo o duplicado). */
export function validar(v, inscripciones, cupo = EVENTO.cupo) {
  const e = {}
  if (!v.nombre?.trim()) e.nombre = 'Escribe tu nombre.'
  if (!v.email?.trim()) e.email = 'Escribe tu email.'
  else if (!RE_EMAIL.test(v.email.trim())) e.email = 'El formato del email no es válido.'
  if (!v.zona) e.zona = 'Elige la zona de tu negocio.'
  else if (!EVENTO.zonas.some((z) => normalizar(z) === normalizar(v.zona))) e.zona = 'Elige una zona de la lista.'
  if (!v.local?.trim()) e.local = 'Indica el número de nave o local.'
  else if (!RE_LOCAL.test(v.local.trim())) e.local = 'De 1 a 4 dígitos y una letra opcional (por ejemplo 12 o 12B).'
  if (!v.rol) e.rol = 'Indica si eres titular o parte del equipo.'
  if (!['1', '2', 1, 2].includes(v.asistentes)) e.asistentes = 'Elige 1 o 2 asistentes.'
  if ((v.pregunta ?? '').length > 300) e.pregunta = 'La pregunta no puede superar 300 caracteres.'

  let general = ''
  if (!Object.keys(e).length) {
    const quedan = libres(inscripciones, cupo)
    if (yaInscrito(inscripciones, v.zona, v.local)) {
      general = `Ya hay una inscripción para ${v.zona.trim()}, nave o local ${normalizar(v.local)}. Solo se admite una por negocio.`
    } else if (Number(v.asistentes) > quedan) {
      general = `Solo ${quedan === 1 ? 'queda 1 plaza' : `quedan ${quedan} plazas`} y has pedido ${v.asistentes}.`
    }
  }
  return { errores: e, general }
}

export function siguienteCodigo(n) { return `PV-${String(n).padStart(4, '0')}` }

export function crearInscripcion(v, n, ahora = new Date()) {
  return {
    codigo: siguienteCodigo(n),
    nombre: v.nombre.trim(),
    email: v.email.trim(),
    zona: EVENTO.zonas.find((z) => normalizar(z) === normalizar(v.zona)),
    local: normalizar(v.local),
    rol: v.rol,
    asistentes: Number(v.asistentes),
    pregunta: (v.pregunta ?? '').trim(),
    creada: ahora.toISOString()
  }
}

/** 12 inscripciones sintéticas que ocupan 18 de las 40 plazas. */
export function datosEjemplo() {
  const filas = [
    ['Marta Pérez', 'Polígono de Carrús', '12', 'Titular', 2],
    ['Javier Soler', 'Polígono de Carrús', '7A', 'Equipo', 1],
    ['Lucía Ibáñez', 'Polígono de Altabix', '12', 'Titular', 2],
    ['Andrés Mira', 'Polígono de Altabix', '30', 'Titular', 1],
    ['Elena Gómez', 'Elche Parque Empresarial', '105', 'Equipo', 2],
    ['Pablo Ruiz', 'Elche Parque Empresarial', '8', 'Titular', 1],
    ['Sara Navarro', 'Polígono de Torrellano', '44B', 'Titular', 2],
    ['Diego Martínez', 'Polígono de Torrellano', '3', 'Equipo', 1],
    ['Rosa Valero', 'Polígono Babel', '21', 'Titular', 2],
    ['Tomás Carrasco', 'Polígono Babel', '1290', 'Titular', 1],
    ['Nuria Sempere', 'Centro ciudad', '5C', 'Titular', 2],
    ['Iván Botella', 'Centro ciudad', '18', 'Equipo', 1]
  ]
  const inscripciones = filas.map(([nombre, zona, local, rol, asistentes], i) => ({
    codigo: siguienteCodigo(i + 1),
    nombre,
    email: nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(' ', '.') + '@example.com',
    zona, local, rol, asistentes,
    pregunta: i === 0 ? '¿Tengo que cambiar de programa si facturo con Excel?' : '',
    creada: '2026-11-20T10:00:00.000Z'
  }))
  return { inscripciones, siguiente: 13 }
}

/* ---------- Persistencia: solo toca su propia clave ---------- */
export function cargar(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
    const d = datosEjemplo()
    storage.setItem(STORAGE_KEY, JSON.stringify(d))
    return d
  } catch {
    return datosEjemplo()
  }
}
export function guardar(storage, datos, { simularFallo = false } = {}) {
  if (simularFallo) throw new Error('Fallo simulado de guardado')
  storage.setItem(STORAGE_KEY, JSON.stringify(datos))
}
export function restablecer(storage) {
  const d = datosEjemplo()
  try { storage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch { /* sin almacenamiento */ }
  return d
}

/* ---------- Archivo .ics (no crea inscripciones) ---------- */
const icsEscape = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
const icsFechaHora = (fecha, hora) => fecha.replace(/-/g, '') + 'T' + hora.replace(':', '') + '00'

export function generarICS(ev = EVENTO, ahora = new Date()) {
  const stamp = ahora.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gestoria Palmeral//Charla//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Madrid',
    'BEGIN:STANDARD',
    'DTSTART:19701025T030000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'TZNAME:CET',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'TZNAME:CEST',
    'END:DAYLIGHT',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:charla-${ev.fecha}@gestoria-palmeral.example`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${ev.zonaHoraria}:${icsFechaHora(ev.fecha, ev.horaInicio)}`,
    `DTEND;TZID=${ev.zonaHoraria}:${icsFechaHora(ev.fecha, ev.horaFin)}`,
    `SUMMARY:${icsEscape(ev.titulo)}`,
    `LOCATION:${icsEscape(ev.lugar)}`,
    `DESCRIPTION:${icsEscape('Charla abierta de ' + ev.organizador + '. Trae tus dudas.')}`,
    'END:VEVENT',
    'END:VCALENDAR',
    ''
  ].join('\r\n')
}
