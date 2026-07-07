// MARK: - DEFAULT MOCK REASSURANCE DATA (Seeded on first PWA execution)
const DEFAULT_ITEMS = [
  {
    id: "mock-rego",
    title: "Toyota Hilux Registration",
    category: "vehicles",
    importantDate: getRelativeDateOffset(5),
    reminderDate: getRelativeDateOffset(-2),
    notes: "Policy #94820-A"
  },
  {
    id: "mock-passport",
    title: "Passport Expiry",
    category: "travel",
    importantDate: getRelativeDateOffset(90),
    reminderDate: getRelativeDateOffset(30),
    notes: "Renew online"
  },
  {
    id: "mock-smoke",
    title: "Home Smoke Alarms",
    category: "home",
    importantDate: getRelativeDateOffset(120),
    reminderDate: getRelativeDateOffset(110),
    notes: "Replace 9V backup batteries"
  }
];

let items = [];
let activeVaultCategories = [];
let itemToDeleteId = null;

// MARK: - RUN STATE INITIALIZATION
window.addEventListener('DOMContentLoaded', () => {
  initData();
  renderDashboard();
});

function initData() {
  const localData = localStorage.getItem('tiaki_items');
  if (localData) {
    items = JSON.parse(localData);
  } else {
    items = DEFAULT_ITEMS;
    localStorage.setItem('tiaki_items', JSON.stringify(items));
  }
}

// MARK: - UTILITY DATE COMPILER
function getRelativeDateOffset(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

function computeStatus(item) {
  const now = new Date();
  const important = new Date(item.importantDate);
  const reminder = new Date(item.reminderDate);

  // Set times to midnight to ensure exact daily integer increments
  now.setHours(0,0,0,0);
  important.setHours(0,0,0,0);
  reminder.setHours(0,0,0,0);

  if (important < now) return 'overdue';
  if (reminder <= now) return 'activeCare';

  const diffTime = reminder - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 30) return 'upcoming';
  return 'secure';
}

function daysUntil(targetDateStr) {
  const now = new Date();
  const target = new Date(targetDateStr);
  now.setHours(0,0,0,0);
  target.setHours(0,0,0,0);
  const diffTime = target - now;
  return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// MARK: - RENDER ENGINE
function renderDashboard() {
  const activeCareShelf = document.getElementById('activeCareShelf');
  const activeCareList = document.getElementById('activeCareList');
  const assuranceStatement = document.getElementById('assuranceStatement');
  const assuranceSubtext = document.getElementById('assuranceSubtext');

  // Filter items that require immediate attention
  const careItems = items.filter(item => {
    const stat = computeStatus(item);
    return stat === 'activeCare' || stat === 'overdue';
  });

  // Calculate upcoming secure items for quiet status reports
  const secureUpcoming = items.filter(item => {
    const stat = computeStatus(item);
    return stat === 'secure' || stat === 'upcoming';
  }).sort((a, b) => new Date(a.importantDate) - new Date(b.importantDate));

  if (careItems.length === 0) {
    activeCareShelf.classList.add('hidden');
    assuranceStatement.textContent = "All is quiet.";
    
    if (secureUpcoming.length > 0) {
      const next = secureUpcoming[0];
      assuranceSubtext.textContent = `Your next care check is ${next.title} in ${daysUntil(next.importantDate)} days.`;
    } else {
      assuranceSubtext.textContent = "No scheduled items to monitor. TIAKI is standing guard.";
    }
  } else {
    activeCareShelf.classList.remove('hidden');
    assuranceStatement.textContent = `${careItems.length} ${careItems.length === 1 ? 'item requires' : 'items require'} care.`;
    assuranceSubtext.textContent = "Attend to them at your own pace.";
    
    activeCareList.innerHTML = '';
    careItems.forEach(item => {
      const status = computeStatus(item);
      const isOverdue = status === 'overdue';
      
      const card = document.createElement('div');
      card.className = 'care-card';
      card.onclick = () => openEditForm(item.id);
      
      card.innerHTML = `
        <div class="status-dot ${isOverdue ? 'overdue' : 'active-care'}"></div>
        <div class="care-card-info">
          <h4>${item.title}</h4>
          <p>${isOverdue ? 'Time for renewal' : 'Ready for attention soon'}</p>
        </div>
        <svg class="chevron-arrow" viewBox="0 0 24 24"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
      `;
      activeCareList.appendChild(card);
    });
  }
}

// MARK: - CATEGORY VAULT SLIDING PANEL ROUTING
function openVault(vaultTitle, categories) {
  triggerHaptic('light');
  activeVaultCategories = categories;
  
  document.getElementById('detailVaultTitle').textContent = vaultTitle;
  renderVaultList();
  
  document.getElementById('vaultDetailPanel').classList.add('open');
}

function closeVault() {
  triggerHaptic('light');
  document.getElementById('vaultDetailPanel').classList.remove('open');
  renderDashboard();
}

function renderVaultList() {
  const listContainer = document.getElementById('detailList');
  const emptyState = document.getElementById('detailEmptyState');
  
  const filtered = items.filter(item => activeVaultCategories.includes(item.category));
  
  listContainer.innerHTML = '';
  
  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  
  filtered.forEach(item => {
    const status = computeStatus(item);
    const isOverdue = status === 'overdue';
    const isActiveCare = status === 'activeCare';
    
    let dotClass = 'dim-text';
    if (isOverdue) dotClass = 'overdue';
    else if (isActiveCare) dotClass = 'active-care';
    
    const card = document.createElement('div');
    card.className = 'detail-card';
    
    card.innerHTML = `
      <div class="status-dot ${dotClass}" style="background-color: ${isOverdue ? '#c7ad8c' : isActiveCare ? 'rgba(199, 173, 140, 0.65)' : 'rgba(255,255,255,0.15)'}"></div>
      <div class="care-card-info" onclick="openEditForm('${item.id}')">
        <h4>${item.title}</h4>
        <p>Due: ${formatDate(item.importantDate)}</p>
      </div>
      <button class="btn-delete" onclick="requestDelete('${item.id}')">
        <svg class="delete-icon" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
      </button>
    `;
    listContainer.appendChild(card);
  });
}

// MARK: - DATA FORM SHEET CONTROLLER
function openAddForm() {
  triggerHaptic('heavy');
  document.getElementById('formTitle').textContent = "Place under care";
  document.getElementById('itemId').value = '';
  document.getElementById('itemForm').reset();
  
  // Sensible default dates (important: today, alert: 14 days ago)
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('importantDate').value = today;
  document.getElementById('reminderDate').value = getRelativeDateOffset(-14);
  
  document.getElementById('formOverlay').classList.add('open');
}

function openEditForm(id) {
  triggerHaptic('light');
  const item = items.find(i => i.id === id);
  if (!item) return;

  document.getElementById('formTitle').textContent = "Refine care details";
  document.getElementById('itemId').value = item.id;
  document.getElementById('title').value = item.title;
  document.getElementById('category').value = item.category;
  document.getElementById('importantDate').value = item.importantDate;
  document.getElementById('reminderDate').value = item.reminderDate;
  document.getElementById('notes').value = item.notes;

  document.getElementById('formOverlay').classList.add('open');
}

function closeForm() {
  triggerHaptic('light');
  document.getElementById('formOverlay').classList.remove('open');
}

function saveItem(e) {
  e.preventDefault();
  triggerHaptic('heavy');
  
  const id = document.getElementById('itemId').value;
  const title = document.getElementById('title').value;
  const category = document.getElementById('category').value;
  const importantDate = document.getElementById('importantDate').value;
  const reminderDate = document.getElementById('reminderDate').value;
  const notes = document.getElementById('notes').value;

  if (id) {
    // Edit flow
    const index = items.findIndex(i => i.id === id);
    if (index !== -1) {
      items[index] = { id, title, category, importantDate, reminderDate, notes };
    }
  } else {
    // Create flow
    const newItem = {
      id: 'item-' + Date.now(),
      title,
      category,
      importantDate,
      reminderDate,
      notes
    };
    items.push(newItem);
  }

  localStorage.setItem('tiaki_items', JSON.stringify(items));
  closeForm();
  
  if (document.getElementById('vaultDetailPanel').classList.contains('open')) {
    renderVaultList();
  } else {
    renderDashboard();
  }
}

// MARK: - SECURE REMOVAL ALERTS
function requestDelete(id) {
  triggerHaptic('medium');
  itemToDeleteId = id;
  document.getElementById('deleteAlertOverlay').classList.add('open');
  
  const confirmBtn = document.getElementById('btnConfirmDelete');
  confirmBtn.onclick = executeDelete;
}

function cancelDelete() {
  triggerHaptic('light');
  document.getElementById('deleteAlertOverlay').classList.remove('open');
  itemToDeleteId = null;
}

function executeDelete() {
  triggerHaptic('heavy');
  if (itemToDeleteId) {
    items = items.filter(i => i.id !== itemToDeleteId);
    localStorage.setItem('tiaki_items', JSON.stringify(items));
  }
  
  document.getElementById('deleteAlertOverlay').classList.remove('open');
  itemToDeleteId = null;
  renderVaultList();
}

// MARK: - PHYSICAL SYSTEM HAPTICS
function triggerHaptic(style) {
  if (window.navigator && window.navigator.vibrate) {
    if (style === 'light') window.navigator.vibrate(15);
    else if (style === 'medium') window.navigator.vibrate(30);
    else if (style === 'heavy') window.navigator.vibrate([40, 20, 40]);
  }
}
