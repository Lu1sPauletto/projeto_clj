/* =============================================
   CLJ MANAGEMENT — APP.JS
   Vanilla JS · localStorage Persistence
   ============================================= */

'use strict';

// ── STATE ──────────────────────────────────────
const STATE_KEY = 'clj_management_v1';

function loadState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { }
  return {
    jovens: [],
    materiais: [],
    visitas: []
  };
}

let state = loadState();

function saveState() {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── NAVIGATION ─────────────────────────────────
const pages = document.querySelectorAll('.page');
const navBtns = document.querySelectorAll('.nav-btn');

function navigate(pageId) {
  pages.forEach(p => p.classList.toggle('active', p.id === pageId));
  navBtns.forEach(b => b.classList.toggle('active', b.dataset.page === pageId));

  const labels = {
    dashboard: 'Dashboard',
    jovens: 'Jovens & Retiros',
    materiais: 'Materiais e Logística',
    visitas: 'Cronograma de Visitas'
  };
  document.getElementById('breadcrumb-current').textContent = labels[pageId] || pageId;

  closeSidebar();
  renderPage(pageId);
}

navBtns.forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.page));
});

// ── SIDEBAR MOBILE ──────────────────────────────
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');
const menuBtn = document.getElementById('menu-btn');

function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('visible'); }
function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('visible'); }

menuBtn.addEventListener('click', openSidebar);
overlay.addEventListener('click', closeSidebar);

// ── TOPBAR DATE ────────────────────────────────
(function setDate() {
  const el = document.getElementById('topbar-date');
  const now = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  el.textContent = now.toLocaleDateString('pt-BR', opts);
})();

// ── TOAST ──────────────────────────────────────
function toast(msg, type = 'default') {
  const icons = { default: '✔', success: '✅', error: '❌' };
  const container = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type] || '✔'}</span><span>${msg}</span>`;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(40px)'; t.style.transition = '.3s'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ── RENDER DISPATCH ────────────────────────────
function renderPage(pageId) {
  switch (pageId) {
    case 'dashboard': renderDashboard(); break;
    case 'jovens': renderJovens(); break;
    case 'materiais': renderMateriais(); break;
    case 'visitas': renderVisitas(); break;
  }
}

// ═══════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════
function renderDashboard() {
  document.getElementById('stat-jovens').textContent = state.jovens.length;
  document.getElementById('stat-materiais').textContent = state.materiais.length;
  document.getElementById('stat-visitas').textContent = state.visitas.length;
  document.getElementById('stat-pendentes').textContent =
    state.visitas.filter(v => v.status === 'Pendente').length;

  // Recent activity
  const activityEl = document.getElementById('activity-list');
  const events = [
    ...state.jovens.slice(-3).map(j => ({
      dot: 'blue', text: `Jovem <strong>${j.nome}</strong> cadastrado(a)`, time: j.criadoEm
    })),
    ...state.visitas.slice(-3).map(v => ({
      dot: v.status === 'Concluída' ? 'green' : 'orange',
      text: `Visita a <strong>${v.paroquia}</strong> — ${v.status}`, time: v.criadoEm
    })),
    ...state.materiais.slice(-2).map(m => ({
      dot: 'blue', text: `Material <strong>${m.nome}</strong> registrado`, time: m.criadoEm
    }))
  ].sort((a, b) => b.time - a.time).slice(0, 6);

  if (!events.length) {
    activityEl.innerHTML = `<div class="empty-state" style="padding:24px"><span class="empty-icon">📋</span><p>Sem atividade recente.</p></div>`;
    return;
  }

  activityEl.innerHTML = events.map(e => `
    <div class="activity-item">
      <span class="activity-dot ${e.dot === 'green' ? 'green' : e.dot === 'orange' ? 'orange' : ''}"></span>
      <span class="activity-text">${e.text}</span>
      <span class="activity-time">${formatDate(e.time)}</span>
    </div>
  `).join('');

  // Summary list
  const summaryEl = document.getElementById('summary-list');
  const proxVisita = state.visitas.find(v => v.status === 'Pendente');
  const itemBaixo = state.materiais.find(m => m.quantidade <= 2);

  const items = [];
  if (proxVisita) items.push({ icon: '📍', text: `Próxima visita: <strong>${proxVisita.paroquia}</strong> em ${proxVisita.data}` });
  if (itemBaixo) items.push({ icon: '⚠️', text: `Estoque baixo: <strong>${itemBaixo.nome}</strong> (${itemBaixo.quantidade} un.)` });
  if (!items.length) items.push({ icon: '✅', text: 'Tudo em ordem. Nenhum alerta.' });

  summaryEl.innerHTML = items.map(i => `
    <div class="activity-item">
      <span style="font-size:18px">${i.icon}</span>
      <span class="activity-text">${i.text}</span>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════
//  MÓDULO 1 — JOVENS & RETIROS
// ═══════════════════════════════════════════════
function renderJovens() {
  updateJovensBadge();
  filterJovens();
}

function updateJovensBadge() {
  const badge = document.getElementById('badge-jovens');
  badge.textContent = state.jovens.length;
  badge.style.display = state.jovens.length ? 'inline-block' : 'none';
}

// Form submit
document.getElementById('form-jovem').addEventListener('submit', function (e) {
  e.preventDefault();
  const nome = document.getElementById('j-nome').value.trim();
  const paroquia = document.getElementById('j-paroquia').value.trim();
  const contato = document.getElementById('j-contato').value.trim();
  const obs = document.getElementById('j-obs').value.trim();

  if (!nome || !paroquia) { toast('Preencha ao menos Nome e Paróquia.', 'error'); return; }

  state.jovens.push({ id: uid(), nome, paroquia, contato, obs, criadoEm: Date.now() });
  saveState();
  this.reset();
  toast('Jovem cadastrado com sucesso!', 'success');
  renderJovens();
});

document.getElementById('j-search').addEventListener('input', filterJovens);

function filterJovens() {
  const q = document.getElementById('j-search').value.toLowerCase();
  const filtered = state.jovens.filter(j =>
    j.nome.toLowerCase().includes(q) || j.paroquia.toLowerCase().includes(q)
  );
  renderJovensTable(filtered);
}

function renderJovensTable(data) {
  const tbody = document.getElementById('jovens-tbody');
  if (!data.length) {
    tbody.innerHTML = `
      <tr><td colspan="5">
        <div class="empty-state">
          <span class="empty-icon">🙍</span>
          <p>Nenhum jovem encontrado.</p>
          <small>Cadastre o primeiro jovem no formulário acima.</small>
        </div>
      </td></tr>`;
    return;
  }
  tbody.innerHTML = data.map((j, i) => `
    <tr>
      <td><strong>${j.nome}</strong></td>
      <td>${j.paroquia}</td>
      <td>${j.contato ? `<a href="https://wa.me/55${j.contato.replace(/\D/g, '')}" target="_blank" style="color:var(--accent);text-decoration:none;">📱 ${j.contato}</a>` : '<span style="color:var(--gray-300)">—</span>'}</td>
      <td style="max-width:180px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${j.obs || ''}">${j.obs || '<span style="color:var(--gray-300)">—</span>'}</td>
      <td>
        <button class="btn btn-danger btn-sm btn-icon" onclick="deleteJovem('${j.id}')" title="Excluir">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function deleteJovem(id) {
  if (!confirm('Excluir este jovem do cadastro?')) return;
  state.jovens = state.jovens.filter(j => j.id !== id);
  saveState();
  toast('Jovem removido.', 'default');
  renderJovens();
}

// ═══════════════════════════════════════════════
//  MÓDULO 2 — MATERIAIS E LOGÍSTICA
// ═══════════════════════════════════════════════
function renderMateriais() {
  updateMateriaisBadge();
  filterMateriais();
}

function updateMateriaisBadge() {
  const badge = document.getElementById('badge-materiais');
  badge.textContent = state.materiais.length;
  badge.style.display = state.materiais.length ? 'inline-block' : 'none';
}

document.getElementById('form-material').addEventListener('submit', function (e) {
  e.preventDefault();
  const nome = document.getElementById('m-nome').value.trim();
  const quantidade = parseInt(document.getElementById('m-qtd').value, 10);
  const responsavel = document.getElementById('m-responsavel').value.trim();

  if (!nome || isNaN(quantidade) || quantidade < 0) {
    toast('Preencha o Nome do Item e a Quantidade corretamente.', 'error');
    return;
  }

  state.materiais.push({ id: uid(), nome, quantidade, responsavel, criadoEm: Date.now() });
  saveState();
  this.reset();
  toast('Material registrado com sucesso!', 'success');
  renderMateriais();
});

document.getElementById('m-search').addEventListener('input', filterMateriais);

function filterMateriais() {
  const q = document.getElementById('m-search').value.toLowerCase();
  const filtered = state.materiais.filter(m =>
    m.nome.toLowerCase().includes(q) || (m.responsavel && m.responsavel.toLowerCase().includes(q))
  );
  renderMateriaisTable(filtered);
}

function renderMateriaisTable(data) {
  const tbody = document.getElementById('materiais-tbody');
  if (!data.length) {
    tbody.innerHTML = `
      <tr><td colspan="5">
        <div class="empty-state">
          <span class="empty-icon">📦</span>
          <p>Nenhum material cadastrado.</p>
          <small>Adicione itens no formulário acima.</small>
        </div>
      </td></tr>`;
    return;
  }
  tbody.innerHTML = data.map(m => {
    const lowStock = m.quantidade <= 2;
    return `
      <tr>
        <td><strong>${m.nome}</strong></td>
        <td>
          <span style="display:inline-flex;align-items:center;gap:8px;">
            <span class="badge ${lowStock ? 'badge-pending' : 'badge-done'}">${m.quantidade} un.</span>
            ${lowStock ? '<span style="font-size:11px;color:var(--warning)">⚠️ Baixo</span>' : ''}
          </span>
        </td>
        <td>${m.responsavel || '<span style="color:var(--gray-300)">Não definido</span>'}</td>
        <td><button class="btn btn-secondary btn-sm" onclick="editQuantidade('${m.id}')">✏️ Editar Qtd.</button></td>
        <td><button class="btn btn-danger btn-sm btn-icon" onclick="deleteMaterial('${m.id}')" title="Excluir">🗑️</button></td>
      </tr>`;
  }).join('');
}

function editQuantidade(id) {
  const mat = state.materiais.find(m => m.id === id);
  if (!mat) return;
  const novaQtd = prompt(`Informe a nova quantidade para "${mat.nome}":`, mat.quantidade);
  if (novaQtd === null) return;
  const parsed = parseInt(novaQtd, 10);
  if (isNaN(parsed) || parsed < 0) { toast('Quantidade inválida.', 'error'); return; }
  mat.quantidade = parsed;
  saveState();
  toast('Quantidade atualizada!', 'success');
  renderMateriais();
}

function deleteMaterial(id) {
  if (!confirm('Excluir este item do inventário?')) return;
  state.materiais = state.materiais.filter(m => m.id !== id);
  saveState();
  toast('Material removido.', 'default');
  renderMateriais();
}

// ═══════════════════════════════════════════════
//  MÓDULO 3 — CRONOGRAMA DE VISITAS
// ═══════════════════════════════════════════════
function renderVisitas() {
  updateVisitasBadge();
  filterVisitas();
}

function updateVisitasBadge() {
  const pend = state.visitas.filter(v => v.status === 'Pendente').length;
  const badge = document.getElementById('badge-visitas');
  badge.textContent = pend;
  badge.style.display = pend ? 'inline-block' : 'none';
}

document.getElementById('form-visita').addEventListener('submit', function (e) {
  e.preventDefault();
  const paroquia = document.getElementById('v-paroquia').value.trim();
  const data = document.getElementById('v-data').value;
  const status = document.getElementById('v-status').value;
  const obs = document.getElementById('v-obs').value.trim();

  if (!paroquia || !data) { toast('Preencha Paróquia e Data da visita.', 'error'); return; }

  state.visitas.push({ id: uid(), paroquia, data, status, obs, criadoEm: Date.now() });
  saveState();
  this.reset();
  toast('Visita registrada com sucesso!', 'success');
  renderVisitas();
});

let visitaFilter = 'all';

document.getElementById('filter-all').addEventListener('click', () => setVisitaFilter('all'));
document.getElementById('filter-pendente').addEventListener('click', () => setVisitaFilter('Pendente'));
document.getElementById('filter-concluida').addEventListener('click', () => setVisitaFilter('Concluída'));

function setVisitaFilter(f) {
  visitaFilter = f;
  document.getElementById('filter-all').classList.toggle('active', f === 'all');
  document.getElementById('filter-pendente').classList.toggle('active', f === 'Pendente');
  document.getElementById('filter-concluida').classList.toggle('active', f === 'Concluída');
  filterVisitas();
}

function filterVisitas() {
  let filtered = state.visitas;
  if (visitaFilter !== 'all') filtered = filtered.filter(v => v.status === visitaFilter);
  renderVisitasTable(filtered);
}

function renderVisitasTable(data) {
  const tbody = document.getElementById('visitas-tbody');
  if (!data.length) {
    tbody.innerHTML = `
      <tr><td colspan="5">
        <div class="empty-state">
          <span class="empty-icon">📅</span>
          <p>Nenhuma visita encontrada.</p>
          <small>Registre visitas às paróquias acima.</small>
        </div>
      </td></tr>`;
    return;
  }

  // Sort by date
  const sorted = [...data].sort((a, b) => a.data.localeCompare(b.data));

  tbody.innerHTML = sorted.map(v => `
    <tr>
      <td><strong>${v.paroquia}</strong></td>
      <td>${formatDateStr(v.data)}</td>
      <td><span class="badge ${v.status === 'Pendente' ? 'badge-pending' : 'badge-done'}">
        ${v.status === 'Pendente' ? '⏳' : '✅'} ${v.status}
      </span></td>
      <td style="max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${v.obs || ''}">${v.obs || '<span style="color:var(--gray-300)">—</span>'}</td>
      <td style="display:flex;gap:6px;flex-wrap:wrap;">
        ${v.status === 'Pendente'
      ? `<button class="btn btn-success btn-sm" onclick="concluirVisita('${v.id}')">✔ Concluir</button>`
      : `<button class="btn btn-secondary btn-sm" onclick="reabrirVisita('${v.id}')">↩ Reabrir</button>`
    }
        <button class="btn btn-danger btn-sm btn-icon" onclick="deleteVisita('${v.id}')" title="Excluir">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function concluirVisita(id) {
  const v = state.visitas.find(v => v.id === id);
  if (!v) return;
  v.status = 'Concluída';
  saveState();
  toast(`Visita à ${v.paroquia} concluída!`, 'success');
  renderVisitas();
  updateVisitasBadge();
}

function reabrirVisita(id) {
  const v = state.visitas.find(v => v.id === id);
  if (!v) return;
  v.status = 'Pendente';
  saveState();
  toast(`Visita à ${v.paroquia} reaberta.`, 'default');
  renderVisitas();
  updateVisitasBadge();
}

function deleteVisita(id) {
  if (!confirm('Excluir este registro de visita?')) return;
  state.visitas = state.visitas.filter(v => v.id !== id);
  saveState();
  toast('Visita removida.', 'default');
  renderVisitas();
}

// ── HELPERS ────────────────────────────────────
function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const diff = Date.now() - ts;
  if (diff < 60000) return 'agora mesmo';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min atrás`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`;
  return d.toLocaleDateString('pt-BR');
}

function formatDateStr(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

// ── INIT ───────────────────────────────────────
navigate('dashboard');
