// Storage key for fines
const FINES_KEY = 'mf_verbali';
let fines = []; // { id, cf, vehicle, date, amount, note, paid }
let editingFineId = null;
let chartFinesStatus = null;

// Import blob storage functions (API serverless)
import { uploadJSONToBlob, downloadFromBlob, backupToCloud } from './blob-client.js';

function loadFines(){
  try{ const s = localStorage.getItem(FINES_KEY); fines = s ? JSON.parse(s) : []; }catch(e){fines=[]}
}
function saveFines(){ localStorage.setItem(FINES_KEY, JSON.stringify(fines)); }

function generateId(prefix){ return (prefix||'f') + '_' + Date.now() + '_' + Math.floor(Math.random()*1000); }

// Custom confirm modal
function showConfirm(message, title='Conferma'){
  return new Promise((resolve)=>{
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmTitle');
    const msgEl = document.getElementById('confirmMessage');
    const yesBtn = document.getElementById('confirmYes');
    const noBtn = document.getElementById('confirmNo');
    if(!modal) { resolve(confirm(message)); return; }
    
    titleEl.textContent = title;
    msgEl.textContent = message;
    modal.style.display = 'flex';
    
    const cleanup = ()=>{ modal.style.display='none'; yesBtn.onclick=null; noBtn.onclick=null; };
    yesBtn.onclick = ()=>{ cleanup(); resolve(true); };
    noBtn.onclick = ()=>{ cleanup(); resolve(false); };
  });
}

// Icons SVG
const icons = {
  edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
  trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>',
  check: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>',
  x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
};

function renderFines(){
  const tbody = document.getElementById('finesList');
  tbody.innerHTML = '';
  const filter = (document.getElementById('filterCf')||{}).value || '';
  const list = fines.filter(f => !filter || (f.cf && f.cf.toLowerCase().includes(filter.toLowerCase())));

  list.sort((a,b)=> (b.date||'').localeCompare(a.date||''));

  let totalUnpaid = 0;
  let totalAll = 0;

  list.forEach(f => {
    const tr = document.createElement('tr');

    const tdCf = document.createElement('td'); tdCf.textContent = f.cf || '-';
    const tdVeh = document.createElement('td'); tdVeh.textContent = f.vehicle || '-';
    const tdDate = document.createElement('td'); tdDate.textContent = f.date || '-';
    const tdAmt = document.createElement('td'); tdAmt.textContent = (Number(f.amount)||0).toFixed(2);
    const tdNote = document.createElement('td'); tdNote.textContent = f.note || '';
    const tdState = document.createElement('td'); 
    tdState.textContent = f.paid ? 'Pagato' : 'Da pagare';
    tdState.style.color = f.paid ? 'var(--color-success)' : 'var(--color-danger)';
    tdState.style.fontWeight = '600';

    totalAll += (Number(f.amount)||0);
    if(!f.paid) totalUnpaid += (Number(f.amount)||0);

    const tdActions = document.createElement('td');
    tdActions.style.whiteSpace = 'nowrap';

    const btnToggle = document.createElement('button');
    btnToggle.type = 'button';
    btnToggle.className = 'btn btn-sm';
    btnToggle.innerHTML = f.paid ? icons.x + ' Non pagato' : icons.check + ' Pagato';
    btnToggle.addEventListener('click', ()=> togglePaid(f.id));

    const btnEdit = document.createElement('button');
    btnEdit.type = 'button';
    btnEdit.className = 'btn btn-outline';
    btnEdit.innerHTML = icons.edit + ' Modifica';
    btnEdit.addEventListener('click', ()=> enterEditFine(f.id));

    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.className = 'btn btn-danger';
    btnDel.innerHTML = icons.trash + ' Elimina';
    btnDel.addEventListener('click', ()=> deleteFine(f.id));

    tdActions.appendChild(btnToggle);
    tdActions.appendChild(document.createTextNode(' '));
    tdActions.appendChild(btnEdit);
    tdActions.appendChild(document.createTextNode(' '));
    tdActions.appendChild(btnDel);

    tr.appendChild(tdCf);
    tr.appendChild(tdVeh);
    tr.appendChild(tdDate);
    tr.appendChild(tdAmt);
    tr.appendChild(tdNote);
    tr.appendChild(tdState);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });

  // update totals
  const spanUnpaid = document.getElementById('totalUnpaid');
  const spanTotal = document.getElementById('totalFines');
  if(spanUnpaid) spanUnpaid.textContent = totalUnpaid.toFixed(2);
  if(spanTotal) spanTotal.textContent = totalAll.toFixed(2);
  
  updateChart();
}

function updateChart(){
  if(typeof Chart === 'undefined' || !chartFinesStatus) return;
  const paid = fines.filter(f=>f.paid).reduce((s,f)=>(s+(Number(f.amount)||0)),0);
  const unpaid = fines.filter(f=>!f.paid).reduce((s,f)=>(s+(Number(f.amount)||0)),0);
  chartFinesStatus.data.labels = ['Pagati', 'Non pagati'];
  chartFinesStatus.data.datasets[0].data = [paid.toFixed(2), unpaid.toFixed(2)];
  chartFinesStatus.data.datasets[0].backgroundColor = ['#10b981','#ef4444'];
  chartFinesStatus.update();
}

function togglePaid(id){
  const idx = fines.findIndex(x=>x.id===id);
  if(idx===-1) return;
  fines[idx].paid = !fines[idx].paid;
  saveFines();
  renderFines();
}

function enterEditFine(id){
  const f = fines.find(x=>x.id===id); if(!f) return;
  editingFineId = id;
  document.getElementById('cf').value = f.cf || '';
  document.getElementById('fineVehicle').value = f.vehicle || '';
  document.getElementById('fineDate').value = f.date || '';
  document.getElementById('fineAmount').value = f.amount || '';
  document.getElementById('fineNote').value = f.note || '';
  document.getElementById('finePaid').checked = !!f.paid;
  const actions = document.getElementById('fineFormActions');
  const submit = actions.querySelector('button[type="submit"]'); if(submit) submit.textContent = 'Aggiorna verbale';
  if(!document.getElementById('btnCancelFine')){
    const b = document.createElement('button'); b.type='button'; b.id='btnCancelFine'; b.className='btn btn-ghost'; b.textContent='Annulla'; b.addEventListener('click', exitEditFine); actions.appendChild(b);
  }
  // focus amount for quick correction
  const amt = document.getElementById('fineAmount'); try{ amt.focus(); amt.select(); }catch(e){}
}

function exitEditFine(){
  editingFineId = null;
  document.getElementById('fineForm').reset();
  const actions = document.getElementById('fineFormActions');
  const submit = actions.querySelector('button[type="submit"]'); if(submit) submit.textContent = 'Salva verbale';
  const c = document.getElementById('btnCancelFine'); if(c && c.parentNode) c.parentNode.removeChild(c);
}

function deleteFine(id){
  showConfirm('Sei sicuro di voler eliminare questo verbale?', 'Elimina verbale').then(ok=>{
    if(!ok) return;
    fines = fines.filter(x=>x.id!==id);
    saveFines();
    renderFines();
  });
}

function setupFineForm(){
  const form = document.getElementById('fineForm');
  form.addEventListener('submit', (e)=>{
    e.preventDefault();
    const cf = document.getElementById('cf').value.trim().toUpperCase();
    const vehicle = document.getElementById('fineVehicle').value.trim();
    const date = document.getElementById('fineDate').value;
    const amount = parseFloat(document.getElementById('fineAmount').value) || 0;
    const note = document.getElementById('fineNote').value.trim();
    const paid = !!document.getElementById('finePaid').checked;
    if(!cf){ 
      showConfirm('Inserire il codice fiscale del cliente', 'Attenzione'); 
      return; 
    }
    // Basic CF validation (16 alphanumeric)
    if(cf.length !== 16 || !/^[A-Z0-9]{16}$/.test(cf)){
      showConfirm('Codice fiscale non valido (deve essere 16 caratteri alfanumerici)', 'Attenzione');
      return;
    }

    if(editingFineId){
      const idx = fines.findIndex(x=>x.id===editingFineId);
      if(idx!==-1){
        fines[idx].cf = cf;
        fines[idx].vehicle = vehicle;
        fines[idx].date = date;
        fines[idx].amount = amount;
        fines[idx].note = note;
        fines[idx].paid = paid;
        saveFines(); renderFines();
      }
      exitEditFine();
    } else {
      const newFine = { id: generateId('f'), cf, vehicle, date, amount, note, paid };
      fines.push(newFine);
      saveFines(); renderFines();
      form.reset();
    }
  });
}

function setupFilters(){
  const f = document.getElementById('filterCf');
  const btn = document.getElementById('btnClearFilter');
  if(f){ f.addEventListener('input', renderFines); }
  if(btn){ btn.addEventListener('click', ()=>{ if(f) f.value=''; renderFines(); }); }
}

function initChart(){
  if(typeof Chart === 'undefined') return;
  const ctx = document.getElementById('chartFinesStatus');
  if(!ctx) return;
  chartFinesStatus = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: { labels: ['Pagati','Non pagati'], datasets: [{ data: [0,0], backgroundColor: ['#10b981','#ef4444'] }] },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function setupExportImport(){
  const btnExp = document.getElementById('btnExportFines');
  const btnImp = document.getElementById('btnImportFines');
  const fileInput = document.getElementById('fileInputFines');
  
  if(btnExp){ btnExp.addEventListener('click', exportFines); }
  if(btnImp){ btnImp.addEventListener('click', ()=> fileInput && fileInput.click()); }
  if(fileInput){
    fileInput.addEventListener('change', (e)=>{
      const f = e.target.files[0]; if(!f) return;
      const reader = new FileReader();
      reader.onload = (ev)=>{
        try{
          const parsed = JSON.parse(ev.target.result);
          showConfirm('Vuoi SOSTITUIRE i verbali correnti con quelli importati? (Annulla per UNIRE)', 'Importa verbali').then(replace=>{
            importFines(parsed, replace);
          });
        }catch(err){
          showConfirm('File non valido: JSON malformato', 'Errore');
        }
      };
      reader.readAsText(f);
      e.target.value = '';
    });
  }
}

function exportFines(){
  const blob = new Blob([JSON.stringify(fines, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const ts = new Date().toISOString().replace(/[:.]/g,'-');
  a.href = url;
  a.download = `verbali-backup-${ts}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importFines(imported, replace){
  if(!Array.isArray(imported)){
    showConfirm('Formato import non valido (atteso array)', 'Errore');
    return;
  }
  
  if(replace){
    fines = imported.map(normalizeFine);
  } else {
    const existingIds = new Set(fines.map(f=>f.id));
    const newFines = imported.map(f=>{
      const nf = normalizeFine(f);
      if(existingIds.has(nf.id)) nf.id = generateId('f');
      existingIds.add(nf.id);
      return nf;
    });
    fines = fines.concat(newFines);
  }
  
  saveFines();
  renderFines();
  showConfirm('Import completato con successo', 'Successo');
}

function normalizeFine(f){
  return {
    id: f.id || generateId('f'),
    cf: (f.cf || f.codiceFiscale || '').toUpperCase(),
    vehicle: f.vehicle || f.veicolo || '',
    date: f.date || f.data || '',
    amount: typeof f.amount === 'number' ? f.amount : parseFloat(f.amount || f.importo) || 0,
    note: f.note || f.nota || '',
    paid: !!f.paid || !!f.pagato
  };
}

// init
document.addEventListener('DOMContentLoaded', ()=>{
  // Controlla permesso verbali
  if(typeof requirePermission !== 'undefined'){
    if(!requirePermission('verbali')){
      return;
    }
  }
  
  loadFines();
  setupFineForm();
  setupFilters();
  initChart();
  setupExportImport();
  setupCloudBackupFines();
  renderFines();
  applyPermissions();
});

// Applica restrizioni basate sui permessi
function applyPermissions(){
  if(typeof hasPermission !== 'undefined'){
    if(!hasPermission('export')){
      const btnExp = document.getElementById('btnExportFines');
      const btnImp = document.getElementById('btnImportFines');
      const btnBackup = document.getElementById('btnBackupCloudFines');
      const btnRestore = document.getElementById('btnRestoreCloudFines');
      if(btnExp) btnExp.style.display = 'none';
      if(btnImp) btnImp.style.display = 'none';
      if(btnBackup) btnBackup.style.display = 'none';
      if(btnRestore) btnRestore.style.display = 'none';
    }
  }
}

// ===== CLOUD BACKUP & RESTORE FOR FINES =====
async function backupFinesToCloud() {
  try {
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `verbali-${timestamp}`;
    
    const result = await backupToCloud('verbali', fines);
    
    if (result) {
      alert(`✅ Backup verbali salvato su Vercel Blob!\n\nURL: ${result.url}\n\nPuoi scaricare questo file per tenerlo al sicuro.`);
      localStorage.setItem('mf_last_cloud_backup_fines', result.url);
    }
  } catch (error) {
    console.error('Errore backup verbali:', error);
    alert('❌ Errore durante il backup.\n\nErrore: ' + error.message);
  }
}

async function restoreFinesFromCloud() {
  const lastBackup = localStorage.getItem('mf_last_cloud_backup_fines');
  const defaultUrl = lastBackup || '';
  
  const url = prompt(
    'Inserisci l\'URL del backup verbali da ripristinare:',
    defaultUrl
  );
  
  if (!url) return;
  
  try {
    const response = await downloadFromBlob(url);
    const restoredFines = await response.json();
    
    if (!Array.isArray(restoredFines)) {
      throw new Error('Formato dati non valido');
    }
    
    const confirm = window.confirm(
      `⚠️ Attenzione!\n\nQuesto sostituirà TUTTI i verbali attuali.\n\n` +
      `Verbali nel backup: ${restoredFines.length}\n\n` +
      `Vuoi procedere?`
    );
    
    if (confirm) {
      fines = restoredFines;
      saveFines();
      renderFines();
      updateChart();
      alert('✅ Verbali ripristinati con successo dal cloud!');
    }
  } catch (error) {
    console.error('Errore ripristino cloud verbali:', error);
    alert('❌ Errore durante il ripristino dal cloud.\n\nVerifica che l\'URL sia corretto e riprova.');
  }
}

function setupCloudBackupFines() {
  const btnBackup = document.getElementById('btnBackupCloudFines');
  const btnRestore = document.getElementById('btnRestoreCloudFines');
  
  if (btnBackup) {
    btnBackup.addEventListener('click', backupFinesToCloud);
  }
  
  if (btnRestore) {
    btnRestore.addEventListener('click', restoreFinesFromCloud);
  }
}
