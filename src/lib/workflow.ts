/** Eén centraal overzicht van de ELKO-werkstappen. Bestaande statussen blijven geldig. */
export const WORKFLOW = [
  { label: 'Aanvraag', description: 'Klant en project', statuses: ['Nieuwe aanvraag'] },
  { label: 'Inmeting', description: 'Afspraak en maatvoering', statuses: ['Inmeting gepland', 'Ingemeten'] },
  { label: 'Offerte', description: 'Prijsvoorstel en akkoord', statuses: ['Offerte gemaakt', 'Offerte verzonden', 'Akkoord / opdracht', 'Akkoord klant'] },
  { label: 'Bestelling', description: 'Productie en levering', statuses: ['Bestelling doorgezet'] },
  { label: 'Montage', description: 'Montage en nazorg', statuses: ['Montage gepland', 'Gemonteerd', 'Afgerond'] },
] as const

export function workflowStage(status: string): number {
  const i = WORKFLOW.findIndex(step => (step.statuses as readonly string[]).includes(status))
  return i < 0 ? (status === 'Geannuleerd' ? -1 : 0) : i
}

export function nextProjectAction(status: string): { label: string; action: 'appointment' | 'measure' | 'quote' | 'status' | 'photos'; target?: string } {
  switch (status) {
    case 'Nieuwe aanvraag': return { label: 'Inmeting plannen', action: 'appointment' }
    case 'Inmeting gepland': return { label: 'Producten inmeten', action: 'measure' }
    case 'Ingemeten': return { label: 'Offerte opstellen', action: 'quote' }
    case 'Offerte gemaakt': return { label: 'Offerte bekijken / versturen', action: 'quote' }
    case 'Offerte verzonden': return { label: 'Klantakkoord registreren', action: 'status' }
    case 'Akkoord / opdracht': return { label: 'Bestelling voorbereiden', action: 'status' }
    case 'Bestelling doorgezet': return { label: 'Montage plannen', action: 'appointment' }
    case 'Montage gepland': return { label: 'Montagefoto toevoegen', action: 'photos' }
    default: return { label: 'Project bekijken', action: 'status' }
  }
}
