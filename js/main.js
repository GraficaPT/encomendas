import { supabase } from './config.js'
import { fetchColunas, fetchEncomendas, verifyPassword } from './supabase.js'
import { renderTabela, setColunas } from './tabela.js'

// --- Mostrar formulário de password ---
function showPasswordForm(msg = 'Acesso restrito') {
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
    try {
      const ok = await verifyPassword(pwd)
      if (!ok) throw new Error('Password inválida')
      sessionStorage.setItem('app_pwd', pwd)
      location.reload()
    } catch (err) {
      status.style.color = '#c00'
      status.textContent = err.message
    }
  })
}

// --- Garantir sessão válida ---
async function garantirSessao() {
  const pwd = sessionStorage.getItem('app_pwd')
  if (!pwd) {
    showPasswordForm()
    return false
  }
  const ok = await verifyPassword(pwd).catch(() => false)
  if (!ok) {
    sessionStorage.removeItem('app_pwd')
    showPasswordForm('Sessão expirada ou password inválida')
    return false
  }
  return true
}

// --- Carregar dados ---
async function carregarTudo() {
  const has = await garantirSessao()
  if (!has) return

  // Estrutura principal
  document.body.innerHTML = `
    <div id="status"></div>
    <div class="tabela-wrapper" id="tabela-wrapper"></div>
  `

  document.getElementById('status').textContent = 'A carregar…'
  try {
    const colunas = await fetchColunas()
    const dados = await fetchEncomendas()
    setColunas(colunas)
    renderTabela(colunas, dados)
    document.getElementById('status').textContent = ''
  } catch (err) {
    console.error(err)
    document.getElementById('status').textContent = 'Erro ao carregar dados.'
  }
}

carregarTudo()
