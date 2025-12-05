# Vercel Blob Storage - Setup Completo

## ✅ Sistema di backup su Vercel Blob ATTIVO

L'app ora usa un'**API serverless** per fare upload su Vercel Blob in sicurezza.

## 🚀 Quick Start

### 1. Installa le dipendenze
```bash
npm install
```

### 2. Crea il file `.env` nella root
```bash
cp .env.example .env
```

### 3. Configura il token Vercel Blob

Vai su https://vercel.com/dashboard/stores e:
1. Seleziona il tuo progetto
2. Vai su **Storage > Blob**
3. Copia il token `BLOB_READ_WRITE_TOKEN`
4. Incollalo in `.env`:

```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_tu_token_qui
```

### 4. Testa in locale
```bash
npm start
```

Poi apri http://localhost:3000

### 5. Deploy su Vercel
```bash
npm run deploy
```

Oppure connetti il repository GitHub a Vercel per deploy automatici!

## 🏗️ Architettura

```
Browser (Frontend)
    ↓ (file + filename)
    ↓
API Route: /api/backup-upload
    ↓
Vercel Blob Storage ☁️
    ↓ (URL pubblico)
    ↓
Browser (salva URL in localStorage)
```

## 📁 File aggiunti

### 1. `/api/backup-upload.js` - API Serverless
- Gestisce l'upload dei file su Vercel Blob
- Richiede `BLOB_READ_WRITE_TOKEN` in environment
- Limita file fino a 50MB

### 2. `blob-client.js` - Client-side upload
- `uploadFileToBlob()` - Upload file generico
- `uploadJSONToBlob()` - Upload dati JSON
- `downloadFromBlob()` - Scarica file
- `backupToCloud()` - Backup automatico

### 3. Aggiornamenti
- `script.js` - Import da `blob-client.js`
- `gestione-verbali.js` - Import da `blob-client.js`

## 🚀 Come funziona

### 1. Fare un backup
```
Clicca "☁️ Backup Cloud" 
    ↓
Dati → API route (/api/backup-upload)
    ↓
API → Vercel Blob (con BLOB_READ_WRITE_TOKEN)
    ↓
Ricevi URL pubblico del file
    ↓
URL salvato in localStorage per ripristino facile
```

### 2. Ripristinare un backup
```
Clicca "⬇️ Ripristina Cloud"
    ↓
Incolla l'URL del backup (suggerito automaticamente)
    ↓
Download diretto da Vercel Blob
    ↓
Dati ripristinati nel browser
```

## 🔐 Configurazione Vercel Dashboard

### Se deployi direttamente su Vercel:

1. Vai su https://vercel.com/dashboard
2. Seleziona il tuo progetto
3. Vai su **Settings > Environment Variables**
4. Aggiungi:
   - **Key**: `BLOB_READ_WRITE_TOKEN`
   - **Value**: Il tuo token (es: `vercel_blob_rw_XXXXXXXXXX`)
   - **Environment**: Production, Preview, Development (seleziona tutti)
5. Clicca **Save**

### Come trovare il token Blob Store:

1. Dashboard Vercel > **Storage > Blob**
2. Seleziona il tuo Blob Store: `bgmximflooliisby`
3. Vai su **Settings**
4. Copia il **Read-Write Token**

## 📦 Dipendenze richieste

Già configurate in `package.json`:
```json
{
  "dependencies": {
    "@vercel/blob": "^0.23.0"
  }
}
```

## 💾 Dove vengono salvati i file

I file vengono salvati su:
```
https://bgmximflooliisby.public.blob.vercel-storage.com/
backups/
├── incassi-2025-12-05T10-30-45.json
└── verbali-2025-12-05T10-30-45.json
```

Sono **pubblici e scaricabili** tramite URL diretta!

## 🎯 Funzionalità

### Pagina Incassi (index.html)
- ☁️ **Backup Cloud** - Salva incassi su Vercel Blob
- ⬇️ **Ripristina Cloud** - Carica backup da URL

### Pagina Verbali (gestione-verbali.html)
- ☁️ **Backup Cloud** - Salva verbali su Vercel Blob
- ⬇️ **Ripristina Cloud** - Carica backup da URL

## 📝 Esempio di utilizzo

### Fare un backup da codice
```javascript
import { backupToCloud } from './blob-client.js';

const incassi = JSON.parse(localStorage.getItem('mf_incassi_per_veicolo') || '[]');
const result = await backupToCloud('incassi', incassi);

console.log('✅ Backup salvato:', result.url);
```

### Scaricare un backup
```javascript
import { downloadFromBlob } from './blob-client.js';

const response = await downloadFromBlob('https://bgmximflooliisby.public.blob.vercel-storage.com/backups/incassi-2025-12-05T10-30-45.json');
const data = await response.json();
console.log('Dati scaricati:', data);
```

### Upload file immagine
```javascript
import { uploadFileToBlob } from './blob-client.js';

const fileInput = document.getElementById('imageUpload');
const file = fileInput.files[0];
const result = await uploadFileToBlob('logo.png', file);

console.log('✅ Immagine caricata:', result.url);
```

## ⚙️ Configurazione locale (sviluppo)

Per testare localmente, crea un file `.env.local`:

```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_XXXXXXXXXX
```

Poi avvia con:
```bash
npm run dev
```

## 🔧 Troubleshooting

### "BLOB_READ_WRITE_TOKEN non definito"
→ Aggiungi la variabile d'ambiente in Vercel Dashboard

### "Errore 405: Metodo non consentito"
→ Assicurati di usare POST nella richiesta

### "File troppo grande"
→ Limite massimo 50MB, modifica in `api/backup-upload.js`

## 🌐 Endpoint API

**POST** `/api/backup-upload?filename=nome-file.json`

**Headers:**
```
Content-Type: application/json
```

**Body:** File raw (Blob)

**Response:**
```json
{
  "url": "https://bgmximflooliisby.public.blob.vercel-storage.com/backups/file.json",
  "pathname": "backups/file.json",
  "downloadUrl": "..."
}
```

## 📊 Limiti gratuiti Vercel Blob

- **Storage**: 100 GB gratuiti
- **Upload rate**: Illimitato
- **Download**: Illimitato
- **Costo extra**: $0.50 per GB dopo i 100GB

## ✨ Vantaggi

✅ **Backup su cloud** - Dati salvati in modo sicuro
✅ **URL condivisibili** - Puoi condividere i backup
✅ **Ripristino facile** - Copia e incolla l'URL
✅ **Niente installazioni** - Tutto serverless
✅ **Scalabile** - Funziona con dati grandi

## 🚀 Deployment

L'app è pronta per Vercel!

```bash
# Installa Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

I backup funzioneranno automaticamente dopo il deploy! 🎉
