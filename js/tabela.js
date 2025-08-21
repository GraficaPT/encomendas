import { uploadFileToSupabase, updateEncomendas, insertEncomendas, deleteEncomendas } from './supabase.js'
import { supabase } from './config.js'

let selectedIds = new Set()
let colunas = []
const FILE_FIELDS = ['ficheiros', 'maquete']

export function setColunas(lista) {
  colunas = lista
}

export function renderTabela(colunasInput, dados) {
  colunas = colunasInput

  const wrapper = document.getElementById('tabela-wrapper')
  wrapper.innerHTML = ''

  // Barra de controlo
  const controles = document.createElement('controls')
  const btnAdd = document.createElement('button')
  btnAdd.textContent = '➕ Adicionar'
  btnAdd.onclick = () => criarLinhaEditavel(tbody)
  controles.appendChild(btnAdd)

  const btnRem = document.createElement('button')
  btnRem.textContent = '🗑️ Remover'
  btnRem.onclick = removerSelecionadas
  controles.appendChild(btnRem)

  const btnAtual = document.createElement('button')
  btnAtual.textContent = '🔄 Atualizar'
  btnAtual.onclick = atualizarTudo
  controles.appendChild(btnAtual)

  const btnLogout = document.createElement('button')
  btnLogout.textContent = '🚪 Logout'
  btnLogout.onclick = () => { sessionStorage.removeItem('app_pwd'); location.reload() }
  controles.appendChild(btnLogout)

  // Tabela
  const tabela = document.createElement('table')
  const thead = document.createElement('thead')
  const tbody = document.createElement('tbody')

  // Cabeçalhos
  const trHead = document.createElement('tr')
  for (const col of colunas) {
    const th = document.createElement('th')

    // Se for a coluna "valor", soma e coloca no título
    if (col.nome.toLowerCase() === 'valor') {
      const total = dados.reduce((acc, item) => acc + (Number(item[col.nome]) || 0), 0)
      th.textContent = `${col.nome.toUpperCase()} (${total.toFixed(2).replace('.', ',')})`
    } else {
      th.textContent = col.nome.toUpperCase()
    }

    trHead.appendChild(th)
  }
  thead.appendChild(trHead)
  tabela.appendChild(thead)

  // Corpo
  dados.forEach(item => {
    const tr = document.createElement('tr')
    tr.dataset.id = item.id

    for (const col of colunas) {
      const nome = col.nome
      const td = document.createElement('td')

      if (nome === 'id') {
        td.textContent = item[nome]
        td.style.cursor = 'pointer'
        td.onclick = () => toggleSelecaoLinha(tr, item.id)
      }
      else if (FILE_FIELDS.includes(nome)) {
        if (item[nome]) {
          const links = item[nome].split(',')
          links.forEach(link => {
            const a = document.createElement('a')
            a.href = link
            a.target = '_blank'
            a.textContent = link.split('/').pop().split('_').slice(1).join('_') || 'ficheiro'
            a.style.display = 'block'
            td.appendChild(a)
          })
        }
      }
      else if (col.tipo === 'boolean') {
        const label = document.createElement('label')
        label.classList.add('switch')
        const input = document.createElement('input')
        input.type = 'checkbox'
        input.checked = !!item[nome]
        const span = document.createElement('span')
        span.classList.add('slider')
        label.appendChild(input)
        label.appendChild(span)
        td.appendChild(label)
      }
      else if (col.tipo === 'timestamp with time zone' || col.tipo === 'timestamp without time zone') {
        const input = document.createElement('input')
        input.type = 'datetime-local'
        if (item[nome]) {
          const dt = new Date(item[nome])
          const iso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
          input.value = iso
        }
        td.appendChild(input)
      }
      else if (col.tipo === 'date') {
        const input = document.createElement('input')
        input.type = 'date'
        if (item[nome]) input.value = new Date(item[nome]).toISOString().slice(0, 10)
        td.appendChild(input)
      }
      else if (col.tipo === 'numeric' || col.tipo === 'integer' || col.tipo === 'bigint' || col.tipo === 'double precision') {
        const input = document.createElement('input')
        input.type = 'number'
        input.value = item[nome] ?? ''
        td.appendChild(input)
      }
      else if (col.tipo === 'text' || col.tipo === 'character varying') {
        const input = document.createElement('input')
        input.type = 'text'
        input.value = item[nome] ?? ''
        td.appendChild(input)
      }
      else if (FILE_FIELDS.includes(nome)) {
        // já tratado acima
      }
      else {
        td.textContent = item[nome] ?? ''
      }

      tr.appendChild(td)
    }

    tbody.appendChild(tr)
  })

  // Linha “nova”
  function criarLinhaEditavel(tbody) {
    const tr = document.createElement('tr')
    tr.dataset.id = ''
    for (const col of colunas) {
      const nome = col.nome
      const td = document.createElement('td')

      if (nome === 'id') {
        td.textContent = 'novo'
      }
      else if (FILE_FIELDS.includes(nome)) {
        const input = document.createElement('input')
        input.type = 'file'
        input.multiple = true

        input.onchange = async e => {
          const files = Array.from(e.target.files)
          if (!files.length) return
          td.innerHTML = '⏳ a enviar…'
          try {
            const links = []
            for (const file of files) links.push(await uploadFileToSupabase(file))
            td.innerHTML = ''
            links.forEach(link => {
              const a = document.createElement('a')
              a.href = link
              a.target = '_blank'
              a.textContent = link.split('/').pop().split('_').slice(1).join('_') || 'ficheiro'
              a.style.display = 'block'
              td.appendChild(a)
            })
            td.setAttribute('data-links', links.join(','))
          } catch (err) {
            td.textContent = 'Erro'
            alert('Erro ao enviar ficheiros: ' + err.message)
          }
        }

        td.appendChild(input)
      }
      else {
        const input = document.createElement('input')
        input.type = (col.tipo === 'numeric' || col.tipo === 'integer') ? 'number' : 'text'
        td.appendChild(input)
      }

      tr.appendChild(td)
    }
    tbody.appendChild(tr)
  }

  // Tabela final
  wrapper.appendChild(controles)
  wrapper.appendChild(tabela)
  tabela.appendChild(thead)
  tabela.appendChild(tbody)

  // Helpers
  function toggleSelecaoLinha(tr, id) {
    if (selectedIds.has(id)) {
      selectedIds.delete(id)
      tr.classList.remove('selected')
    } else {
      selectedIds.add(id)
      tr.classList.add('selected')
    }
  }
}

async function atualizarTudo() {
  const tbody = document.querySelector('tbody')
  const rows = Array.from(tbody.querySelectorAll('tr'))

  const updates = []
  const inserts = []

  rows.forEach(linha => {
    const id = linha.dataset.id ? Number(linha.dataset.id) : null
    const tds = Array.from(linha.children)
    const obj = {}

    for (let i = 0; i < tds.length; i++) {
      const col = colunas[i]
      const nome = col.nome
      const td = tds[i]

      if (nome === 'id') continue

      if (td.hasAttribute('data-links')) {
        obj[nome] = td.getAttribute('data-links')
      } else {
        const input = td.querySelector('input')
        let valor = input ? input.value : td.textContent

        if (col.tipo === 'boolean' && input) valor = input.checked
        if ((col.tipo || '').startsWith('timestamp') && valor) valor = new Date(valor).toISOString()
        if ((col.tipo === 'numeric' || col.tipo === 'integer' || col.tipo === 'double precision') && valor !== '') valor = Number(valor)

        obj[nome] = valor
      }
    }

    if (id) {
      updates.push({ id, ...obj })
    } else {
      inserts.push(obj)
    }
  })

  try {
    if (updates.length) { await updateEncomendas(updates) }
    if (inserts.length) { await insertEncomendas(inserts) }
    location.reload()
  } catch (err) {
    alert('Erro ao gravar: ' + err.message)
  }
}

async function removerSelecionadas() {
  if (!selectedIds.size) {
    alert('Seleccione pelo menos uma linha!')
    return
  }
  const idsArray = [...selectedIds]
  try { await deleteEncomendas(idsArray); location.reload() }
  catch (e) { alert('Erro ao remover: ' + e.message) }
}
