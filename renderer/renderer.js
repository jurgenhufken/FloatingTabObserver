const $ = (id) => document.getElementById(id)
const panel = $('panel')
const browser = $('browser')
const audible = $('audible')
const title = $('title')
const url = $('url')
const audDot = $('audDot')
const statusMsg = $('statusMsg')

window.floatingTab.onTabInfo(({ browser: b = '', title: t = '', url: u = '', audible: a = false }) => {
  browser.textContent = b || '—'
  audible.textContent = a ? '🔊' : ''
  title.textContent = t || '—'
  url.textContent = u || '—'
  audDot.classList.toggle('on', !!a)
})
window.floatingTab.onMode(({ compact = false } = {}) => { panel.classList.toggle('compact', !!compact) })
window.floatingTab.onStatus(({ msg = '' } = {}) => { statusMsg.textContent = msg || '' })
