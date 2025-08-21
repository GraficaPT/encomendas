import { supabase } from './config.js'

// Utils
function getPwd() {
  return sessionStorage.getItem('app_pwd') || ''
}

// ---- Auth por password única (RPC verify_master_password) ----
export async function verifyPassword(pwd) {
  const { data, error } = await supabase.rpc('verify_master_password', { pwd })
  if (error) throw error
  return !!data
}

// ---- Ficheiros (storage) ----
export async function uploadFileToSupabase(file) {
  const timestamp = Date.now()
  const filePath = `${timestamp}_${file.name}`
  const { error } = await supabase.storage.from('ficheirosencomendas').upload(filePath, file)
  if (error) throw error
  const { data } = supabase.storage.from('ficheirosencomendas').getPublicUrl(filePath)
  return data.publicUrl
}

// ---- Dados ----

// Colunas (mantém a view; se quiseres, posso criar uma RPC também)
export async function fetchColunas() {
  const { data, error } = await supabase.from('view_colunas_encomendas').select('*')
  if (error) throw error
  return data.map(c => ({ nome: c.column_name, tipo: c.data_type }))
}

// Encomendas via RPC protegida por password
export async function fetchEncomendas() {
  const { data, error } = await supabase.rpc('list_encomendas', { pwd: getPwd() })
  if (error) throw error
  return data
}

// Operações de escrita via RPC
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
