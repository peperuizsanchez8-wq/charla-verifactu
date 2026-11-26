import React, { useMemo, useRef, useState } from 'react'
import { EVENTO, STORAGE_KEY } from './config.js'
import {
  cargar, guardar, restablecer, validar, crearInscripcion, libres, ocupados, generarICS
} from './logic.js'

const VACIO = { nombre: '', email: '', zona: '', local: '', rol: '', asistentes: '1', pregunta: '' }
const store = (() => { try { return window.localStorage } catch { return null } })()
const memoria = { _d: {}, getItem(k) { return this._d[k] ?? null }, setItem(k, v) { this._d[k] = String(v) } }
const almacen = store ?? memoria

const fechaLarga = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
  .format(new Date(EVENTO.fecha + 'T12:00:00Z'))

function Campo({ id, label, req, error, children, hint }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {req ? <span className="text-brand">*</span> : <span className="font-normal text-slate-500">(opcional)</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p className="err" id={`${id}-err`}>{error}</p>}
    </div>
  )
}

export default function App() {
  const [datos, setDatos] = useState(() => cargar(almacen))
  const [form, setForm] = useState(VACIO)
  const [errores, setErrores] = useState({})
  const [general, setGeneral] = useState('')
  const [fallo, setFallo] = useState('')
  const [confirmada, setConfirmada] = useState(null)
  const [simularFallo, setSimularFallo] = useState(false)
  const [intentado, setIntentado] = useState(false)
  const formRef = useRef(null)

  const quedan = libres(datos.inscripciones)
  const completa = quedan === 0
  const pct = Math.round((ocupados(datos.inscripciones) / EVENTO.cupo) * 100)

  const set = (k) => (ev) => {
    const nuevo = { ...form, [k]: ev.target.value }
    setForm(nuevo)
    setGeneral('')
    if (intentado) setErrores(validar(nuevo, datos.inscripciones).errores)
  }

  function enviar(ev) {
    ev.preventDefault()
    setIntentado(true)
    setFallo('')
    setConfirmada(null)
    const { errores: e, general: g } = validar(form, datos.inscripciones)
    setErrores(e)
    setGeneral(g)
    if (Object.keys(e).length) {
      const primero = formRef.current?.querySelector('.invalid')
      primero?.focus()
      return
    }
    if (g) return
    const nueva = crearInscripcion(form, datos.siguiente)
    const candidato = { inscripciones: [...datos.inscripciones, nueva], siguiente: datos.siguiente + 1 }
    try {
      guardar(almacen, candidato, { simularFallo })
    } catch {
      setFallo('No pudimos guardar tu inscripción. Lo que escribiste sigue aquí: vuelve a intentarlo en unos segundos.')
      return
    }
    setDatos(candidato)
    setConfirmada(nueva)
    setForm(VACIO)
    setErrores({})
    setIntentado(false)
  }

  function descargarICS() {
    const blob = new Blob([generarICS()], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'charla-verifactu.ics'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const cls = (k) => `field-input${errores[k] ? ' invalid' : ''}`
  const aria = (k) => (errores[k] ? { 'aria-invalid': true, 'aria-describedby': `${k}-err` } : {})
  const ultimas = useMemo(() => [...datos.inscripciones].reverse(), [datos])

  return (
    <div className="min-h-screen">
      {/* 1. Encabezado */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-sand/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <p className="font-display text-xl leading-tight">
            {EVENTO.organizador} <span className="block font-sans text-xs font-medium text-slate-500 sm:inline">nombre de prueba</span>
          </p>
          <a href="#confirmar" className="shrink-0 rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">
            Confirmar asistencia
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        {/* 2. Datos del evento */}
        <section className="py-10 sm:py-14">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand">Charla abierta · gratuita</p>
          <h1 className="mt-2 font-display text-3xl leading-tight sm:text-5xl">{EVENTO.titulo}</h1>
          <p className="mt-4 max-w-2xl text-slate-600">
            Una charla práctica para autónomos y pymes de Elche: qué tienes que cambiar en tu facturación, cuándo y cómo hacerlo sin sustos.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-[1fr_1fr_1fr_1.2fr]">
            {[
              ['Fecha', fechaLarga],
              ['Hora', `${EVENTO.horaInicio} a ${EVENTO.horaFin}`],
              ['Lugar', EVENTO.lugar]
            ].map(([t, v]) => (
              <div key={t} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t}</p>
                <p className="mt-1 font-medium first-letter:uppercase">{v}</p>
              </div>
            ))}
            <div className={`rounded-xl p-4 ${completa ? 'bg-red-50 ring-1 ring-red-200' : 'bg-brand-soft'}`} aria-live="polite">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Plazas libres</p>
              <p className="mt-1 font-display text-4xl" data-testid="libres">{quedan}</p>
              <p className="text-sm text-slate-600">de {EVENTO.cupo}</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                <div className={`h-full ${completa ? 'bg-red-600' : 'bg-brand'}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        </section>

        {/* 3. Temario */}
        <section className="pb-12">
          <h2 className="font-display text-2xl sm:text-3xl">Temario</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2">
            {EVENTO.temario.map((b, i) => (
              <li key={i} className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand font-semibold text-white">{i + 1}</span>
                <div>
                  <p className="text-sm font-semibold text-brand">{b.horario}</p>
                  <p className="font-semibold">{b.titulo}</p>
                  <p className="text-sm text-slate-600">{b.detalle}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 4. Formulario */}
        <section id="confirmar" className="scroll-mt-20 pb-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl">Confirma tu asistencia</h2>
              <p className="mt-3 text-slate-600">
                Una inscripción por negocio (zona + nave o local), con un máximo de dos asistentes. Si te queda alguna duda concreta, déjala en la pregunta y la respondemos en el último bloque.
              </p>
              <button type="button" onClick={descargarICS}
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:border-brand">
                <span aria-hidden>📅</span> Añadir al calendario (.ics)
              </button>
            </div>

            <div>
              {confirmada && (
                <div className="mb-5 rounded-xl border border-emerald-300 bg-emerald-50 p-4" role="status">
                  <p className="font-semibold text-emerald-900">Asistencia confirmada · código {confirmada.codigo}</p>
                  <p className="text-sm text-emerald-900">
                    {confirmada.nombre}, {confirmada.zona}, nave o local {confirmada.local}: {confirmada.asistentes} {confirmada.asistentes === 1 ? 'plaza' : 'plazas'}. Guarda el código por si necesitas cambiar algo.
                  </p>
                </div>
              )}

              {completa ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center" role="alert">
                  <p className="font-display text-2xl text-red-800">Sala completa</p>
                  <p className="mt-1 text-sm text-red-800">No quedan plazas para esta charla. Puedes añadirla al calendario por si se libera algún hueco.</p>
                </div>
              ) : (
                <form ref={formRef} onSubmit={enviar} noValidate className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
                  {fallo && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{fallo}</div>}
                  {general && <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert">{general}</div>}

                  <Campo id="nombre" label="Nombre" req error={errores.nombre}>
                    <input id="nombre" className={cls('nombre')} value={form.nombre} onChange={set('nombre')} autoComplete="name" {...aria('nombre')} />
                  </Campo>
                  <Campo id="email" label="Email" req error={errores.email}>
                    <input id="email" type="email" className={cls('email')} value={form.email} onChange={set('email')} autoComplete="email" {...aria('email')} />
                  </Campo>
                  <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
                    <Campo id="zona" label="Zona" req error={errores.zona}>
                      <select id="zona" className={cls('zona')} value={form.zona} onChange={set('zona')} {...aria('zona')}>
                        <option value="">Elige una zona</option>
                        {EVENTO.zonas.map((z) => <option key={z}>{z}</option>)}
                      </select>
                    </Campo>
                    <Campo id="local" label="Nave o local" req error={errores.local} hint="Ej.: 12 o 12B">
                      <input id="local" className={cls('local')} value={form.local} onChange={set('local')} inputMode="text" maxLength={8} {...aria('local')} />
                    </Campo>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <fieldset>
                      <legend className="label">Eres <span className="text-brand">*</span></legend>
                      <div className="flex gap-2">
                        {['Titular', 'Equipo'].map((r) => (
                          <label key={r} className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm ${form.rol === r ? 'border-brand bg-brand-soft' : errores.rol ? 'border-red-600' : 'border-slate-300'}`}>
                            <input type="radio" name="rol" value={r} checked={form.rol === r} onChange={set('rol')} className={`accent-brand ${errores.rol ? 'invalid' : ''}`} />
                            {r === 'Titular' ? 'Titular' : 'Parte del equipo'}
                          </label>
                        ))}
                      </div>
                      {errores.rol && <p className="err">{errores.rol}</p>}
                    </fieldset>
                    <Campo id="asistentes" label="Asistentes" req error={errores.asistentes}>
                      <select id="asistentes" className={cls('asistentes')} value={form.asistentes} onChange={set('asistentes')}>
                        <option value="1">1 persona</option>
                        <option value="2">2 personas</option>
                      </select>
                    </Campo>
                  </div>
                  <Campo id="pregunta" label="Pregunta para la charla" error={errores.pregunta}>
                    <textarea id="pregunta" rows={3} maxLength={300} className={cls('pregunta')} value={form.pregunta} onChange={set('pregunta')}
                      placeholder="¿Qué caso concreto quieres que tratemos?" />
                    <p className={`mt-1 text-right text-xs ${form.pregunta.length >= 300 ? 'text-red-700' : 'text-slate-500'}`}>{form.pregunta.length} / 300</p>
                  </Campo>
                  <button type="submit" className="w-full rounded-full bg-brand py-3 font-semibold text-white hover:bg-brand-dark">
                    Confirmar asistencia
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Vista de la organización (para la demo) */}
      <section className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-brand">Vista de la organización</p>
              <h2 className="font-display text-2xl">Inscripciones ({datos.inscripciones.length}) · {ocupados(datos.inscripciones)} de {EVENTO.cupo} plazas</h2>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={simularFallo} onChange={(e) => setSimularFallo(e.target.checked)} className="accent-brand" />
                Simular fallo de guardado
              </label>
              <button type="button" onClick={() => { setDatos(restablecer(almacen)); setConfirmada(null) }}
                className="rounded-full border border-slate-300 px-4 py-2 font-semibold text-ink hover:border-brand">
                Restablecer datos de ejemplo
              </button>
            </div>
          </div>
          <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr><th className="p-3">Código</th><th className="p-3">Nombre</th><th className="p-3">Zona</th><th className="p-3">Nave/local</th><th className="p-3">Rol</th><th className="p-3">Plazas</th><th className="p-3">Pregunta</th></tr>
              </thead>
              <tbody>
                {ultimas.map((i) => (
                  <tr key={i.codigo} className="border-t border-slate-100">
                    <td className="p-3 font-semibold">{i.codigo}</td>
                    <td className="p-3">{i.nombre}</td>
                    <td className="p-3">{i.zona}</td>
                    <td className="p-3">{i.local}</td>
                    <td className="p-3">{i.rol}</td>
                    <td className="p-3">{i.asistentes}</td>
                    <td className="p-3 text-slate-600">{i.pregunta || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">Guardado en localStorage, clave <code className="rounded bg-slate-100 px-1">{STORAGE_KEY}</code>. No se toca ninguna otra clave.</p>
        </div>
      </section>

      <footer className="py-6 text-center text-xs text-slate-500">
        {EVENTO.organizador} es un nombre de prueba. Demo con datos sintéticos.
      </footer>
    </div>
  )
}
