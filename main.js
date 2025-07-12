import { supabase } from './config.js'
import { fetchColunas, fetchEncomendas } from './supabase.js'
import { renderTabela, setColunas } from './tabela.js'

// --- Autenticação por Magic Link ---
async function pedirLoginMagicLink() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return session // Já autenticado
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
