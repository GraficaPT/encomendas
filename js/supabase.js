import { supabase } from './config.js'

const DBG = true
function log(...a){ if (DBG) console.log('[SB]', ...a) }

function getPwd() {
  return sessionStorage.getItem('app_pwd') || ''
}
export function getPwdDebug() {
  const p = getPwd()
  if (!p) return '(vazio)'
  return `${p.slice(0,2)}***${p.slice(-1)}`
}

export async function verifyPassword(pwd) {
  log('verifyPassword rpc call')
  const { data, error } = await supabase.rpc('verify_master_password', { pwd })
  if (error) { console.error('[SB] verifyPassword error', error); throw error }
  return !!data
}

/** Fallback fixo pelas colunas reais da tabela Encomendas */
const FALLBACK_COLS = [
  { nome: 'id',        tipo: 'bigint' },
  { nome: 'data',      tipo: 'date' },
  { nome: 'cliente',   tipo: 'character varying' },
  { nome: 'morada',    tipo: 'character varying' },
  { nome: 'nif',       tipo: 'bigint' },
  { nome: 'produto',   tipo: 'character varying' },
  { nome: 'detalhes',  tipo: 'character varying' },
  { nome: 'ficheiros', tipo: 'character varying' },
  { nome: 'maquete',   tipo: 'character varying' },
  { nome: 'valor',     tipo: 'real' },
  { nome: 'executado', tipo: 'boolean' },
]

export async function fetchColunas() {
  try {
    const { data, error } = await supabase.rpc('get_encomendas_columns')
    if (error) throw error
    if (!data?.length) return FALLBACK_COLS
    return data.map(c => ({ nome: c.column_name, tipo: c.data_type }))
  } catch (e) {
    return FALLBACK_COLS
  }
}


export async function fetchEncomendas() {
  const pwd = getPwd()
  log('fetchEncomendas rpc', { hasPwd: !!pwd })
  const { data, error } = await supabase.rpc('list_encomendas', { pwd })
  if (error) { console.error('[SB] fetchEncomendas error', error); throw error }
  log('fetchEncomendas ok', { rows: data?.length })
  return data
}

// (se já usas uploads e CRUD, mantêm como estavam; não mexi aqui)
export async function uploadFileToSupabase(file) {
  const timestamp = Date.now()
  const filePath = `${timestamp}_${file.name}`
  const { error } = await supabase.storage.from('ficheirosencomendas').upload(filePath, file)
  if (error) throw error
  const { data } = supabase.storage.from('ficheirosencomendas').getPublicUrl(filePath)
  return data.publicUrl
}

// Operações de escrita (caso já tenhas as RPCs criadas)
export async function updateEncomendas(updates) {
  const { error } = await supabase.rpc('update_encomendas', { pwd: getPwd(), rows: updates })
  if (error) throw error
}
export async function insertEncomendas(inserts) {
  const { error } = await supabase.rpc('insert_encomendas', { pwd: getPwd(), rows: inserts })
  if (error) throw error
}
export async function deleteEncomendas(ids) {
  const { error } = await supabase.rpc('delete_encomendas', { pwd: getPwd(), ids })
  if (error) throw error
}
