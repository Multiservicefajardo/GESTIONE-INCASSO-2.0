# 🚗 Car Dealer - Gestione Incassi e Verbali

App web per la gestione di incassi per veicolo e multe/verbali per **Multiservice Fajardo S.R.L.S**.

## ✨ Funzionalità

- 📊 **Gestione Incassi** - Traccia incassi per ogni veicolo
- 🚓 **Gestione Verbali** - Gestisci multe con stato pagamento
- 📈 **Grafici e Report** - Visualizzazione dati con Chart.js
- 👥 **Sistema Utenti** - 4 ruoli con permessi diversi
- ☁️ **Backup Cloud** - Backup su Vercel Blob Storage
- 📥 **Export/Import** - Salva e carica dati in JSON

## 🚀 Quick Start

### 1. Installa dipendenze
```bash
npm install
```

### 2. Configura Vercel Blob

Crea un file `.env` nella root:
```bash
cp .env.example .env
```

Modifica `.env` e aggiungi il tuo token:
```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_XXXXXXXXXX
```

Per ottenere il token:
1. Vai su https://vercel.com/dashboard/stores
2. Vai su **Storage > Blob**
3. Copia il token **Read-Write**

### 3. Avvia in locale
```bash
npm start
```

Apri http://localhost:3000

### 4. Deploy su Vercel
```bash
npm run deploy
```

Oppure connetti il repository GitHub a Vercel.
- Se Vercel non trova `index.html`, assicurati di essere nella root del repo quando colleghi il progetto.
- Per SPA puoi aggiungere regole di routing in `vercel.json` (non applicato ora perché il sito è multi-page static).

Se vuoi, preparo anche:
- Script `build` + `package.json` se vuoi minificare/compilare assets prima del deploy.
- Modalità SPA (rewrite tutte le rotte a `index.html`) se preferisci.

Buona pubblicazione! Se vuoi procedo e collego la repo o genero i comandi per deploy automatico.
