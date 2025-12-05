// Gestione utenti (solo admin)
let editingUserId = null;

// Icons
const icons = {
  edit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',
  trash: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>'
};

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

function renderUsers(){
  const tbody = document.getElementById('usersList');
  tbody.innerHTML = '';
  const users = getUsers();
  const session = getCurrentSession();
  
  users.forEach(u => {
    const tr = document.createElement('tr');
    
    const tdUser = document.createElement('td'); 
    tdUser.textContent = u.username;
    if(session && u.id === session.userId){
      tdUser.innerHTML += ' <span style="font-size:0.8rem;color:var(--color-primary);font-weight:600">(Tu)</span>';
    }
    
    const tdRole = document.createElement('td'); 
    tdRole.textContent = getRoleName(u.role);
    
    const tdState = document.createElement('td'); 
    tdState.textContent = u.active ? 'Attivo' : 'Disattivato';
    tdState.style.color = u.active ? 'var(--color-success)' : 'var(--color-muted)';
    tdState.style.fontWeight = '600';
    
    const tdActions = document.createElement('td');
    tdActions.style.whiteSpace = 'nowrap';
    
    const btnEdit = document.createElement('button');
    btnEdit.type = 'button';
    btnEdit.className = 'btn btn-outline';
    btnEdit.innerHTML = icons.edit + ' Modifica';
    btnEdit.addEventListener('click', ()=> enterEditUser(u.id));
    
    const btnDel = document.createElement('button');
    btnDel.type = 'button';
    btnDel.className = 'btn btn-danger';
    btnDel.innerHTML = icons.trash + ' Elimina';
    btnDel.addEventListener('click', ()=> deleteUserHandler(u.id));
    
    // Disabilita elimina per se stesso
    if(session && u.id === session.userId){
      btnDel.disabled = true;
      btnDel.style.opacity = '0.5';
      btnDel.style.cursor = 'not-allowed';
    }
    
    tdActions.appendChild(btnEdit);
    tdActions.appendChild(document.createTextNode(' '));
    tdActions.appendChild(btnDel);
    
    tr.appendChild(tdUser);
    tr.appendChild(tdRole);
    tr.appendChild(tdState);
    tr.appendChild(tdActions);
    
    tbody.appendChild(tr);
  });
}

function enterEditUser(userId){
  const users = getUsers();
  const user = users.find(u => u.id === userId);
  if(!user) return;
  
  editingUserId = userId;
  document.getElementById('userUsername').value = user.username;
  document.getElementById('userPassword').value = user.password;
  document.getElementById('userRole').value = user.role;
  document.getElementById('userActive').checked = !!user.active;
  
  const actions = document.getElementById('userFormActions');
  const submit = actions.querySelector('button[type="submit"]');
  if(submit) submit.textContent = 'Aggiorna utente';
  
  if(!document.getElementById('btnCancelUser')){
    const b = document.createElement('button');
    b.type='button';
    b.id='btnCancelUser';
    b.className='btn btn-ghost';
    b.textContent='Annulla';
    b.addEventListener('click', exitEditUser);
    actions.appendChild(b);
  }
}

function exitEditUser(){
  editingUserId = null;
  document.getElementById('userForm').reset();
  const actions = document.getElementById('userFormActions');
  const submit = actions.querySelector('button[type="submit"]');
  if(submit) submit.textContent = 'Salva utente';
  const c = document.getElementById('btnCancelUser');
  if(c && c.parentNode) c.parentNode.removeChild(c);
}

async function deleteUserHandler(userId){
  const ok = await showConfirm('Sei sicuro di voler eliminare questo utente?', 'Elimina utente');
  if(!ok) return;
  
  const result = deleteUser(userId);
  if(result.success){
    renderUsers();
  } else {
    await showConfirm(result.message || 'Errore durante eliminazione', 'Errore');
  }
}

function setupUserForm(){
  const form = document.getElementById('userForm');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    
    const username = document.getElementById('userUsername').value.trim();
    const password = document.getElementById('userPassword').value;
    const role = document.getElementById('userRole').value;
    const active = !!document.getElementById('userActive').checked;
    
    if(!username || !password){
      await showConfirm('Inserire username e password', 'Attenzione');
      return;
    }
    
    if(editingUserId){
      const result = updateUser(editingUserId, { username, password, role, active });
      if(result.success){
        renderUsers();
        exitEditUser();
      } else {
        await showConfirm(result.message || 'Errore durante aggiornamento', 'Errore');
      }
    } else {
      const result = addUser(username, password, role);
      if(result.success){
        renderUsers();
        form.reset();
      } else {
        await showConfirm(result.message || 'Errore durante creazione', 'Errore');
      }
    }
  });
}

// Init (solo se utente ha permesso 'users')
document.addEventListener('DOMContentLoaded', ()=>{
  if(!requirePermission('users')){
    return;
  }
  
  setupUserForm();
  renderUsers();
});
