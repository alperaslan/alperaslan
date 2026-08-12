const LOGIN = 'alperaslan'
const OUT = new URL('../assets/monthly-activity.svg', import.meta.url)

const token = process.env.GITHUB_TOKEN
if (!token) { console.error('GITHUB_TOKEN missing'); process.exit(1) }

const query = `{ user(login:"${LOGIN}") { contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } } } } }`

const res = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': LOGIN },
  body: JSON.stringify({ query }),
})
const body = await res.json()
if (!body.data) { console.error(JSON.stringify(body)); process.exit(1) }

const cal = body.data.user.contributionsCollection.contributionCalendar
const byMonth = new Map()
for (const w of cal.weeks) for (const d of w.contributionDays) {
  const m = d.date.slice(0, 7)
  byMonth.set(m, (byMonth.get(m) || 0) + d.contributionCount)
}
const FROZEN_UNLINKED_WORK_COMMITS = {
  '2026-03': 615, '2026-04': 545, '2026-05': 390,
  '2026-06': 313, '2026-07': 624, '2026-08': 118,
}
const months = [...byMonth.keys()].sort().slice(-12)
const values = months.map(m => byMonth.get(m) + (FROZEN_UNLINKED_WORK_COMMITS[m] || 0))
const shownTotal = values.reduce((a, b) => a + b, 0)
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const label = m => MONTH_NAMES[Number(m.slice(5)) - 1] + (m.slice(5) === '01' || m === months[0] ? ` '${m.slice(2, 4)}` : '')

const W = 900, H = 260, L = 52, R = 20, T = 58, B = 34
const plotW = W - L - R, plotH = H - T - B, baseY = T + plotH
const maxV = Math.max(...values, 1)
const pow = Math.pow(10, Math.floor(Math.log10(maxV)))
const yMax = [1, 2, 2.5, 5, 10].map(k => k * pow).find(v => v >= maxV)
const ticks = [0, yMax / 2, yMax]
const slotW = plotW / months.length
const y = v => baseY - (v / yMax) * plotH
const px = i => L + i * slotW + slotW / 2

const iMax = values.indexOf(Math.max(...values))
const iMin = values.indexOf(Math.min(...values))
const labeled = new Set([iMax, iMin, values.length - 1])

const pts = values.map((v, i) => `${px(i).toFixed(1)},${y(v).toFixed(1)}`)
const linePath = `M${pts.join(' L')}`
const areaPath = `${linePath} L${px(values.length - 1).toFixed(1)},${baseY} L${px(0).toFixed(1)},${baseY} Z`

const fmt = n => n.toLocaleString('en-US')
const today = new Date().toISOString().slice(0, 10)
const parts = []
parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-label="Monthly contributions, last 12 months, total ${fmt(shownTotal)}">`)
parts.push(`<style>.title{font:600 16px 'Segoe UI',Ubuntu,Sans-Serif;fill:#2ea043}.sub{font:400 10px 'Segoe UI',Ubuntu,Sans-Serif;fill:#8b949e}.tick{font:400 10px 'Segoe UI',Ubuntu,Sans-Serif;fill:#8b949e}.val{font:600 11px 'Segoe UI',Ubuntu,Sans-Serif;fill:#8b949e}</style>`)
parts.push(`<text x="${L}" y="26" class="title">Monthly Contributions</text>`)
parts.push(`<text x="${L}" y="44" class="sub">last 12 months &#183; total ${fmt(shownTotal)} &#183; private &amp; work commits included &#183; current month is month-to-date &#183; updated ${today}</text>`)
for (const t of ticks) {
  parts.push(`<line x1="${L}" y1="${y(t).toFixed(1)}" x2="${W - R}" y2="${y(t).toFixed(1)}" stroke="#8b949e" stroke-opacity="0.18" stroke-width="1"/>`)
  parts.push(`<text x="${L - 8}" y="${(y(t) + 3.5).toFixed(1)}" text-anchor="end" class="tick">${fmt(t)}</text>`)
}
parts.push(`<path d="${areaPath}" fill="#2ea043" fill-opacity="0.1"/>`)
parts.push(`<path d="${linePath}" stroke="#2ea043" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" fill="none"/>`)
months.forEach((m, i) => {
  parts.push(`<circle cx="${px(i).toFixed(1)}" cy="${y(values[i]).toFixed(1)}" r="4" fill="#2ea043"/>`)
  parts.push(`<text x="${px(i).toFixed(1)}" y="${baseY + 18}" text-anchor="middle" class="tick">${label(m)}</text>`)
  if (labeled.has(i)) parts.push(`<text x="${px(i).toFixed(1)}" y="${(y(values[i]) - 10).toFixed(1)}" text-anchor="middle" class="val">${fmt(values[i])}</text>`)
})
parts.push('</svg>')

const { writeFileSync } = await import('node:fs')
writeFileSync(OUT, parts.join('\n') + '\n')

const STATS_OUT = new URL('../assets/stats-card.svg', import.meta.url)
const avg = Math.round(shownTotal / months.length)
const best = values[iMax], bestLabel = label(months[iMax]).replace(/ '/, " '")
const current = values[values.length - 1]
const compact = n => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : String(n)
const rows = [
  ['Total Contributions (last year):', fmt(shownTotal)],
  ['Monthly Average:', fmt(avg)],
  [`Best Month (${bestLabel}):`, fmt(best)],
  ['This Month (to date):', fmt(current)],
]
const cw = 440, ch = 165, rcx = 360, rcy = 96, rr = 42
const pct = Math.min(current / best, 1)
const circ = 2 * Math.PI * rr
const sp = []
sp.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}" viewBox="0 0 ${cw} ${ch}" fill="none" role="img" aria-label="GitHub stats: ${rows.map(r => r.join(' ')).join(', ')}">`)
sp.push(`<style>.title{font:600 16px 'Segoe UI',Ubuntu,Sans-Serif;fill:#2ea043}.sub{font:400 10px 'Segoe UI',Ubuntu,Sans-Serif;fill:#8b949e}.lbl{font:400 12px 'Segoe UI',Ubuntu,Sans-Serif;fill:#9198a1}.num{font:600 12px 'Segoe UI',Ubuntu,Sans-Serif;fill:#9198a1}.big{font:700 20px 'Segoe UI',Ubuntu,Sans-Serif;fill:#2ea043}</style>`)
sp.push(`<text x="25" y="31" class="title">Alper Aslan's GitHub Stats</text>`)
sp.push(`<text x="25" y="46" class="sub">incl. private &amp; work commits &#183; updated ${today}</text>`)
rows.forEach((r, i) => {
  const ry = 72 + i * 24
  sp.push(`<circle cx="30" cy="${ry - 4}" r="3" fill="#2ea043"/>`)
  sp.push(`<text x="42" y="${ry}" class="lbl">${r[0]}</text>`)
  sp.push(`<text x="252" y="${ry}" class="num">${r[1]}</text>`)
})
sp.push(`<circle cx="${rcx}" cy="${rcy}" r="${rr}" stroke="#2ea043" stroke-opacity="0.15" stroke-width="7"/>`)
sp.push(`<circle cx="${rcx}" cy="${rcy}" r="${rr}" stroke="#2ea043" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(pct * circ).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 ${rcx} ${rcy})"/>`)
sp.push(`<text x="${rcx}" y="${rcy + 2}" text-anchor="middle" class="big">${compact(shownTotal)}</text>`)
sp.push(`<text x="${rcx}" y="${rcy + 18}" text-anchor="middle" class="sub">contributions</text>`)
sp.push(`<text x="${rcx}" y="${rcy + rr + 16}" text-anchor="middle" class="sub">ring: this month vs best</text>`)
sp.push('</svg>')
writeFileSync(STATS_OUT, sp.join('\n') + '\n')
console.log(`OK: ${months.length} months, total ${shownTotal}, yMax ${yMax}, stats card current/best ${current}/${best}`)
