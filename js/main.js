import { fetchColunas, fetchEncomendas, verifyPassword } from './supabase.js'
import { renderTabela, setColunas } from './tabela.js'

function showPasswordForm(msg = 'Acesso restrito') {
  const div = document.createElement('div')
  div.className = 'auth-wrapper'
  div.innerHTML = `
    <h2 class="auth-title">${msg}</h2>
    <form id="pwd-form" class="auth-form">
      <input type="password" id="master-pwd" placeholder="Password" required class="auth-input" />
      <button type="submit" class="auth-btn">Entrar</button>
    </form>
    <p id="pwd-status" class="auth-status"></p>
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
      status.classList.add('error')
      status.textContent = err.message
    }
  })
}

async function garantirSessao() {
  const pwd = sessionStorage.getItem('app_pwd')
  if (!pwd) { showPasswordForm(); return false }
  const ok = await verifyPassword(pwd).catch(() => false)
  if (!ok) {
    sessionStorage.removeItem('app_pwd')
    showPasswordForm('Sessão expirada ou password inválida')
    return false
  }
  return true
}

async function carregarTudo() {
  const has = await garantirSessao()
  if (!has) return

  // layout base — mantém classes genéricas
  document.body.innerHTML = `
    <div id="status" class="status"></div>
    <div class="controls">
      <button id="btn-add" class="btn btn-add">➕ Adicionar</button>
      <button id="btn-del" class="btn btn-del">🗑️ Remover</button>
      <button id="btn-save" class="btn btn-save">🔄 Atualizar</button>
      <button id="btn-logout" class="btn btn-logout">🚪 Logout</button>
    </div>
    <div class="tabela-wrapper" id="tabela-wrapper"></div>
  `

  document.getElementById('btn-logout').onclick = () => { sessionStorage.removeItem('app_pwd'); location.reload() }

  const status = document.getElementById('status')
  status.textContent = 'A carregar…'
  try {
    const colunas = await fetchColunas()
    const dados = await fetchEncomendas()
    setColunas(colunas)
    // renderTabela liga automaticamente os botões pelos IDs acima
    renderTabela(colunas, dados)
    status.textContent = ''
  } catch (err) {
    status.textContent = 'Erro ao carregar dados.'
    console.error(err)
  }
}

carregarTudo()
