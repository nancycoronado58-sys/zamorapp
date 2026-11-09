import { supabase } from './supabase';

export async function uploadMedia(file: File, folder: string): Promise<string> {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('El archivo excede el máximo de 5MB / File exceeds 5MB limit');
  }
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}
