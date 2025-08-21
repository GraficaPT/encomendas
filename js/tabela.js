import { uploadFileToSupabase, updateEncomendas, insertEncomendas, deleteEncomendas } from './supabase.js'

let selectedIds = new Set()
let colunas = []
const FILE_FIELDS = ['ficheiros', 'maquete']

export function setColunas(lista) { colunas = lista }

export function renderTabela(colunasInput, dados) {
  colunas = colunasInput
  const wrapper = document.getElementById('tabela-wrapper')
  wrapper.innerHTML = ''

  const tabela = document.createElement('table')
  tabela.className = 'encomendas-table'

  const thead = document.createElement('thead')
  const trHead = document.createElement('tr')
  for (const col of colunas) {
    const th = document.createElement('th')
    if (col.nome.toLowerCase() === 'valor') {
      const total = (dados || []).reduce((acc, r) => acc + (Number(r[col.nome]) || 0), 0)
      th.textContent = `${col.nome.toUpperCase()} (${total.toFixed(2).replace('.', ',')})`
    } else {
      th.textContent = col.nome.toUpperCase()
    }
    trHead.appendChild(th)
  }
  thead.appendChild(trHead)
  tabela.appendChild(thead)

  const tbody = document.createElement('tbody')

  ;(dados || []).forEach(item => {
    const tr = document.createElement('tr')
    tr.dataset.id = item.id

    for (const col of colunas) {
      const nome = col.nome
      const td = document.createElement('td')

      if (nome === 'id') {
        td.textContent = item[nome]
        td.className = 'cell-id'
        td.onclick = () => toggleSelecaoLinha(tr, item.id)
      }
      else if (FILE_FIELDS.includes(nome)) {
        if (item[nome]) {
          const links = String(item[nome]).split(',').filter(Boolean)
          links.forEach(link => {
            const a = document.createElement('a')
            a.href = link
            a.target = '_blank'
            a.textContent = link.split('/').pop().split('_').slice(1).join('_') || 'ficheiro'
            a.className = 'file-link'
            a.style.display = 'block'
            td.appendChild(a)
          })
        }
      }
      else if (col.tipo === 'boolean') {
        const input = document.createElement('input')
        input.type = 'checkbox'
        input.checked = !!item[nome]
        td.appendChild(input)
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
      else if (['numeric','integer','bigint','double precision','real'].includes(col.tipo)) {
        const input = document.createElement('input')
        input.type = 'number'
        input.value = item[nome] ?? ''
        td.appendChild(input)
      }
      else {
        const input = document.createElement('input')
        input.type = 'text'
        input.value = item[nome] ?? ''
        td.appendChild(input)
      }

      tr.appendChild(td)
    }

    tbody.appendChild(tr)
  })

  tabela.appendChild(tbody)
  wrapper.appendChild(tabela)

  // ligar botões globais já existentes no layout
  const btnAdd = document.getElementById('btn-add')
  const btnDel = document.getElementById('btn-del')
  const btnSave = document.getElementById('btn-save')

  if (btnAdd) btnAdd.onclick = () => criarLinhaEditavel(tbody)
  if (btnDel) btnDel.onclick = removerSelecionadas
  if (btnSave) btnSave.onclick = atualizarTudo

  // helpers -------------
  function toggleSelecaoLinha(tr, id) {
    if (selectedIds.has(id)) {
      selectedIds.delete(id)
      tr.classList.remove('selected')
    } else {
      selectedIds.add(id)
      tr.classList.add('selected')
    }
  }

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
            for (const f of files) links.push(await uploadFileToSupabase(f))
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
        input.type = ['numeric','integer','bigint','double precision','real'].includes(col.tipo) ? 'number' : 'text'
        td.appendChild(input)
      }

      tr.appendChild(td)
    }
    tbody.appendChild(tr)
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
        let valor = input ? (input.type === 'checkbox' ? input.checked : input.value) : td.textContent

        if ((col.tipo || '').startsWith('timestamp') && valor) valor = new Date(valor).toISOString()
        if (['numeric','integer','bigint','double precision','real'].includes(col.tipo) && valor !== '') valor = Number(valor)

        obj[nome] = valor === '' ? null : valor
      }
    }

    if (id) updates.push({ id, ...obj })
    else inserts.push(obj)
  })

  try {
    if (updates.length) await updateEncomendas(updates)
    if (inserts.length) await insertEncomendas(inserts)
    location.reload()
  } catch (err) {
    alert('Erro ao gravar: ' + err.message)
  }
}

async function removerSelecionadas() {
  if (!selectedIds.size) { alert('Seleccione pelo menos uma linha!'); return }
  try { await deleteEncomendas([...selectedIds]); location.reload() }
  catch (e) { alert('Erro ao remover: ' + e.message) }
}
