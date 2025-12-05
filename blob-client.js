// Cliente per upload file su Vercel Blob tramite API route
// Usa un endpoint serverless per gestire l'upload in sicurezza

/**
 * Carica un file su Vercel Blob tramite API serverless
 * @param {string} filename - Nome del file
 * @param {Blob|File} file - File da caricare
 * @returns {Promise<{url: string, pathname: string}>}
 */
export async function uploadFileToBlob(filename, file) {
  try {
    // Aggiungi timestamp al filename per evitare duplicati
    const timestamp = Date.now();
    const ext = filename.split('.').pop();
    const uniqueFilename = `${filename.replace(`.${ext}`, '')}-${timestamp}.${ext}`;

    const response = await fetch(
      `/api/backup-upload?filename=${encodeURIComponent(uniqueFilename)}`,
      {
        method: 'POST',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Errore durante upload');
    }

    const blob = await response.json();
    console.log('✅ File caricato su Vercel Blob:', blob.url);

    return {
      url: blob.url,
      pathname: blob.pathname,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Errore upload file:', error);
    throw error;
  }
}

/**
 * Carica dati JSON su Vercel Blob
 * @param {string} filename - Nome del file
 * @param {Object} data - Dati da salvare
 * @returns {Promise<{url: string, pathname: string}>}
 */
export async function uploadJSONToBlob(filename, data) {
  try {
    // Converti JSON a Blob
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    // Aggiungi extension .json se non presente
    const finalFilename = filename.endsWith('.json') ? filename : `${filename}.json`;

    return uploadFileToBlob(finalFilename, blob);
  } catch (error) {
    console.error('❌ Errore upload JSON:', error);
    throw error;
  }
}

/**
 * Scarica un file da Vercel Blob
 * @param {string} url - URL pubblico del file
 * @returns {Promise<Response>}
 */
export async function downloadFromBlob(url) {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Errore download: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    console.error('❌ Errore download file:', error);
    throw error;
  }
}

/**
 * Backup con upload a Vercel Blob
 * @param {string} dataKey - Chiave del backup
 * @param {Object} data - Dati da salvare
 * @returns {Promise<{url: string, timestamp: string}>}
 */
export async function backupToCloud(dataKey, data) {
  try {
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `backups/${dataKey}-${timestamp}`;

    const result = await uploadJSONToBlob(filename, data);

    console.log('✅ Backup caricato su cloud:', result.url);

    return {
      url: result.url,
      timestamp: result.timestamp,
    };
  } catch (error) {
    console.error('❌ Errore backup cloud:', error);
    throw error;
  }
}
