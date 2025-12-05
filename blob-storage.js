// Vercel Blob Storage Integration
// Gestisce upload e download di file tramite Vercel Blob
// Endpoint: https://bgmximflooliisby.public.blob.vercel-storage.com

const BLOB_STORE_URL = 'https://bgmximflooliisby.public.blob.vercel-storage.com';

/**
 * Carica un file su Vercel Blob usando fetch API
 * @param {string} filename - Nome del file (percorso relativo)
 * @param {string|Blob|File} content - Contenuto da caricare
 * @param {Object} options - Opzioni di upload
 * @returns {Promise<{url: string, pathname: string}>}
 */
export async function uploadToBlob(filename, content, options = {}) {
  try {
    // Converti il contenuto in Blob se è una stringa
    let blob = content;
    if (typeof content === 'string') {
      blob = new Blob([content], { type: options.contentType || 'text/plain' });
    }
    
    // Usa fetch API per upload diretto
    const uploadUrl = `${BLOB_STORE_URL}/${filename}`;
    
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': options.contentType || blob.type || 'application/octet-stream',
        'x-vercel-blob-access': options.access || 'public'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    
    const url = uploadUrl;
    const pathname = filename;
    
    console.log('File caricato su Vercel Blob:', { url, pathname });
    
    return { url, pathname };
  } catch (error) {
    console.error('Errore durante upload su Vercel Blob:', error);
    throw error;
  }
}

/**
 * Carica un file JSON su Vercel Blob
 * @param {string} filename - Nome del file
 * @param {Object} data - Dati da salvare come JSON
 * @returns {Promise<{url: string, pathname: string}>}
 */
export async function uploadJSONToBlob(filename, data) {
  const jsonContent = JSON.stringify(data, null, 2);
  return uploadToBlob(filename, jsonContent, {
    access: 'public',
    contentType: 'application/json'
  });
}

/**
 * Carica un'immagine su Vercel Blob
 * @param {string} filename - Nome del file immagine
 * @param {File|Blob} imageFile - File immagine
 * @returns {Promise<{url: string, pathname: string}>}
 */
export async function uploadImageToBlob(filename, imageFile) {
  return uploadToBlob(filename, imageFile, {
    access: 'public',
    contentType: imageFile.type || 'image/jpeg'
  });
}

/**
 * Elimina un file da Vercel Blob
 * @param {string} url - URL del file da eliminare
 * @returns {Promise<void>}
 */
export async function deleteFromBlob(url) {
  try {
    const response = await fetch(url, {
      method: 'DELETE'
    });
    
    if (!response.ok && response.status !== 404) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }
    
    console.log('File eliminato da Vercel Blob:', url);
  } catch (error) {
    console.error('Errore durante eliminazione da Vercel Blob:', error);
    throw error;
  }
}

/**
 * Scarica un file da Vercel Blob
 * @param {string} filename - Nome del file da scaricare
 * @returns {Promise<Response>}
 */
export async function downloadFromBlob(filename) {
  try {
    const url = `${BLOB_STORE_URL}/${filename}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }
    
    return response;
  } catch (error) {
    console.error('Errore durante download da Vercel Blob:', error);
    throw error;
  }
}

// Esempio di utilizzo con backup automatico
export async function backupToCloud(dataKey, data) {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filename = `backups/${dataKey}-${timestamp}.json`;
  
  try {
    const result = await uploadJSONToBlob(filename, data);
    console.log('Backup salvato su cloud:', result.url);
    return result;
  } catch (error) {
    console.error('Errore backup cloud:', error);
    // Fallback a localStorage se il cloud fallisce
    localStorage.setItem(`backup_${dataKey}`, JSON.stringify(data));
    return null;
  }
}
