import { supabase } from './config.js'

function getPwd() {
  return sessionStorage.getItem('app_pwd') || ''
}

export async function verifyPassword(pwd) {
  const { data, error } = await supabase.rpc('verify_master_password', { pwd })
  if (error) throw error
  return !!data
}

/** Fallback fixo com as colunas reais da tua tabela Encomendas */
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

/** Busca colunas via RPC (se existir); caso contrário usa fallback */
export async function fetchColunas() {
  // tenta RPC opcional
  const rpc = await supabase.rpc('get_encomendas_columns')
  if (!rpc.error && Array.isArray(rpc.data) && rpc.data.length) {
    return rpc.data.map(c => ({ nome: c.column_name, tipo: c.data_type }))
  }
  // tenta a view (se existir)
  const view = await supabase.from('view_colunas_encomendas').select('*')
  if (!view.error && Array.isArray(view.data) && view.data.length) {
    return view.data.map(c => ({ nome: c.column_name, tipo: c.data_type }))
  }
  // fallback
  return FALLBACK_COLS
}

export async function fetchEncomendas() {
  const { data, error } = await supabase.rpc('list_encomendas', { pwd: getPwd() })
  if (error) throw error
  return data
}

/** Storage */
export async function uploadFileToSupabase(file) {
  const timestamp = Date.now()
  const filePath = `${timestamp}_${file.name}`
  const { error } = await supabase.storage.from('ficheirosencomendas').upload(filePath, file)
  if (error) throw error
  const { data } = supabase.storage.from('ficheirosencomendas').getPublicUrl(filePath)
  return data.publicUrl
}

/** CRUD via RPCs (se quiseres usar já) */
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
