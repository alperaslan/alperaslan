const LOGIN = 'alperaslan'
const OUT = new URL('../assets/monthly-contributions.svg', import.meta.url)

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
const months = [...byMonth.keys()].sort().slice(-12)
const values = months.map(m => byMonth.get(m))
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const label = m => MONTH_NAMES[Number(m.slice(5)) - 1] + (m.slice(5) === '01' || m === months[0] ? ` '${m.slice(2, 4)}` : '')

const W = 900, H = 260, L = 52, R = 20, T = 58, B = 34
const plotW = W - L - R, plotH = H - T - B, baseY = T + plotH
const maxV = Math.max(...values, 1)
const pow = Math.pow(10, Math.floor(Math.log10(maxV)))
const yMax = [1, 2, 2.5, 5, 10].map(k => k * pow).find(v => v >= maxV)
const ticks = [0, yMax / 2, yMax]
const slotW = plotW / months.length
const barW = 24
const y = v => baseY - (v / yMax) * plotH

const iMax = values.indexOf(Math.max(...values))
const iMin = values.indexOf(Math.min(...values))
const labeled = new Set([iMax, iMin, values.length - 1])

const bar = (x, v) => {
  if (v === 0) return ''
  const h = Math.max(baseY - y(v), 3), top = baseY - h, r = Math.min(4, h)
  return `<path d="M${x.toFixed(1)},${baseY} V${(top + r).toFixed(1)} Q${x.toFixed(1)},${top.toFixed(1)} ${(x + r).toFixed(1)},${top.toFixed(1)} H${(x + barW - r).toFixed(1)} Q${(x + barW).toFixed(1)},${top.toFixed(1)} ${(x + barW).toFixed(1)},${(top + r).toFixed(1)} V${baseY} Z" fill="#2ea043"/>`
}

const fmt = n => n.toLocaleString('en-US')
const today = new Date().toISOString().slice(0, 10)
const parts = []
parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none" role="img" aria-label="Monthly contributions, last 12 months, total ${fmt(cal.totalContributions)}">`)
parts.push(`<style>.title{font:600 16px 'Segoe UI',Ubuntu,Sans-Serif;fill:#2ea043}.sub{font:400 10px 'Segoe UI',Ubuntu,Sans-Serif;fill:#8b949e}.tick{font:400 10px 'Segoe UI',Ubuntu,Sans-Serif;fill:#8b949e}.val{font:600 11px 'Segoe UI',Ubuntu,Sans-Serif;fill:#8b949e}</style>`)
parts.push(`<text x="${L}" y="26" class="title">Monthly Contributions</text>`)
parts.push(`<text x="${L}" y="44" class="sub">last 12 months &#183; total ${fmt(cal.totalContributions)} &#183; private included &#183; current month is month-to-date &#183; updated ${today}</text>`)
for (const t of ticks) {
  parts.push(`<line x1="${L}" y1="${y(t).toFixed(1)}" x2="${W - R}" y2="${y(t).toFixed(1)}" stroke="#8b949e" stroke-opacity="0.18" stroke-width="1"/>`)
  parts.push(`<text x="${L - 8}" y="${(y(t) + 3.5).toFixed(1)}" text-anchor="end" class="tick">${fmt(t)}</text>`)
}
months.forEach((m, i) => {
  const x = L + i * slotW + (slotW - barW) / 2
  parts.push(bar(x, values[i]))
  parts.push(`<text x="${(x + barW / 2).toFixed(1)}" y="${baseY + 18}" text-anchor="middle" class="tick">${label(m)}</text>`)
  if (labeled.has(i)) parts.push(`<text x="${(x + barW / 2).toFixed(1)}" y="${(y(values[i]) - 6).toFixed(1)}" text-anchor="middle" class="val">${fmt(values[i])}</text>`)
})
parts.push('</svg>')

const { writeFileSync } = await import('node:fs')
writeFileSync(OUT, parts.join('\n') + '\n')
console.log(`OK: ${months.length} months, total ${cal.totalContributions}, yMax ${yMax}`)
