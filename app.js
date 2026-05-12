'use strict';

// ════════════════════════════════════════════════════════════
// 1. CONSTANTES Y CONFIGURACIÓN
// ════════════════════════════════════════════════════════════

const STORAGE_KEY  = 'taskflow_tareas';
const THEME_KEY    = 'taskflow_theme';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const NAME_REGEX  = /^[\p{L}\p{N}\s.,;:!?¿¡()\/\-–—]{3,120}$/u;

/** Prioridad numérica para ordenamiento (mayor = más urgente) */
const PRIORIDAD_PESO = { urgente: 4, alta: 3, media: 2, baja: 1 };

let filtroActivo  = 'todas';
let ordenActivo   = 'creacion';
let terminoBusqueda = '';

// ════════════════════════════════════════════════════════════
// 2. PERSISTENCIA (localStorage)
// ════════════════════════════════════════════════════════════

function obtenerTareas() {
  try {
    const datos = localStorage.getItem(STORAGE_KEY);
    if (!datos) return [];
    const parsed = JSON.parse(datos);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('TaskFlow: datos corruptos, reseteando.', err);
    return [];
  }
}

function guardarTareas(tareas) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tareas));
  } catch (err) {
    console.error('TaskFlow: error al guardar.', err);
    mostrarToast('Error al guardar. Almacenamiento lleno.', 'danger');
  }
}

// ════════════════════════════════════════════════════════════
// 3. CRUD COMPLETO
// ════════════════════════════════════════════════════════════

/** CREATE */
function agregarItem(nombre, email, prioridad, fechaLimite) {
  const tareas = obtenerTareas();
  const nueva = {
    id: crypto.randomUUID(),
    nombre,
    email,
    prioridad,
    fechaLimite: fechaLimite || null,   // ISO date string o null
    completada: false,
    creadoEn: new Date().toISOString()
  };
  tareas.unshift(nueva);
  guardarTareas(tareas);
  return nueva;
}

/** UPDATE — edita nombre, email, prioridad y fechaLimite de una tarea por ID */
function editarItem(id, datos) {
  const tareas = obtenerTareas();
  const tarea  = tareas.find(t => t.id === id);
  if (!tarea) return null;

  tarea.nombre     = datos.nombre;
  tarea.email      = datos.email;
  tarea.prioridad  = datos.prioridad;
  tarea.fechaLimite = datos.fechaLimite || null;

  guardarTareas(tareas);
  return tarea;
}

/** Toggle completada/pendiente */
function toggleCompletada(id) {
  const tareas = obtenerTareas();
  const tarea  = tareas.find(t => t.id === id);
  if (tarea) {
    tarea.completada = !tarea.completada;
    guardarTareas(tareas);
  }
  return tarea;
}

/** DELETE */
function eliminarItem(id) {
  guardarTareas(obtenerTareas().filter(t => t.id !== id));
}

/** Hard Reset */
function hardReset() {
  localStorage.removeItem(STORAGE_KEY);
  renderizarLista();
  actualizarStats();
  mostrarToast('Todas las tareas fueron eliminadas', 'danger');
}

// ════════════════════════════════════════════════════════════
// 4. SANITIZACIÓN Y VALIDACIÓN
// ════════════════════════════════════════════════════════════

function sanitizar(texto) {
  return texto.trim().replace(/\s+/g, ' ');
}

/** Retorna hoy en formato YYYY-MM-DD */
function hoyISO() {
  return new Date().toISOString().split('T')[0];
}

/** Formatea YYYY-MM-DD a texto legible en español */
function formatearFecha(isoDate) {
  if (!isoDate) return '';
  // Parsear sin timezone shift
  const [y, m, d] = isoDate.split('-').map(Number);
  const fecha = new Date(y, m - 1, d);
  return fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Valida los campos del formulario principal o del formulario de edición.
 * @param {'create'|'edit'} modo
 */
function validarCampos(modo) {
  const prefix = modo === 'edit' ? 'edit-task-' : 'task-';
  const groupPrefix = modo === 'edit' ? 'group-edit-' : 'group-task-';
  const errorPrefix = modo === 'edit' ? 'error-edit-' : 'error-task-';

  const nombreInput    = document.getElementById(prefix + 'name');
  const emailInput     = document.getElementById(prefix + 'email');
  const prioridadInput = document.getElementById(prefix + 'priority');
  const dueInput       = document.getElementById(prefix + 'due');

  const nombre    = sanitizar(nombreInput.value);
  const email     = sanitizar(emailInput.value);
  const prioridad = prioridadInput.value;
  const due       = dueInput ? dueInput.value : '';

  let ok = true;

  // Nombre
  limpiarError(groupPrefix + 'name', errorPrefix + 'name');
  if (!nombre) {
    mostrarError(groupPrefix + 'name', errorPrefix + 'name', 'El nombre de la tarea es obligatorio.');
    ok = false;
  } else if (!NAME_REGEX.test(nombre)) {
    mostrarError(groupPrefix + 'name', errorPrefix + 'name', 'Usa entre 3–120 caracteres válidos. Sin símbolos especiales.');
    ok = false;
  }

  // Email
  limpiarError(groupPrefix + 'email', errorPrefix + 'email');
  if (!email) {
    mostrarError(groupPrefix + 'email', errorPrefix + 'email', 'El email del asignado es obligatorio.');
    ok = false;
  } else if (!EMAIL_REGEX.test(email)) {
    mostrarError(groupPrefix + 'email', errorPrefix + 'email', 'Ingresa un email válido (ej: nombre@empresa.com).');
    ok = false;
  }

  // Prioridad
  limpiarError(groupPrefix + 'priority', errorPrefix + 'priority');
  if (!prioridad) {
    mostrarError(groupPrefix + 'priority', errorPrefix + 'priority', 'Selecciona una prioridad.');
    ok = false;
  }

  // Fecha límite (opcional, pero si existe no puede ser pasada)
  const dueGroupId = modo === 'edit' ? 'group-edit-due' : 'group-task-due';
  const dueErrId   = modo === 'edit' ? 'error-edit-due'  : 'error-task-due';
  limpiarError(dueGroupId, dueErrId);
  if (due && due < hoyISO()) {
    mostrarError(dueGroupId, dueErrId, 'La fecha límite no puede ser anterior a hoy.');
    ok = false;
  }

  if (!ok) return null;
  return { nombre, email, prioridad, fechaLimite: due || null };
}

// ════════════════════════════════════════════════════════════
// 5. ERRORES VISUALES
// ════════════════════════════════════════════════════════════

function mostrarError(groupId, errorId, mensaje) {
  const g = document.getElementById(groupId);
  const s = document.getElementById(errorId);
  if (g) g.classList.add('has-error');
  if (s) s.textContent = mensaje;
}

function limpiarError(groupId, errorId) {
  const g = document.getElementById(groupId);
  const s = document.getElementById(errorId);
  if (g) g.classList.remove('has-error');
  if (s) s.textContent = '';
}

function limpiarTodosLosErrores() {
  ['group-task-name',     'group-task-email',     'group-task-priority',     'group-task-due'].forEach((g, i) => {
    limpiarError(g, ['error-task-name', 'error-task-email', 'error-task-priority', 'error-task-due'][i]);
  });
}

// ════════════════════════════════════════════════════════════
// 6. TOASTS
// ════════════════════════════════════════════════════════════

function mostrarToast(mensaje, tipo = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.classList.add('toast', `toast-${tipo}`);

  const icono = document.createElement('i');
  icono.classList.add(
    tipo === 'success' ? 'ri-checkbox-circle-fill' :
    tipo === 'danger'  ? 'ri-error-warning-fill'   : 'ri-information-fill'
  );

  const texto = document.createElement('span');
  texto.textContent = mensaje;

  toast.appendChild(icono);
  toast.appendChild(texto);
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s var(--ease-out) forwards';
    toast.addEventListener('animationend', () => toast.remove());
  }, 3500);
}

// ════════════════════════════════════════════════════════════
// 7. RENDERIZADO — XSS-SAFE
// ════════════════════════════════════════════════════════════

function obtenerTareasFiltradas() {
  let tareas = obtenerTareas();

  // — Filtro por estado —
  if (filtroActivo === 'completada') tareas = tareas.filter(t =>  t.completada);
  if (filtroActivo === 'pendiente')  tareas = tareas.filter(t => !t.completada);

  // — Búsqueda por texto —
  if (terminoBusqueda) {
    const q = terminoBusqueda.toLowerCase();
    tareas = tareas.filter(t =>
      t.nombre.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q)
    );
  }

  // — Ordenamiento —
  tareas = [...tareas].sort((a, b) => {
    if (ordenActivo === 'prioridad') {
      return (PRIORIDAD_PESO[b.prioridad] || 0) - (PRIORIDAD_PESO[a.prioridad] || 0);
    }
    if (ordenActivo === 'fecha') {
      // Tareas sin fecha van al final
      const fa = a.fechaLimite || '9999-12-31';
      const fb = b.fechaLimite || '9999-12-31';
      return fa.localeCompare(fb);
    }
    // 'creacion': más reciente primero (orden natural del array — unshift)
    return new Date(b.creadoEn) - new Date(a.creadoEn);
  });

  return tareas;
}

function renderizarLista() {
  const contenedor = document.getElementById('task-list');
  const emptyState = document.getElementById('empty-state');
  const tareas     = obtenerTareasFiltradas();

  contenedor.replaceChildren();

  if (tareas.length === 0) {
    emptyState.classList.remove('hidden');
  } else {
    emptyState.classList.add('hidden');
    tareas.forEach((tarea, i) => contenedor.appendChild(crearElementoTarea(tarea, i)));
  }
}

function crearElementoTarea(tarea, index) {
  const li = document.createElement('li');
  li.classList.add('task-item');
  if (tarea.completada) li.classList.add('completed');
  li.setAttribute('data-id', tarea.id);
  li.style.animationDelay = `${index * 0.04}s`;

  // — Checkbox —
  const check = document.createElement('button');
  check.classList.add('task-check');
  check.setAttribute('data-action', 'toggle');
  check.setAttribute('aria-label', tarea.completada ? 'Marcar como pendiente' : 'Marcar como completada');
  check.setAttribute('title', tarea.completada ? 'Desmarcar' : 'Completar');
  if (tarea.completada) {
    const checkIcon = document.createElement('i');
    checkIcon.classList.add('ri-check-line');
    check.appendChild(checkIcon);
  }

  // — Cuerpo —
  const body = document.createElement('div');
  body.classList.add('task-body');

  const titulo = document.createElement('p');
  titulo.classList.add('task-title');
  titulo.textContent = tarea.nombre;

  const meta = document.createElement('div');
  meta.classList.add('task-meta');

  // Email
  const emailSpan = document.createElement('span');
  emailSpan.classList.add('task-email');
  const emailIcon = document.createElement('i');
  emailIcon.classList.add('ri-mail-line');
  const emailText = document.createElement('span');
  emailText.textContent = tarea.email;
  emailSpan.appendChild(emailIcon);
  emailSpan.appendChild(emailText);

  // Badge de prioridad
  const badge = document.createElement('span');
  badge.classList.add('priority-badge', tarea.prioridad);
  badge.textContent = tarea.prioridad;

  meta.appendChild(emailSpan);
  meta.appendChild(badge);

  // Fecha límite (si existe)
  if (tarea.fechaLimite) {
    const fechaSpan = document.createElement('span');
    fechaSpan.classList.add('task-due');
    const hoy = hoyISO();
    if (tarea.fechaLimite < hoy && !tarea.completada) {
      fechaSpan.classList.add('overdue');
    }
    const calIcon = document.createElement('i');
    calIcon.classList.add('ri-calendar-event-line');
    const fechaText = document.createElement('span');
    fechaText.textContent = formatearFecha(tarea.fechaLimite);
    fechaSpan.appendChild(calIcon);
    fechaSpan.appendChild(fechaText);
    meta.appendChild(fechaSpan);
  }

  body.appendChild(titulo);
  body.appendChild(meta);

  // — Acciones —
  const actions = document.createElement('div');
  actions.classList.add('task-actions');

  // Botón editar
  const btnEdit = document.createElement('button');
  btnEdit.classList.add('btn', 'btn-icon', 'btn-edit');
  btnEdit.setAttribute('data-action', 'edit');
  btnEdit.setAttribute('aria-label', 'Editar tarea');
  btnEdit.setAttribute('title', 'Editar');
  const editIcon = document.createElement('i');
  editIcon.classList.add('ri-edit-line');
  btnEdit.appendChild(editIcon);

  // Botón eliminar
  const btnDelete = document.createElement('button');
  btnDelete.classList.add('btn', 'btn-icon');
  btnDelete.setAttribute('data-action', 'delete');
  btnDelete.setAttribute('aria-label', 'Eliminar tarea');
  btnDelete.setAttribute('title', 'Eliminar');
  const deleteIcon = document.createElement('i');
  deleteIcon.classList.add('ri-delete-bin-6-line');
  btnDelete.appendChild(deleteIcon);

  actions.appendChild(btnEdit);
  actions.appendChild(btnDelete);

  li.appendChild(check);
  li.appendChild(body);
  li.appendChild(actions);

  return li;
}

// ════════════════════════════════════════════════════════════
// 8. ESTADÍSTICAS
// ════════════════════════════════════════════════════════════

function actualizarStats() {
  const tareas     = obtenerTareas();
  const total      = tareas.length;
  const completadas = tareas.filter(t => t.completada).length;
  const pendientes = total - completadas;

  const container = document.getElementById('stats-bar');
  container.replaceChildren();

  [
    { label: 'Total',     value: total      },
    { label: 'Pendientes', value: pendientes },
    { label: 'Listas',    value: completadas }
  ].forEach(item => {
    const div = document.createElement('div');
    div.classList.add('stat-item');
    const num = document.createElement('span');
    num.classList.add('stat-number');
    num.textContent = item.value;
    const lbl = document.createElement('span');
    lbl.classList.add('stat-label');
    lbl.textContent = item.label;
    div.appendChild(num);
    div.appendChild(lbl);
    container.appendChild(div);
  });
}

// ════════════════════════════════════════════════════════════
// 9. MODAL DE EDICIÓN
// ════════════════════════════════════════════════════════════

function abrirModalEdicion(id) {
  const tarea = obtenerTareas().find(t => t.id === id);
  if (!tarea) return;

  document.getElementById('edit-task-id').value       = tarea.id;
  document.getElementById('edit-task-name').value     = tarea.nombre;
  document.getElementById('edit-task-email').value    = tarea.email;
  document.getElementById('edit-task-priority').value = tarea.prioridad;
  document.getElementById('edit-task-due').value      = tarea.fechaLimite || '';

  // Poner el mínimo de fecha límite en hoy
  document.getElementById('edit-task-due').min = hoyISO();

  // Limpiar errores previos
  ['group-edit-name','group-edit-email','group-edit-priority','group-edit-due'].forEach((g, i) => {
    limpiarError(g, ['error-edit-name','error-edit-email','error-edit-priority','error-edit-due'][i]);
  });

  const modal = document.getElementById('modal-edit');
  modal.classList.remove('hidden');
  // Focus en el primer campo
  document.getElementById('edit-task-name').focus();
}

function cerrarModalEdicion() {
  document.getElementById('modal-edit').classList.add('hidden');
}

// ════════════════════════════════════════════════════════════
// 10. FOCUS TRAP GENÉRICO
// ════════════════════════════════════════════════════════════

/**
 * Devuelve todos los elementos focusables dentro de un contenedor.
 */
function getFocusables(container) {
  return Array.from(container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )).filter(el => !el.disabled && !el.closest('[hidden]'));
}

/**
 * Aplica focus trap a un overlay modal:
 * - Tab / Shift+Tab ciclan dentro del modal
 * - Escape cierra el modal
 * @param {HTMLElement} overlay  — el div.modal-overlay
 * @param {Function}    cerrarFn — función que cierra el modal
 * @returns {Function} — listener a remover cuando se cierre
 */
function crearFocusTrap(overlay, cerrarFn) {
  function handler(e) {
    if (e.key === 'Escape') {
      cerrarFn();
      return;
    }
    if (e.key !== 'Tab') return;

    const focusables = getFocusables(overlay.querySelector('.modal, .modal-edit-body') || overlay);
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last  = focusables[focusables.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  overlay.addEventListener('keydown', handler);
  return handler; // Para limpiar si fuera necesario
}

// ════════════════════════════════════════════════════════════
// 11. EVENT LISTENERS — DOMContentLoaded
// ════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

  // — Poner mínimo de fecha en hoy —
  document.getElementById('task-due').min = hoyISO();

  // — Render inicial —
  renderizarLista();
  actualizarStats();

  // ——— Formulario: submit (CREAR) ———
  document.getElementById('task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    limpiarTodosLosErrores();

    const datos = validarCampos('create');
    if (!datos) return;

    agregarItem(datos.nombre, datos.email, datos.prioridad, datos.fechaLimite);
    e.target.reset();
    document.getElementById('task-due').min = hoyISO();
    renderizarLista();
    actualizarStats();
    mostrarToast('Tarea creada exitosamente', 'success');
  });

  // ——— Formulario: submit (EDITAR) ———
  document.getElementById('edit-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const datos = validarCampos('edit');
    if (!datos) return;

    const id = document.getElementById('edit-task-id').value;
    editarItem(id, datos);
    cerrarModalEdicion();
    renderizarLista();
    actualizarStats();
    mostrarToast('Tarea actualizada', 'success');
  });

  // ——— Delegación de eventos en la lista ———
  document.getElementById('task-list').addEventListener('click', (e) => {
    const actionBtn = e.target.closest('[data-action]');
    if (!actionBtn) return;

    const taskItem = actionBtn.closest('.task-item');
    if (!taskItem) return;

    const taskId = taskItem.getAttribute('data-id');
    const action = actionBtn.getAttribute('data-action');

    if (action === 'toggle') {
      const tarea = toggleCompletada(taskId);
      renderizarLista();
      actualizarStats();
      if (tarea) {
        mostrarToast(tarea.completada ? 'Tarea completada' : 'Tarea marcada como pendiente', 'success');
      }
    }

    if (action === 'edit') {
      abrirModalEdicion(taskId);
    }

    if (action === 'delete') {
      taskItem.classList.add('removing');
      taskItem.addEventListener('animationend', () => {
        eliminarItem(taskId);
        renderizarLista();
        actualizarStats();
        mostrarToast('Tarea eliminada', 'danger');
      });
    }
  });

  // ——— Filtros ———
  document.querySelector('.filters-section').addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    filtroActivo = chip.getAttribute('data-filter');
    renderizarLista();
  });

  // ——— Búsqueda en tiempo real ———
  document.getElementById('search-input').addEventListener('input', (e) => {
    terminoBusqueda = e.target.value.trim();
    renderizarLista();
  });

  // ——— Ordenamiento ———
  document.querySelector('.sort-controls').addEventListener('click', (e) => {
    const btn = e.target.closest('.sort-btn');
    if (!btn) return;
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    ordenActivo = btn.getAttribute('data-sort');
    renderizarLista();
  });

  // ——— Limpiar errores en tiempo real ———
  document.getElementById('task-name').addEventListener('input',     () => limpiarError('group-task-name',     'error-task-name'));
  document.getElementById('task-email').addEventListener('input',    () => limpiarError('group-task-email',    'error-task-email'));
  document.getElementById('task-priority').addEventListener('change',() => limpiarError('group-task-priority', 'error-task-priority'));
  document.getElementById('task-due').addEventListener('change',     () => limpiarError('group-task-due',      'error-task-due'));

  // ——— Modal Hard Reset ———
  const modalReset = document.getElementById('modal-reset');

  document.getElementById('btn-hard-reset').addEventListener('click', () => {
    modalReset.classList.remove('hidden');
    // Focus en Cancelar (acción segura)
    document.getElementById('modal-cancel').focus();
  });

  document.getElementById('modal-cancel').addEventListener('click', () => modalReset.classList.add('hidden'));
  document.getElementById('modal-confirm').addEventListener('click', () => {
    modalReset.classList.add('hidden');
    hardReset();
  });

  // Cerrar al click fuera del modal
  modalReset.addEventListener('click', (e) => {
    if (e.target === modalReset) modalReset.classList.add('hidden');
  });

  // Focus trap + Escape en modal de reset
  crearFocusTrap(modalReset, () => modalReset.classList.add('hidden'));

  // ——— Modal Edición ———
  const modalEdit = document.getElementById('modal-edit');

  document.getElementById('modal-edit-close').addEventListener('click', cerrarModalEdicion);
  document.getElementById('edit-cancel').addEventListener('click', cerrarModalEdicion);

  modalEdit.addEventListener('click', (e) => {
    if (e.target === modalEdit) cerrarModalEdicion();
  });

  // Focus trap + Escape en modal de edición
  crearFocusTrap(modalEdit, cerrarModalEdicion);

  // Limpiar errores del form de edición en tiempo real
  document.getElementById('edit-task-name').addEventListener('input',     () => limpiarError('group-edit-name',     'error-edit-name'));
  document.getElementById('edit-task-email').addEventListener('input',    () => limpiarError('group-edit-email',    'error-edit-email'));
  document.getElementById('edit-task-priority').addEventListener('change',() => limpiarError('group-edit-priority', 'error-edit-priority'));
  document.getElementById('edit-task-due').addEventListener('change',     () => limpiarError('group-edit-due',      'error-edit-due'));

  // ——— Dark Mode ———
  const htmlEl    = document.documentElement;
  const themeIcon = document.getElementById('theme-icon');

  function aplicarTema(tema) {
    htmlEl.setAttribute('data-theme', tema);
    themeIcon.className = tema === 'dark' ? 'ri-sun-line' : 'ri-moon-line';
    localStorage.setItem(THEME_KEY, tema);
  }

  const temaGuardado = localStorage.getItem(THEME_KEY);
  if (temaGuardado) {
    aplicarTema(temaGuardado);
  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    aplicarTema('dark');
  }

  document.getElementById('btn-theme-toggle').addEventListener('click', () => {
    aplicarTema(htmlEl.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });
});
