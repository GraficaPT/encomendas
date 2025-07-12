import { fetchColunas, fetchEncomendas } from './supabase.js'
import { renderTabela, setColunas } from './tabela.js'

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
