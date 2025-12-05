// Sistema di autenticazione e autorizzazione
const AUTH_KEY = 'mf_auth_session';
const USERS_KEY = 'mf_users';

// Ruoli e permessi
const ROLES = {
  admin: { 
    name: 'Amministratore', 
    permissions: ['incassi', 'verbali', 'users', 'export', 'import'] 
  },
  amministratrice_ufficio: { 
    name: 'Amministratrice Ufficio', 
    permissions: ['incassi', 'verbali', 'export', 'import'] 
  },
  operatore: { 
    name: 'Operatore', 
    permissions: ['incassi', 'export'] 
  },
  contabile: { 
    name: 'Contabile', 
    permissions: ['verbali', 'export'] 
  }
};

// Inizializza utenti di default se non esistono
function initDefaultUsers(){
  try{
    const existing = localStorage.getItem(USERS_KEY);
    if(existing) return;
    
    const defaultUsers = [
      { id: 'u_1', username: 'admin', password: 'admin123', role: 'admin', active: true },
      { id: 'u_2', username: 'amministratrice', password: 'ufficio123', role: 'amministratrice_ufficio', active: true },
      { id: 'u_3', username: 'operatore', password: 'oper123', role: 'operatore', active: true },
      { id: 'u_4', username: 'contabile', password: 'cont123', role: 'contabile', active: true }
    ];
    
    localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
  }catch(e){ console.error('Errore init users:', e); }
}

// Login
async function login(username, password){
  try{
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const user = users.find(u => u.username === username && u.password === password && u.active);
    
    if(!user){
      return { success: false, message: 'Username o password non validi' };
    }
    
    const session = {
      userId: user.id,
      username: user.username,
      role: user.role,
      loginTime: new Date().toISOString()
    };
    
    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    return { success: true, user: session };
  }catch(e){
    console.error('Errore login:', e);
    return { success: false, message: 'Errore durante il login' };
  }
}

// Logout
function logout(){
  localStorage.removeItem(AUTH_KEY);
  window.location.href = 'login.html';
}

// Ottieni sessione corrente
function getCurrentSession(){
  try{
    const session = localStorage.getItem(AUTH_KEY);
    return session ? JSON.parse(session) : null;
  }catch(e){ return null; }
}

// Controlla se utente è autenticato
function isAuthenticated(){
  return getCurrentSession() !== null;
}

// Controlla permessi
function hasPermission(permission){
  const session = getCurrentSession();
  if(!session) return false;
  const role = ROLES[session.role];
  if(!role) return false;
  return role.permissions.includes(permission);
}

// Richiedi autenticazione (redirect a login se non autenticato)
function requireAuth(){
  if(!isAuthenticated()){
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Richiedi permesso specifico (redirect a login se non autorizzato)
function requirePermission(permission, redirectPage = 'index.html'){
  if(!isAuthenticated()){
    window.location.href = 'login.html';
    return false;
  }
  if(!hasPermission(permission)){
    alert('Non hai i permessi per accedere a questa funzionalità');
    window.location.href = redirectPage;
    return false;
  }
  return true;
}

// Ottieni nome del ruolo
function getRoleName(roleKey){
  return ROLES[roleKey]?.name || roleKey;
}

// Gestione utenti (solo admin)
function getUsers(){
  try{
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  }catch(e){ return []; }
}

function saveUsers(users){
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function addUser(username, password, role){
  if(!hasPermission('users')) return { success: false, message: 'Permesso negato' };
  
  const users = getUsers();
  if(users.find(u => u.username === username)){
    return { success: false, message: 'Username già esistente' };
  }
  
  const newUser = {
    id: 'u_' + Date.now(),
    username,
    password,
    role,
    active: true,
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  saveUsers(users);
  return { success: true, user: newUser };
}

function updateUser(userId, updates){
  if(!hasPermission('users')) return { success: false, message: 'Permesso negato' };
  
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if(idx === -1) return { success: false, message: 'Utente non trovato' };
  
  users[idx] = { ...users[idx], ...updates };
  saveUsers(users);
  return { success: true, user: users[idx] };
}

function deleteUser(userId){
  if(!hasPermission('users')) return { success: false, message: 'Permesso negato' };
  
  const session = getCurrentSession();
  if(session && session.userId === userId){
    return { success: false, message: 'Non puoi eliminare il tuo account' };
  }
  
  const users = getUsers().filter(u => u.id !== userId);
  saveUsers(users);
  return { success: true };
}

// Aggiungi header con info utente e logout
function addUserHeader(){
  const session = getCurrentSession();
  if(!session) return;
  
  const header = document.querySelector('.header-inner');
  if(!header) return;
  
  const nav = header.querySelector('.nav');
  if(!nav) return;
  
  // Rimuovi eventuali elementi utente esistenti
  const existing = nav.querySelector('.user-info');
  if(existing) existing.remove();
  
  const userInfo = document.createElement('div');
  userInfo.className = 'user-info';
  userInfo.style.cssText = 'display:flex;align-items:center;gap:12px;margin-left:auto;padding-left:20px;border-left:1px solid rgba(255,255,255,0.2)';
  
  const userText = document.createElement('span');
  userText.style.cssText = 'color:rgba(255,255,255,0.9);font-size:0.9rem';
  userText.textContent = `${session.username} (${getRoleName(session.role)})`;
  
  const logoutBtn = document.createElement('button');
  logoutBtn.className = 'btn btn-sm';
  logoutBtn.textContent = 'Logout';
  logoutBtn.style.cssText = 'background:rgba(255,255,255,0.15);color:white;border:1px solid rgba(255,255,255,0.3)';
  logoutBtn.addEventListener('click', logout);
  
  userInfo.appendChild(userText);
  userInfo.appendChild(logoutBtn);
  nav.appendChild(userInfo);
}

// Filtra menu navigazione per permessi
function filterNavByPermissions(){
  const session = getCurrentSession();
  if(!session) return;
  
  const nav = document.querySelector('.nav');
  if(!nav) return;
  
  // Link gestione multe
  const multeLink = nav.querySelector('a[href="gestione-verbali.html"]');
  if(multeLink && !hasPermission('verbali')){
    multeLink.style.display = 'none';
  }
  
  // Aggiungi link gestione utenti solo per admin
  if(hasPermission('users')){
    const existingUserLink = nav.querySelector('a[href="gestione-utenti.html"]');
    if(!existingUserLink){
      const userLink = document.createElement('a');
      userLink.href = 'gestione-utenti.html';
      userLink.textContent = 'Utenti';
      nav.insertBefore(userLink, nav.querySelector('.user-info'));
    }
  }
}

// Init
initDefaultUsers();

// Auto-esegui su tutte le pagine (tranne login)
if(document.location.pathname.includes('login.html')){
  // Redirect a home se già autenticato
  if(isAuthenticated()){
    window.location.href = 'index.html';
  }
} else {
  // Richiedi autenticazione su tutte le altre pagine
  document.addEventListener('DOMContentLoaded', ()=>{
    if(requireAuth()){
      addUserHeader();
      filterNavByPermissions();
    }
  });
}
