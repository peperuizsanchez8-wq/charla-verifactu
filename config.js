// Único objeto de configuración: fecha, temario, zonas y cupo se cambian aquí.
export const EVENTO = {
  organizador: 'Gestoría Palmeral',          // nombre de prueba
  titulo: 'Verifactu y factura electrónica: qué cambia en tu negocio',
  fecha: '2027-01-21',                       // AAAA-MM-DD
  horaInicio: '18:30',
  horaFin: '20:30',
  zonaHoraria: 'Europe/Madrid',
  lugar: 'Sala Ágora · Calle Ejemplo 12, 03203 Elche (Alicante)',
  cupo: 40,
  temario: [
    { horario: '18:30 – 19:00', titulo: 'Qué es Verifactu', detalle: 'Calendario de obligaciones, a quién afecta y qué pasa si no te adaptas.' },
    { horario: '19:00 – 19:30', titulo: 'Tu programa de facturación', detalle: 'Cómo saber si tu software cumple y qué preguntarle a tu proveedor.' },
    { horario: '19:30 – 20:00', titulo: 'Factura electrónica entre empresas', detalle: 'Plazos, formatos y cómo recibir y enviar facturas sin papel.' },
    { horario: '20:00 – 20:30', titulo: 'Preguntas abiertas', detalle: 'Resolvemos los casos que nos mandaste en el formulario.' }
  ],
  // Seis zonas de ejemplo. La clave única es zona + nave/local.
  zonas: [
    'Polígono de Carrús',
    'Polígono de Altabix',
    'Elche Parque Empresarial',
    'Polígono de Torrellano',
    'Polígono Babel',
    'Centro ciudad'
  ]
}

export const STORAGE_KEY = 'gestoriaPalmeral.charlaVerifactu.v1'
