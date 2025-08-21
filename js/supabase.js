import { supabase } from './config.js'

const DBG = true;
function log(...a){ if (DBG) console.log('[SB]', ...a) }

function getPwd() {
  return sessionStorage.getItem('app_pwd') || ''
}
// só para inspeção visual (não imprime a password inteira)
export function getPwdDebug() {
  const p = getPwd()
  if (!p) return '(vazio)'
  return `${p.slice(0,2)}***${p.slice(-1)}`
}

export async function verifyPassword(pwd) {
  log('verifyPassword rpc call')
  const { data, error } = await supabase.rpc('verify_master_password', { pwd })
  if (error) { console.error('[SB] verifyPassword error', error); throw error }
  log('verifyPassword =>', data)
  return !!data
}

export async function fetchColunas() {
  log('fetchColunas select view_colunas_encomendas')
  const { data, error } = await supabase.from('view_colunas_encomendas').select('*')
  if (error) { console.error('[SB] fetchColunas error', error); throw error }
  const mapped = data.map(c => ({ nome: c.column_name, tipo: c.data_type }))
  log('fetchColunas ok', mapped)
  return mapped
}

export async function fetchEncomendas() {
  const pwd = getPwd()
  log('fetchEncomendas rpc', { hasPwd: !!pwd })
  const { data, error } = await supabase.rpc('list_encomendas', { pwd })
  if (error) { console.error('[SB] fetchEncomendas error', error); throw error }
  log('fetchEncomendas ok', { rows: data?.length })
  return data
}
