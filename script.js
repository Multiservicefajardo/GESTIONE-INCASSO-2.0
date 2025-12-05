// Chiave usata in localStorage
const STORAGE_KEY = "mf_incassi_per_veicolo";

// Import blob storage functions (API serverless)
import { uploadJSONToBlob, downloadFromBlob, backupToCloud } from './blob-client.js';

// Struttura dati base
let data = {
  veicoli: [],   // { id, name, plate }
  incassi: []    // { id, vehicleId, date, amount, note }
};

// Editing state for income form (id of income being edited, or null)
let editingIncomeId = null;

// Icons SVG
const icons = {
  edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
  trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>'
};

// Carica dati da localStorage all'avvio
function loadData() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      data = JSON.parse(saved);
    } catch (e) {
      console.error("Errore nel parse dei dati salvati, resetto.", e);
      data = { veicoli: [], incassi: [] };
    }
  }
}

// Selected reference month (YYYY-MM) saved in localStorage
const REF_MONTH_KEY = 'mf_ref_month';
let selectedMonth = null; // e.g. '2025-12' or null for all

function loadSelectedMonth(){
  try{ selectedMonth = localStorage.getItem(REF_MONTH_KEY) || null; }
  catch(e){ selectedMonth = null; }
}

function saveSelectedMonth(){
  try{ if(selectedMonth) localStorage.setItem(REF_MONTH_KEY, selectedMonth); else localStorage.removeItem(REF_MONTH_KEY); }
  catch(e){}
}

// Salva dati su localStorage
function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Aggiorna le select dei veicoli e il riepilogo
function refreshUI() {
  populateVehicleSelects();
  renderSummaryTable();
  renderIncomeDetails(); // aggiorna dettaglio se c'è un veicolo selezionato
  updateCharts(); // aggiorna i grafici con i dati correnti
}

// Popola le select dei veicoli (incasso + dettaglio)
function populateVehicleSelects() {
  const incomeVehicle = document.getElementById("incomeVehicle");
  const detailVehicle = document.getElementById("detailVehicle");

  // Svuota
  incomeVehicle.innerHTML = '<option value="">Seleziona un veicolo</option>';
  detailVehicle.innerHTML = '<option value="">Seleziona un veicolo</option>';

  data.veicoli.forEach(v => {
    const option1 = document.createElement("option");
    option1.value = v.id;
    option1.textContent = formatVehicleName(v);
    incomeVehicle.appendChild(option1);

    const option2 = document.createElement("option");
    option2.value = v.id;
    option2.textContent = formatVehicleName(v);
    detailVehicle.appendChild(option2);
  });
}

// Come mostrare il nome veicolo nella UI
function formatVehicleName(v) {
  return v.plate ? `${v.name} (${v.plate})` : v.name;
}

// Riepilogo per veicolo
function renderSummaryTable() {
  const tbody = document.getElementById("vehicleSummary");
  const grandTotalSpan = document.getElementById("grandTotal");
  tbody.innerHTML = "";
  let grandTotal = 0;
  const filtered = getFilteredIncassi();

  data.veicoli.forEach(v => {
    const totalForVehicle = filtered
      .filter(i => i.vehicleId === v.id)
      .reduce((sum, i) => sum + i.amount, 0);

    grandTotal += totalForVehicle;

    const tr = document.createElement("tr");
    const tdName = document.createElement("td");
    const tdTotal = document.createElement("td");

    tdName.textContent = formatVehicleName(v);
    tdTotal.textContent = totalForVehicle.toFixed(2);

    tr.appendChild(tdName);
    tr.appendChild(tdTotal);
    tbody.appendChild(tr);
  });

  grandTotalSpan.textContent = grandTotal.toFixed(2);
}

// Dettaglio incassi per veicolo selezionato
function renderIncomeDetails() {
  const detailVehicle = document.getElementById("detailVehicle");
  const tbody = document.getElementById("incomeDetails");
  tbody.innerHTML = "";

  const vehicleId = detailVehicle.value;
  if (!vehicleId) return;

  const filtered = getFilteredIncassi();
  const incassiVeicolo = filtered
    .filter(i => i.vehicleId === vehicleId)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  incassiVeicolo.forEach(i => {
    const tr = document.createElement("tr");

    const tdDate = document.createElement("td");
    tdDate.textContent = i.date || "-";

    const tdAmount = document.createElement("td");
    tdAmount.textContent = i.amount.toFixed(2);

    const tdNote = document.createElement("td");
    tdNote.textContent = i.note || "";

    // Actions (Edit / Delete)
    const tdActions = document.createElement("td");
    tdActions.style.whiteSpace = 'nowrap';

    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn btn-outline';
    btnEdit.type = 'button';
    btnEdit.innerHTML = icons.edit + ' Modifica';
    btnEdit.addEventListener('click', ()=> enterEditMode(i));

    const btnDel = document.createElement('button');
    btnDel.className = 'btn btn-danger';
    btnDel.type = 'button';
    btnDel.innerHTML = icons.trash + ' Elimina';
    btnDel.addEventListener('click', ()=> deleteIncome(i.id));    tdActions.appendChild(btnEdit);
    tdActions.appendChild(document.createTextNode(' '));
    tdActions.appendChild(btnDel);

    tr.appendChild(tdDate);
    tr.appendChild(tdAmount);
    tr.appendChild(tdNote);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

function enterEditMode(income){
  editingIncomeId = income.id;
  const vehicleSelect = document.getElementById("incomeVehicle");
  const dateInput = document.getElementById("incomeDate");
  const amountInput = document.getElementById("incomeAmount");
  const noteInput = document.getElementById("incomeNote");
  const actions = document.getElementById('incomeFormActions');

  if(vehicleSelect) vehicleSelect.value = income.vehicleId;
  if(dateInput) dateInput.value = income.date || '';
  if(amountInput) {
    amountInput.value = income.amount;
    try{ amountInput.focus(); amountInput.select(); } catch(e){}
  }
  if(noteInput) noteInput.value = income.note || '';

  // update submit button label
  const submitBtn = actions && actions.querySelector('button[type="submit"]');
  if(submitBtn) submitBtn.textContent = 'Aggiorna incasso';

  // add cancel button if not present
  if(actions && !document.getElementById('btnCancelEdit')){
    const btnCancel = document.createElement('button');
    btnCancel.type = 'button';
    btnCancel.id = 'btnCancelEdit';
    btnCancel.className = 'btn btn-ghost';
    btnCancel.textContent = 'Annulla';
    btnCancel.addEventListener('click', exitEditMode);
    actions.appendChild(btnCancel);
  }
}

function exitEditMode(){
  editingIncomeId = null;
  const dateInput = document.getElementById("incomeDate");
  const amountInput = document.getElementById("incomeAmount");
  const noteInput = document.getElementById("incomeNote");
  const actions = document.getElementById('incomeFormActions');

  if(dateInput) dateInput.value = '';
  if(amountInput) amountInput.value = '';
  if(noteInput) noteInput.value = '';

  // restore submit label
  const submitBtn = actions && actions.querySelector('button[type="submit"]');
  if(submitBtn) submitBtn.textContent = 'Salva incasso';

  // remove cancel if present
  const cancel = document.getElementById('btnCancelEdit');
  if(cancel && cancel.parentNode) cancel.parentNode.removeChild(cancel);

  // leave vehicle select as-is for convenience
}

function deleteIncome(id){
  if(!confirm('Sei sicuro di voler eliminare questo incasso?')) return;
  const idx = data.incassi.findIndex(x => x.id === id);
  if(idx === -1) return;
  // if currently editing this income, exit edit mode
  if(editingIncomeId === id) exitEditMode();
  data.incassi.splice(idx,1);
  saveData();
  refreshUI();
}

/* ------------------ Grafici (Chart.js) ------------------ */
let chartVehicle = null;
let chartIncomeType = null;

function classifyIncomeType(note){
  if(!note) return 'Altro';
  const s = note.toLowerCase();
  if(s.includes('nolegg')) return 'Noleggio';
  if(s.includes('vend') || s.includes('vendit')) return 'Vendita';
  if(s.includes('serviz') || s.includes('manutenz') || s.includes('ripar')) return 'Servizio';
  if(s.includes('carbur') || s.includes('benz') || s.includes('diesel')) return 'Carburante';
  return 'Altro';
}

function palette(n){
  const base = ['#0b66ff','#06b6d4','#10b981','#f59e0b','#ef4444','#7c3aed','#ff63b3','#00bcd4'];
  const out = [];
  for(let i=0;i<n;i++) out.push(base[i % base.length]);
  return out;
}

function initCharts(){
  if(typeof Chart === 'undefined') return;
  const ctx1 = document.getElementById('chartVehicleResults');
  const ctx2 = document.getElementById('chartIncomeType');

  if(ctx1){
    chartVehicle = new Chart(ctx1.getContext('2d'), {
      type: 'bar',
      data: { labels: [], datasets: [{ label: 'Incasso (€)', data: [], backgroundColor: [], borderRadius: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }

  if(ctx2){
    chartIncomeType = new Chart(ctx2.getContext('2d'), {
      type: 'doughnut',
      data: { labels: [], datasets: [{ data: [], backgroundColor: [] }] },
      options: { responsive: true, maintainAspectRatio: false }
    });
  }
}

function updateCharts(){
  if(typeof Chart === 'undefined') return;

  // Totale per veicolo (rispettando filtro mese)
  const filtered = getFilteredIncassi();
  const totals = data.veicoli.map(v => {
    const sum = filtered.filter(i => i.vehicleId === v.id).reduce((s,i)=>s+i.amount,0);
    return { name: formatVehicleName(v), total: sum };
  });

  // Sort decrescente
  totals.sort((a,b)=>b.total - a.total);

  if(chartVehicle){
    chartVehicle.data.labels = totals.map(t=>t.name);
    chartVehicle.data.datasets[0].data = totals.map(t=>t.total.toFixed(2));
    chartVehicle.data.datasets[0].backgroundColor = palette(totals.length);
    chartVehicle.update();
  }

  // Ripartizione per tipo di incasso (rispettando filtro mese)
  const typeMap = {};
  filtered.forEach(i=>{
    const t = classifyIncomeType(i.note || '');
    typeMap[t] = (typeMap[t]||0) + i.amount;
  });

  const types = Object.keys(typeMap);
  const values = types.map(k=>typeMap[k].toFixed(2));

  if(chartIncomeType){
    chartIncomeType.data.labels = types;
    chartIncomeType.data.datasets[0].data = values;
    chartIncomeType.data.datasets[0].backgroundColor = palette(types.length);
    chartIncomeType.update();
  }
}


// Gestione form aggiunta veicolo
function setupVehicleForm() {
  const form = document.getElementById("vehicleForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const nameInput = document.getElementById("vehicleName");
    const plateInput = document.getElementById("vehiclePlate");

    const name = nameInput.value.trim();
    const plate = plateInput.value.trim();

    if (!name) return;

    const newVehicle = {
      id: "v_" + Date.now(),  // id semplice
      name,
      plate
    };

    data.veicoli.push(newVehicle);
    saveData();
    refreshUI();

    // pulizia campi
    nameInput.value = "";
    plateInput.value = "";
  });
}

// Gestione form incasso
function setupIncomeForm() {
  const form = document.getElementById("incomeForm");
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const vehicleSelect = document.getElementById("incomeVehicle");
    const dateInput = document.getElementById("incomeDate");
    const amountInput = document.getElementById("incomeAmount");
    const noteInput = document.getElementById("incomeNote");

    const vehicleId = vehicleSelect.value;
    const date = dateInput.value;
    const amount = parseFloat(amountInput.value);
    const note = noteInput.value.trim();

    if (!vehicleId || isNaN(amount)) return;

    if(editingIncomeId){
      // Aggiorna incasso esistente
      const idx = data.incassi.findIndex(x => x.id === editingIncomeId);
      if(idx !== -1){
        data.incassi[idx].vehicleId = vehicleId;
        data.incassi[idx].date = date;
        data.incassi[idx].amount = amount;
        data.incassi[idx].note = note;
        saveData();
        refreshUI();
      }
      exitEditMode();
    } else {
      const newIncome = {
        id: "i_" + Date.now(),
        vehicleId,
        date,
        amount,
        note
      };

      data.incassi.push(newIncome);
      saveData();
      refreshUI();

      // pulizia campi (lascio il veicolo per comodità)
      dateInput.value = "";
      amountInput.value = "";
      noteInput.value = "";
    }
  });
}

// Cambio veicolo nel dettaglio
function setupDetailSelect() {
  const detailVehicle = document.getElementById("detailVehicle");
  detailVehicle.addEventListener("change", () => {
    renderIncomeDetails();
  });
}

// Inizializzazione
document.addEventListener("DOMContentLoaded", () => {
  loadData();
  setupVehicleForm();
  setupIncomeForm();
  setupDetailSelect();
  initCharts();
  loadSelectedMonth();
  setupRefMonth();
  refreshUI();
  setupExportImportButtons();
  setupCloudBackup();
  applyPermissions();
});

// Applica restrizioni basate sui permessi
function applyPermissions(){
  // Nascondi export/import se utente non ha permesso
  if(typeof hasPermission !== 'undefined'){
    if(!hasPermission('export')){
      const btnExp = document.getElementById('btnExport');
      const btnImp = document.getElementById('btnImport');
      if(btnExp) btnExp.style.display = 'none';
      if(btnImp) btnImp.style.display = 'none';
    }
  }
}

/* ------------------ Export / Import JSON ------------------ */
function setupExportImportButtons(){
  const btnExport = document.getElementById('btnExport');
  const btnImport = document.getElementById('btnImport');
  const fileInput = document.getElementById('fileInput');

  if(btnExport) btnExport.addEventListener('click', exportData);
  if(btnImport) btnImport.addEventListener('click', ()=> fileInput && fileInput.click());
  if(fileInput) fileInput.addEventListener('change', (e)=>{
    const f = e.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try{
        const parsed = JSON.parse(ev.target.result);
        // Ask user whether to replace or merge
        const replace = confirm('Premi OK per SOSTITUIRE completamente i dati correnti con il file importato. Premi Annulla per UNIRE i dati (merge).');
        importData(parsed, replace);
      }catch(err){
        alert('File non valido: JSON malformato');
        console.error(err);
      }
    };
    reader.readAsText(f);
    // reset input
    e.target.value = '';
  });
}

function exportData(){
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  a.href = url;
  a.download = `incassi-backup-${ts}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importData(imported, replace){
  if(!imported || typeof imported !== 'object'){
    alert('Formato import non riconosciuto');
    return;
  }

  const hasVeicoli = Array.isArray(imported.veicoli);
  const hasIncassi = Array.isArray(imported.incassi);
  if(!hasVeicoli || !hasIncassi){
    alert('Il file JSON deve contenere gli array "veicoli" e "incassi"');
    return;
  }

  if(replace){
    data.veicoli = imported.veicoli.map(normalizeVehicle);
    data.incassi = imported.incassi.map(normalizeIncome);
  } else {
    // merge: avoid id collisions
    const existingIds = new Set([...data.veicoli.map(v=>v.id), ...data.incassi.map(i=>i.id)]);

    const newVeicoli = imported.veicoli.map(v=>{
      const nv = normalizeVehicle(v);
      if(existingIds.has(nv.id)) nv.id = generateId('v');
      existingIds.add(nv.id);
      return nv;
    });

    const newIncassi = imported.incassi.map(i=>{
      const ni = normalizeIncome(i);
      if(existingIds.has(ni.id)) ni.id = generateId('i');
      // Remap vehicleId if collision: if an imported vehicle got a new id, try to preserve mapping via name+plate
      const matched = data.veicoli.find(v => v.id === ni.vehicleId) || newVeicoli.find(v => v.id === ni.vehicleId);
      if(!matched){
        // try match by name+plate
        const candidate = newVeicoli.find(vv => vv.name === (ni._vehicleName || '') && vv.plate === (ni._vehiclePlate || ''));
        if(candidate) ni.vehicleId = candidate.id;
      }
      existingIds.add(ni.id);
      return ni;
    });

    data.veicoli = data.veicoli.concat(newVeicoli);
    data.incassi = data.incassi.concat(newIncassi);
  }

  saveData();
  refreshUI();
  alert('Import completato con successo');
}

function generateId(prefix){
  return (prefix || 'id') + '_' + Date.now() + '_' + Math.floor(Math.random()*1000);
}

function normalizeVehicle(v){
  return {
    id: v.id || generateId('v'),
    name: v.name || (v.nome || 'Veicolo'),
    plate: v.plate || v.targa || ''
  };
}

function normalizeIncome(i){
  return {
    id: i.id || generateId('i'),
    vehicleId: i.vehicleId || i.veicoloId || (i.vehicle && i.vehicle.id) || '',
    date: i.date || i.data || '',
    amount: typeof i.amount === 'number' ? i.amount : parseFloat(i.amount) || 0,
    note: i.note || i.nota || '',
    // helpers for remapping
    _vehicleName: (i.vehicle && i.vehicle.name) || i._vehicleName || '',
    _vehiclePlate: (i.vehicle && i.vehicle.plate) || i._vehiclePlate || ''
  };
}

/* Return incassi filtered by selectedMonth (if set) */
function getFilteredIncassi(){
  if(!selectedMonth) return data.incassi.slice();
  // selectedMonth format: YYYY-MM
  return data.incassi.filter(i => {
    if(!i.date) return false;
    return i.date.startsWith(selectedMonth + '-') || i.date.startsWith(selectedMonth);
  });
}

function setupRefMonth(){
  const ref = document.getElementById('refMonth');
  const btnClear = document.getElementById('btnClearMonth');
  if(ref){
    ref.value = selectedMonth || '';
    ref.addEventListener('change', (e)=>{
      selectedMonth = e.target.value || null;
      saveSelectedMonth();
      refreshUI();
    });
  }
  if(btnClear){
    btnClear.addEventListener('click', ()=>{
      selectedMonth = null;
      if(ref) ref.value = '';
      saveSelectedMonth();
      refreshUI();
    });
  }
}

// ===== CLOUD BACKUP & RESTORE =====
async function backupDataToCloud() {
  try {
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `incassi-${timestamp}`;
    
    const result = await backupToCloud('incassi', data);
    
    if (result) {
      alert(`✅ Backup salvato su Vercel Blob!\n\nURL: ${result.url}\n\nPuoi scaricare questo file per tenerlo al sicuro.`);
      localStorage.setItem('mf_last_cloud_backup', result.url);
    }
  } catch (error) {
    console.error('Errore backup cloud:', error);
    alert('❌ Errore durante il backup.\n\nErrore: ' + error.message);
  }
}

async function restoreDataFromCloud() {
  const lastBackup = localStorage.getItem('mf_last_cloud_backup');
  const defaultUrl = lastBackup || '';
  
  const url = prompt(
    'Inserisci l\'URL del backup da ripristinare:',
    defaultUrl
  );
  
  if (!url) return;
  
  try {
    const response = await downloadFromBlob(url);
    const restoredData = await response.json();
    
    // Valida i dati ripristinati
    if (!restoredData.veicoli || !restoredData.incassi) {
      throw new Error('Formato dati non valido');
    }
    
    const confirm = window.confirm(
      `⚠️ Attenzione!\n\nQuesto sostituirà TUTTI i dati attuali con quelli del backup.\n\n` +
      `Veicoli nel backup: ${restoredData.veicoli.length}\n` +
      `Incassi nel backup: ${restoredData.incassi.length}\n\n` +
      `Vuoi procedere?`
    );
    
    if (confirm) {
      data = restoredData;
      saveData();
      refreshUI();
      alert('✅ Dati ripristinati con successo dal cloud!');
    }
  } catch (error) {
    console.error('Errore ripristino cloud:', error);
    alert('❌ Errore durante il ripristino dal cloud.\n\nVerifica che l\'URL sia corretto e riprova.');
  }
}

// Setup cloud backup buttons
function setupCloudBackup() {
  const btnBackup = document.getElementById('btnBackupCloud');
  const btnRestore = document.getElementById('btnRestoreCloud');
  
  if (btnBackup) {
    btnBackup.addEventListener('click', backupDataToCloud);
  }
  
  if (btnRestore) {
    btnRestore.addEventListener('click', restoreDataFromCloud);
  }
}
