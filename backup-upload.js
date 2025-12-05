import { put } from '@vercel/blob';

// API Route per Vercel Serverless Functions
// Gestisce l'upload di file su Vercel Blob

export default async function handler(req, res) {
  // Abilita CORS per richieste dal frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Gestisci preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const { filename } = req.query;

  if (!filename) {
    return res.status(400).json({ error: 'Nome file mancante nel query param' });
  }

  try {
    // Upload su Vercel Blob
    const blob = await put(filename, req, {
      access: 'public',
    });

    console.log('✅ File caricato:', blob.url);

    return res.status(200).json({
      url: blob.url,
      pathname: blob.pathname,
      downloadUrl: blob.downloadUrl,
      contentType: blob.contentType,
      size: blob.size,
    });
  } catch (error) {
    console.error('❌ Errore upload:', error);
    return res.status(500).json({ 
      error: error.message || 'Errore durante upload',
      details: error.toString()
    });
  }
}

// Configurazione per gestire il body come stream
export const config = {
  api: {
    bodyParser: false, // Importante: non parsare il body, lo passiamo direttamente a put()
  },
};
