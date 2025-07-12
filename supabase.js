import { supabase } from './config.js'

export async function uploadFileToSupabase(file) {
  const timestamp = Date.now()
  const filePath = `${timestamp}_${file.name}`
  const { error } = await supabase.storage.from('ficheirosencomendas').upload(filePath, file)
  if (error) throw error

  const { data } = supabase.storage.from('ficheirosencomendas').getPublicUrl(filePath)
  return data.publicUrl
}

export async function fetchColunas() {
  const { data, error } = await supabase.from('view_colunas_encomendas').select('*')
  if (error) throw error
  return data.map(c => ({ nome: c.column_name, tipo: c.data_type }))
}

export async function fetchEncomendas() {
  const { data, error } = await supabase.from('Encomendas').select('*').order('id', { ascending: true })
  if (error) throw error
  return data
}
