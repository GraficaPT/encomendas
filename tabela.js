import { uploadFileToSupabase } from './supabase.js'
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

  // Tabela
  const tabela = document.createElement('table')
  const thead = document.createElement('thead')
  const tbody = document.createElement('tbody')

  // Cabeçalhos
  const trHead = document.createElement('tr')
  for (const col of colunas) {
    const th = document.createElement('th')
    th.textContent =  col.nome.toUpperCase()
    trHead.appendChild(th)
  }
  thead.appendChild(trHead)

  // Linhas da BD
  for (const item of dados) {
    const tr = document.createElement('tr')
    tr.dataset.id = item.id

    for (const col of colunas) {
      const nome = col.nome
      const td = document.createElement('td')

      // id -> seleção
      if (nome === 'id') {
        td.textContent = item[nome]
        td.style.cursor = 'pointer'
        td.onclick = () => toggleSelecaoLinha(tr, item.id)
      }
      // Ficheiros: só mostra link(s), nunca editável!
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
      // Booleanos -> switch
      else if (col.tipo === 'boolean') {
        const label = document.createElement('label')
        label.classList.add('switch')
        const input = document.createElement('input')
        input.type = 'checkbox'
        input.name = nome
        input.checked = !!item[nome]
        input.addEventListener('change', () => tr.classList.toggle('finished', input.checked))
        const span = document.createElement('span')
        span.classList.add('slider')
        label.appendChild(input)
        label.appendChild(span)
        td.appendChild(label)
      }
      // Restantes campos -> input texto
      else {
        const input = document.createElement('input')
        input.name = nome
        input.value = item[nome] ?? ''
        td.appendChild(input)
      }

      tr.appendChild(td)
    }

    // Classe finished se algum booleano estiver true
    if (colunas.some(c => c.tipo === 'boolean' && item[c.nome])) {
      tr.classList.add('finished')
    }

    tbody.appendChild(tr)
  }

  tabela.appendChild(thead)
  tabela.appendChild(tbody)
  wrapper.appendChild(controles)
  wrapper.appendChild(tabela)
}

// Adiciona linha nova (apenas aqui podes fazer upload)
function criarLinhaEditavel(tbody) {
  const linha = document.createElement('tr')

  for (const col of colunas) {
    const nome = col.nome
    const td = document.createElement('td')

    // id é auto-gerado
    if (nome === 'id') {
      td.textContent = '(auto)'
      linha.appendChild(td)
      continue
    }

    // Upload ficheiros só aqui!
    if (FILE_FIELDS.includes(nome)) {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '*/*'
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
          // Guarda os links num atributo oculto para o atualizarTudo ler
          td.setAttribute('data-links', links.join(','))
        } catch (err) {
          td.textContent = 'Erro'
          alert('Erro ao enviar ficheiros: ' + err.message)
        }
      }

      td.appendChild(input)
      linha.appendChild(td)
      continue
    }

    // Booleanos
    if (col.tipo === 'boolean') {
      const label = document.createElement('label')
      label.classList.add('switch')
      const input = document.createElement('input')
      input.type = 'checkbox'
      input.name = nome
      const span = document.createElement('span')
      span.classList.add('slider')
      label.appendChild(input)
      label.appendChild(span)
      td.appendChild(label)
    } else {
      const input = document.createElement('input')
      input.name = nome
      input.type = nome === 'data' ? 'date' : 'text'
      if (nome === 'data') input.valueAsDate = new Date()
      td.appendChild(input)
    }

    linha.appendChild(td)
  }

  tbody.appendChild(linha)
}

// Atualiza tudo menos os ficheiros (ficheiros só entram ao adicionar nova linha!)
async function atualizarTudo() {
  const tabela = document.querySelector('#tabela-wrapper table')
  if (!tabela) return

  const linhas = tabela.querySelectorAll('tbody tr')
  if (!linhas.length) {
    alert('Não há linhas para gravar!')
    return
  }

  const updates = []
  const inserts = []

  linhas.forEach(tr => {
    const obj = {}
    const id = Number(tr.dataset.id) || null
    const tds = tr.querySelectorAll('td')

    let tdPos = 0
    for (const col of colunas) {
      const td = tds[tdPos++]
      const nome = col.nome
      if (nome === 'id') continue

      // Ficheiros são ignorados nas linhas já existentes (não mexe!)
      if (FILE_FIELDS.includes(nome)) {
        if (!id) {
          // Só para linhas novas (adicionar)
          const links = td.getAttribute('data-links')
          obj[nome] = links || null
        }
        continue
      }

      if (col.tipo === 'boolean') {
        obj[nome] = td.querySelector('input[type="checkbox"]')?.checked ?? false
      } else {
        let valor = td.querySelector('input')?.value ?? null
        valor = valor === '' ? null : valor
        if (col.tipo === 'number' && valor !== null) valor = Number(valor)
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
    for (const { id, ...dados } of updates) {
      const { count, error } = await supabase
        .from('Encomendas')
        .update(dados, { count: 'exact' })
        .eq('id', id)

      if (error) throw error
    }

    if (inserts.length) {
      const { data, error } = await supabase
        .from('Encomendas')
        .insert(inserts)

      if (error) throw error
    }

    location.reload()
  } catch (err) {
    alert('Erro ao gravar: ' + err.message)
    console.error(err)
  }
}

function toggleSelecaoLinha(tr, id) {
  if (selectedIds.has(id)) {
    selectedIds.delete(id)
    tr.classList.remove('selected')
  } else {
    selectedIds.add(id)
    tr.classList.add('selected')
  }
}

async function removerSelecionadas() {
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
  location.reload()
}
