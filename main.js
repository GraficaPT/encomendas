import { supabase } from './config.js'

// 1. Função para login com magic link
async function pedirLoginMagicLink() {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return session

  // Mostra formulário de email
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

// 2. Redireciona após autenticação pelo magic link
supabase.auth.onAuthStateChange((_event, session) => {
  if (session) {
    window.location.href = window.location.pathname
  }
})

// 3. Só carrega o resto se o user estiver autenticado
await pedirLoginMagicLink()
