// app.js

// This function is called by license.js ONLY when the license is valid
window.__bootApp = async () => {
    console.log("✅ License verified. Booting Northstar...");
    
    // Optional: Add a subtle fade-in effect to the main app
    document.getElementById('app').style.opacity = '1';
    document.getElementById('app').style.transition = 'opacity 0.5s ease';

    // --- DOM Elements ---
    const goalsContainer = document.getElementById('goalsContainer');
    const netWorthValueEl = document.getElementById('netWorthValue');
    const currencySelector = document.getElementById('currencySelector');
    
    // Goal Modal Elements
    const modal = document.getElementById('modal');
    const goalForm = document.getElementById('goalForm');
    const addGoalBtn = document.getElementById('addGoalBtn');
    const cancelBtn = document.getElementById('cancelBtn');

    // Net Worth Modal Elements
    const netWorthModal = document.getElementById('netWorthModal');
    const updateNetWorthBtn = document.getElementById('updateNetWorthBtn');
    const netWorthForm = document.getElementById('netWorthForm');
    const cancelNetWorthBtn = document.getElementById('cancelNetWorthBtn');

    // Delete Modal Elements
    const deleteModal = document.getElementById('deleteModal');
    const deleteModalText = document.getElementById('deleteModalText');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

    // --- Helper: Native Offline Currency Formatter ---
    function formatCurrency(amount, currencyCode) {
        const locale = navigator.language || 'en-US'; 
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(amount);
    }

    // --- State Management ---
    let currentCurrency = 'USD';
    let editingGoalId = null;
    let deletingGoalId = null;

    async function loadSettings() {
        const settings = await DB.getAll('settings');
        const currencySetting = settings.find(s => s.key === 'currency');
        if (currencySetting) {
            currentCurrency = currencySetting.value;
        }
        currencySelector.value = currentCurrency;
    }

    // --- Net Worth Logic ---
    async function renderNetWorth() {
        const settings = await DB.getAll('settings');
        const assets = settings.find(s => s.key === 'assets')?.value || 0;
        const liabilities = settings.find(s => s.key === 'liabilities')?.value || 0;
        const netWorth = assets - liabilities;
        
        netWorthValueEl.textContent = formatCurrency(netWorth, currentCurrency);
        netWorthValueEl.style.color = netWorth >= 0 ? 'var(--success)' : '#f87171';
    }

    updateNetWorthBtn.addEventListener('click', async () => {
        const settings = await DB.getAll('settings');
        const assets = settings.find(s => s.key === 'assets')?.value || '';
        const liabilities = settings.find(s => s.key === 'liabilities')?.value || '';
        
        document.getElementById('totalAssets').value = assets;
        document.getElementById('totalLiabilities').value = liabilities;
        netWorthModal.classList.remove('hidden');
    });

    cancelNetWorthBtn.addEventListener('click', () => netWorthModal.classList.add('hidden'));

    netWorthForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const assets = parseFloat(document.getElementById('totalAssets').value) || 0;
        const liabilities = parseFloat(document.getElementById('totalLiabilities').value) || 0;

        await DB.update('settings', { key: 'assets', value: assets });
        await DB.update('settings', { key: 'liabilities', value: liabilities });
        
        netWorthModal.classList.add('hidden');
        renderNetWorth();
    });

    // --- Goals Logic ---
    async function renderGoals() {
        const goals = await DB.getAll('goals');
        goalsContainer.innerHTML = '';
        
        if (goals.length === 0) {
            goalsContainer.innerHTML = '<p style="color:var(--text-secondary); text-align:center; padding: 20px 0;">No goals yet. Add your first financial milestone!</p>';
            return;
        }

        goals.forEach(goal => {
            const percent = Math.min((goal.current / goal.target) * 100, 100).toFixed(1);
            const el = document.createElement('div');
            el.className = 'goal-item';
            el.dataset.goalId = goal.id;
            el.innerHTML = `
                <div class="goal-menu" id="menu-${goal.id}">
                    <button class="goal-menu-item" data-action="edit" data-id="${goal.id}">✏️ Edit</button>
                    <button class="goal-menu-item delete" data-action="delete" data-id="${goal.id}">🗑️ Delete</button>
                </div>
                <div class="goal-header">
                    <strong>${goal.name}</strong>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span>${percent}%</span>
                        <button class="goal-actions-btn" data-action="menu" data-id="${goal.id}" style="position: static; background: transparent; border: none; color: var(--text-secondary); font-size: 1.4rem; cursor: pointer; padding: 4px 8px; border-radius: 4px; line-height: 1;">⋮</button>
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percent}%"></div>
                </div>
                <p style="font-size:0.85rem; color:var(--text-secondary); margin-top:8px;">
                    ${formatCurrency(goal.current, currentCurrency)} / ${formatCurrency(goal.target, currentCurrency)}
                </p>
            `;
            goalsContainer.appendChild(el);
        });
    }

    goalsContainer.addEventListener('click', (e) => {
        const button = e.target.closest('[data-action]');
        if (!button) return;
        const action = button.dataset.action;
        const goalId = parseInt(button.dataset.id, 10);

        if (action === 'menu') {
            document.querySelectorAll('.goal-menu.active').forEach(m => m.classList.remove('active'));
            const menu = document.getElementById(`menu-${goalId}`);
            if (menu) menu.classList.toggle('active');
        } else if (action === 'edit') openEditModal(goalId);
        else if (action === 'delete') openDeleteModal(goalId);
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.goal-item')) {
            document.querySelectorAll('.goal-menu.active').forEach(m => m.classList.remove('active'));
        }
    });

    addGoalBtn.addEventListener('click', () => {
        editingGoalId = null;
        document.getElementById('modalTitle').textContent = 'Add Goal';
        goalForm.reset();
        modal.classList.remove('hidden');
    });

    cancelBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        editingGoalId = null;
        goalForm.reset();
    });

    async function openEditModal(goalId) {
        const goals = await DB.getAll('goals');
        const goal = goals.find(g => g.id === goalId);
        if (!goal) return;
        editingGoalId = goalId;
        document.getElementById('modalTitle').textContent = 'Edit Goal';
        document.getElementById('goalName').value = goal.name;
        document.getElementById('goalTarget').value = goal.target;
        document.getElementById('goalCurrent').value = goal.current;
        const menu = document.getElementById(`menu-${goalId}`);
        if (menu) menu.classList.remove('active');
        modal.classList.remove('hidden');
    }

    async function openDeleteModal(goalId) {
        const goals = await DB.getAll('goals');
        const goal = goals.find(g => g.id === goalId);
        if (!goal) return;
        deletingGoalId = goalId;
        deleteModalText.textContent = `Are you sure you want to delete "${goal.name}"? This cannot be undone.`;
        const menu = document.getElementById(`menu-${goalId}`);
        if (menu) menu.classList.remove('active');
        deleteModal.classList.remove('hidden');
    }

    cancelDeleteBtn.addEventListener('click', () => {
        deleteModal.classList.add('hidden');
        deletingGoalId = null;
    });

    confirmDeleteBtn.addEventListener('click', async () => {
        if (deletingGoalId !== null) {
            await DB.delete('goals', deletingGoalId);
            deletingGoalId = null;
            deleteModal.classList.add('hidden');
            renderGoals();
        }
    });

    goalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const goalData = {
            name: document.getElementById('goalName').value,
            target: parseFloat(document.getElementById('goalTarget').value),
            current: parseFloat(document.getElementById('goalCurrent').value)
        };
        
        if (editingGoalId !== null) {
            goalData.id = editingGoalId;
            await DB.update('goals', goalData);
            editingGoalId = null;
        } else {
            await DB.add('goals', goalData);
        }
        
        modal.classList.add('hidden');
        goalForm.reset();
        renderGoals();
    });

    // --- Currency Switcher Logic ---
    currencySelector.addEventListener('change', async (e) => {
        const newCurrency = e.target.value;
        await DB.update('settings', { key: 'currency', value: newCurrency });
        currentCurrency = newCurrency;
        renderNetWorth();
        renderGoals();
    });

    // --- Data Portability Logic (Export / Import) ---
    document.getElementById('exportBtn').addEventListener('click', async () => {
        const goals = await DB.getAll('goals');
        const settings = await DB.getAll('settings');
        const backupData = { version: 1, exportDate: new Date().toISOString(), goals, settings };
        const dataStr = JSON.stringify(backupData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `northstar-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    document.getElementById('importFile').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const backupData = JSON.parse(event.target.result);
                if (!backupData.goals || !backupData.settings) { alert('Invalid backup file.'); return; }
                const db = await DB.init();
                const tx = db.transaction(['goals', 'settings'], 'readwrite');
                tx.objectStore('goals').clear();
                tx.objectStore('settings').clear();
                for (const goal of backupData.goals) await DB.add('goals', goal);
                for (const setting of backupData.settings) await DB.update('settings', setting);
                alert('Data restored successfully!');
                await loadSettings();
                await renderNetWorth();
                await renderGoals();
            } catch (err) {
                console.error('Import failed:', err);
                alert('Failed to import data. Please check the file format.');
            }
        };
        reader.readAsText(file);
        e.target.value = ''; 
    });

    // --- Initial Render (Now triggered safely after license check) ---
    await loadSettings();
    await renderNetWorth();
    await renderGoals();
};