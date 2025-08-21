import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// --------------------------------------------------
// Configurações Supabase & Google Apps Script
// --------------------------------------------------
const SUPABASE_URL  = 'https://nbcmqkcztuogflejswau.supabase.co'
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5iY21xa2N6dHVvZ2ZsZWpzd2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2ODY4OTMsImV4cCI6MjA2NTI2Mjg5M30.Rf4yHxgo_bh56tXwHn3jJgJQr0tOCbXc2rQU1R26tv8'
const GSCRIPT_URL   = 'https://script.google.com/macros/s/AKfycbwPUUtQZyrM7M17c5elXLDyqw1ZY_GznlmXH0BbUwruJBxxfSRh-apUqpQx0CA_x-m5/exec'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON)

// --------------------------------------------------
// Estado global
// --------------------------------------------------
let colunas = []               // nomes de colunas vindas da view
const selectedIds = new Set()  // linhas actualmente seleccionadas

// --------------------------------------------------
// Estilo para realce e inputs
// --------------------------------------------------
;(function injectStyles () {
  const style = document.createElement('style')
  style.textContent = `
    tr.selected          { background:#d0ebff; }
    #tabela-wrapper button { margin:0 0.25rem 0.5rem 0; }
    input[type=file]     { width:100%; }
  `
  document.head.appendChild(style)
})()

// --------------------------------------------------
// Utilitário de upload para o Drive via Apps Script
// --------------------------------------------------
async function uploadFileToDrive (file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)

    reader.onload = async () => {
      try {
        const base64 = reader.result.split(',')[1] // remove data URL prefix
        const body   = new URLSearchParams()
        body.append('base64', base64)
        body.append('type',   file.type || 'application/octet-stream')
        body.append('name',   file.name)

        const res  = await fetch(GSCRIPT_URL, { method:'POST', body })
        if (!res.ok) throw new Error('Falha no upload: ' + res.status)
        const link = (await res.text()).trim()
        resolve(link)
      } catch (err) {
        reject(err)
      }
    }

    reader.readAsDataURL(file)
  })
}

// --------------------------------------------------
// Funções de fetch
// --------------------------------------------------
async function fetchColunas () {
  const { data, error } = await supabase
    .from('view_colunas_encomendas')
    .select('*')
  if (error) throw error
  return data.map(c => c.column_name)
}

async function fetchEncomendas () {
  const { data, error } = await supabase
    .from('Encomendas')
    .select('*')
    .order('id', { ascending:true })
  if (error) throw error
  return data
}

// --------------------------------------------------
// Selecção e remoção de linhas
// --------------------------------------------------
function toggleSelecaoLinha (tr, id) {
  if (selectedIds.has(id)) {
    selectedIds.delete(id)
    tr.classList.remove('selected')
  } else {
    selectedIds.add(id)
    tr.classList.add('selected')
  }
}

async function removerSelecionadas () {
  if (!selectedIds.size) {
    alert('Seleccione pelo menos uma linha!')
    return
  }

  const idsArray = [...selectedIds]
  const { error } = await supabase.from('Encomendas').delete().in('id', idsArray)
  if (error) {
    alert('Erro ao remover: ' + error.message)
    return
  }
  selectedIds.clear()
  carregarTudo()
}

// --------------------------------------------------
// Criação de nova linha editável
// --------------------------------------------------
function criarLinhaEditavel (tbody) {
  const linha = document.createElement('tr')

  for (const nomeColuna of colunas) {
    const td = document.createElement('td')

    // Coluna ID (auto-gerada)
    if (nomeColuna === 'id') {
      td.textContent = '(auto)'
      linha.appendChild(td)
      continue
    }

    // Coluna Ficheiros – input file + upload automático
    if (nomeColuna === 'ficheiros') {
      const input = document.createElement('input')
      input.type  = 'file'
      input.name  = nomeColuna
      input.accept = '*/*'

      input.onchange = async e => {
        const file = e.target.files[0]
        if (!file) return
        td.innerHTML = '⏳ a enviar…'
        try {
          const link = await uploadFileToDrive(file)

          // Guardar link para posterior insert
          input.dataset.link = link

          // Render âncora
          td.innerHTML = ''
          const a   = document.createElement('a')
          a.href    = link
          a.target  = '_blank'
          a.textContent = file.name
          td.appendChild(a)
        } catch (err) {
          td.textContent = 'Erro'
          alert('Erro ao enviar ficheiro: ' + err.message)
        }
      }

      td.appendChild(input)
      linha.appendChild(td)
      continue
    }

    // Coluna Data – input date
    if (nomeColuna === 'data') {
      const input = document.createElement('input')
      input.type  = 'date'
      input.name  = nomeColuna
      input.valueAsDate = new Date()
      td.appendChild(input)
      linha.appendChild(td)
      continue
    }

    // Campos texto/numéricos genéricos
    const input = document.createElement('input')
    input.type  = 'text'
    input.name  = nomeColuna
    td.appendChild(input)
    linha.appendChild(td)
  }

  // Botão Guardar
  const tdBtn = document.createElement('td')
  const btnGuardar = document.createElement('button')
  btnGuardar.textContent = 'Guardar'
  btnGuardar.onclick = async () => {
    const novaEncomenda = {}

    linha.querySelectorAll('input').forEach(input => {
      let valor = null
      if (input.type === 'file') {
        valor = input.dataset.link || null
      } else if (input.type === 'number') {
        valor = parseInt(input.value) || null
      } else {
        valor = input.value || null
      }
      novaEncomenda[input.name] = valor
    })

    const { error } = await supabase.from('Encomendas').insert([novaEncomenda])
    if (error) {
      alert('Erro ao guardar: ' + error.message)
    } else {
      carregarTudo()
    }
  }

  tdBtn.appendChild(btnGuardar)
  linha.appendChild(tdBtn)
  tbody.appendChild(linha)
}

// --------------------------------------------------
// Renderização da tabela
// --------------------------------------------------
function renderTabela (dados) {
  const wrapper = document.getElementById('tabela-wrapper')
  wrapper.innerHTML = ''

  // Controles
  const controles = document.createElement('div')
  const btnAdd   = document.createElement('button')
  btnAdd.textContent = '➕ Adicionar'
  btnAdd.onclick     = () => criarLinhaEditavel(tbody)
  const btnRem   = document.createElement('button')
  btnRem.textContent = '🗑️ Remover'
  btnRem.onclick     = removerSelecionadas
  controles.appendChild(btnAdd)
  controles.appendChild(btnRem)

  // Tabela
  const tabela = document.createElement('table')
  const thead  = document.createElement('thead')
  const tbody  = document.createElement('tbody')

  // Cabeçalhos
  const trHead = document.createElement('tr')
  for (const nome of colunas) {
    const th = document.createElement('th')
    th.textContent = nome
    trHead.appendChild(th)
  }
  trHead.appendChild(document.createElement('th')).textContent = 'Ações'
  thead.appendChild(trHead)

  // Linhas de dados
  for (const item of dados) {
    const tr = document.createElement('tr')
    tr.dataset.id = item.id

    for (const nome of colunas) {
      const td = document.createElement('td')

      if (nome === 'id') {
        td.textContent = item[nome]
        td.style.cursor = 'pointer'
        td.onclick = () => toggleSelecaoLinha(tr, item.id)
      } else if (nome === 'ficheiros' && item[nome]) {
        const a = document.createElement('a')
        a.href = item[nome]
        a.target = '_blank'
        a.textContent = 'ficheiro'
        td.appendChild(a)
      } else {
        td.textContent = item[nome] ?? ''
      }
      tr.appendChild(td)
    }

    tr.appendChild(document.createElement('td')) // coluna vazia
    tbody.appendChild(tr)
  }

  tabela.appendChild(thead)
  tabela.appendChild(tbody)

  // Ordem no DOM
  wrapper.appendChild(controles)
  wrapper.appendChild(tabela)
}

// --------------------------------------------------
// Carregamento inicial
// --------------------------------------------------
async function carregarTudo () {
  document.getElementById('status').textContent = 'A carregar…'
  try {
    colunas = await fetchColunas()
    const dados = await fetchEncomendas()
    renderTabela(dados)
    document.getElementById('status').textContent = ''
  } catch (err) {
    console.error(err)
    document.getElementById('status').textContent = 'Erro ao carregar dados.'
  }
}

carregarTudo()