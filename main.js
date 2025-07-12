import { supabase } from './config.js'
import { fetchColunas, fetchEncomendas } from './supabase.js'
import { renderTabela, setColunas } from './tabela.js'

// --- Autenticação por Magic Link ---
async function pedirLoginMagicLink() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return session // Já autenticado

  // Mostra form para introduzir email
  const div = document.createElement('div')
  div.style.textAlign = 'center'
  div.innerHTML = `
    <h2>Acesso restrito</h2>
    <form id="magic-link-form">
      <input type="email" id="magic-link-email" placeholder="Email" required style="font-size:1.2rem;padding:0.5rem;" />
      <button type="submit" style="font-size:1.2rem;padding:0.5rem 2rem;">Receber link de acesso</button>
    </form>
    <div id="magic-link-status"></div>
  `
  document.body.innerHTML = ''
  document.body.appendChild(div)

  document.getElementById('magic-link-form').onsubmit = async (e) => {
    e.preventDefault()
    const email = document.getElementById('magic-link-email').value
    document.getElementById('magic-link-status').textContent = 'A enviar link…'
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) {
      document.getElementById('magic-link-status').textContent = 'Erro: ' + error.message
    } else {
      document.getElementById('magic-link-status').textContent = 'Verifica o teu email e clica no link para aceder.'
    }
  }
}

// --- Só faz reload automático no evento certo (evita loops infinitos) ---
supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_IN" && session) {
    // Só faz reload se vier com parâmetros na URL (magic link)
    if (window.location.search || window.location.hash) {
      window.location.href = window.location.pathname
    }
  }
})

// --- Garante que processa a sessão vinda do magic link logo ao entrar ---
await supabase.auth.getSession()

// --- Só carrega a app para utilizadores autenticados ---
await pedirLoginMagicLink()

// --- O resto do teu código só corre depois de autenticado ---
async function carregarTudo() {
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
