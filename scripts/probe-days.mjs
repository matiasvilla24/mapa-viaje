// Sonda 3: resumen fiel de los 18 días del JSON del repo.
import fs from 'node:fs'

const state = JSON.parse(fs.readFileSync(new URL('europa-state.json', import.meta.url), 'utf8')).state
for (const d of state.days) {
  console.log('╔═', d.date, '·', d.place, '· dormir:', d.sleep || '—', '· hospedaje:', d.stay?.name || '—')
  console.log('║ actividades:', JSON.stringify(d.activities).slice(0, 700))
  console.log('║ legs:', d.legs ? d.legs.map(l => `${l.type || l.mode || ''} ${l.from||''}→${l.to||''} ${l.hour || l.time || ''}`).join(' | ') : '—')
}
