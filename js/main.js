import { fetchColunas, fetchEncomendas, verifyPassword, getPwdDebug } from './supabase.js'

// logger simples
const DBG = true;
function log(...a){ if (DBG) console.log('[APP]', ...a) }
window.addEventListener('error', (e)=>console.error('[APP][onerror]', e.message, e.error))

function showPasswordForm(msg='Acesso restrito') {
  log('showPasswordForm()', { msg })
  const div = document.createElement('div')
  div.style.textAlign = 'center'
  div.innerHTML = `
    <h2>${msg}</h2>
    <form id="pwd-form" style="display:inline-flex; gap:.5rem; align-items:center;">
      <input type="password" id="master-pwd" placeholder="Password" required style="font-size:1.1rem;padding:.5rem;min-width:260px" />
      <button type="submit" style="font-size:1.1rem;padding:.55rem 1.25rem;">Entrar</button>
    </form>
    <p id="pwd-status" style="margin-top:.75rem;color:#999"></p>
  `
  document.body.innerHTML = ''
  document.body.appendChild(div)

  document.getElementById('pwd-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const pwd = document.getElementById('master-pwd').value
    const status = document.getElementById('pwd-status')
    status.textContent = 'A validar…'
    log('submit password', { pwdLen: pwd?.length })

    try {
      const ok = await verifyPassword(pwd)
      log('verifyPassword() =>', ok)
      if (!ok) throw new Error('Password inválida')
      sessionStorage.setItem('app_pwd', pwd)
      location.reload()
    } catch (err) {
      console.error('[APP] verifyPassword error', err)
      status.style.color = '#c00'
      status.textContent = err.message
    }
  })
}

async function garantirSessao() {
  const pwd = sessionStorage.getItem('app_pwd')
  log('garantirSessao()', { hasPwd: !!pwd, pwdPreview: getPwdDebug() })
  if (!pwd) { showPasswordForm(); return false }
  try {
    const ok = await verifyPassword(pwd)
    log('verifyPassword(session) =>', ok)
    if (!ok) throw new Error('Sessão inválida')
    return true
  } catch (e) {
    console.error('[APP] garantirSessao error', e)
    sessionStorage.removeItem('app_pwd')
    showPasswordForm('Sessão expirada ou password inválida')
    return false
  }
}

async function carregarTudo() {
  log('carregarTudo() start')
  const has = await garantirSessao()
  if (!has) return

  // layout
  document.body.innerHTML = `
    <div id="status"></div>
    <div style="display:flex; gap:.5rem; margin-bottom:1rem;">
      <button id="btn-reload">Reload</button>
      <button id="btn-logout">Logout</button>
    </div>
    <pre id="debug" style="background:#111;color:#0f0;padding:.5rem;max-height:25vh;overflow:auto;display:none"></pre>
    <div class="tabela-wrapper" id="tabela-wrapper"></div>
  `
  document.getElementById('btn-reload').onclick = () => location.reload()
  document.getElementById('btn-logout').onclick = () => { sessionStorage.removeItem('app_pwd'); location.reload() }

  const statusEl = document.getElementById('status')
  const debugEl  = document.getElementById('debug')
  function dbg(msg, obj) {
    debugEl.style.display = 'block'
    debugEl.textContent += `\n${msg} ${obj ? JSON.stringify(obj, null, 2) : ''}`
  }

  statusEl.textContent = 'A carregar colunas…'
  try {
    const colunas = await fetchColunas()
    log('fetchColunas() =>', colunas)
    dbg('colunas', colunas)

    statusEl.textContent = 'A carregar encomendas…'
    const dados = await fetchEncomendas()
    log('fetchEncomendas() =>', { rows: dados?.length })
    dbg('encomendas:rows', { rows: dados?.length })

    // render muito simples para debug (só para confirmar chegada de dados)
    const wrap = document.getElementById('tabela-wrapper')
    if (!colunas?.length) {
      statusEl.textContent = 'Sem colunas — confirmar view e permissões.'
      return
    }
    const table = document.createElement('table')
    table.border = '1'
    const thead = document.createElement('thead')
    const trH = document.createElement('tr')
    for (const c of colunas) {
      const th = document.createElement('th')
      th.textContent = c.nome?.toUpperCase?.() || c.column_name?.toUpperCase?.()
      trH.appendChild(th)
    }
    thead.appendChild(trH)
    table.appendChild(thead)

    const tbody = document.createElement('tbody')
    for (const row of (dados || [])) {
      const tr = document.createElement('tr')
      for (const c of colunas) {
        const td = document.createElement('td')
        const key = c.nome || c.column_name
        td.textContent = row[key] ?? ''
        tr.appendChild(td)
      }
      tbody.appendChild(tr)
    }
    table.appendChild(tbody)
    wrap.appendChild(table)

    statusEl.textContent = dados?.length ? '' : 'Sem dados.'
  } catch (err) {
    console.error('[APP] carregarTudo error', err)
    statusEl.textContent = 'Erro ao carregar (ver consola).'
    dbg('erro', { message: err?.message, stack: err?.stack })
  }
}

carregarTudo()
