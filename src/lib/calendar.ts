import type { Appointment } from './types'

function formatIcsDate(dateValue: string) {
  const date = new Date(dateValue)
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function escapeIcsText(value?: string | null) {
  return (value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
}

export function buildIcs(appointment: Appointment) {
  const uid = `${appointment.id}@elkosolutions.nl`
  const now = formatIcsDate(new Date().toISOString())

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ELKO Solutions//App v1//NL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${formatIcsDate(appointment.starts_at)}`,
    `DTEND:${formatIcsDate(appointment.ends_at)}`,
    `SUMMARY:${escapeIcsText(appointment.title)}`,
    `LOCATION:${escapeIcsText(appointment.location)}`,
    `DESCRIPTION:${escapeIcsText(appointment.notes)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

export function downloadIcs(appointment: Appointment) {
  const ics = buildIcs(appointment)
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${appointment.title.replaceAll(' ', '-')}.ics`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
