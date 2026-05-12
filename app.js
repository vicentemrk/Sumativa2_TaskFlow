'use strict';

// ════════════════════════════════════════════════════════════════════════════
// MÓDULO 1 — STORE
// Interfaz: obtener() → Tarea[]
//           guardar(tareas) → void
//           agregar(datos) → Tarea
//           editar(id, datos) → Tarea | null
//           toggle(id) → Tarea | null
//           eliminar(id) → void
//           resetear() → void
// Implementación: localStorage. Los callers no saben cómo persiste.
// ════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = 'taskflow_tareas';
const THEME_KEY   = 'taskflow_theme';

const Store = (() => {
  function obtener() {
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

  function guardar(tareas) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tareas));
    } catch (err) {
      console.error('TaskFlow: error al guardar.', err);
      UI.toast('Error al guardar. Almacenamiento lleno.', 'danger');
    }
  }

  function agregar({ nombre, email, prioridad, fechaLimite }) {
    const tareas = obtener();
    const nueva = {
      id: crypto.randomUUID(),
      nombre,
      email,
      prioridad,
      fechaLimite: fechaLimite || null,
      completada: false,
      creadoEn: new Date().toISOString()
    };
    tareas.unshift(nueva);
    guardar(tareas);
    return nueva;
  }

  function editar(id, { nombre, email, prioridad, fechaLimite }) {
    const tareas = obtener();
    const tarea  = tareas.find(t => t.id === id);
    if (!tarea) return null;
    tarea.nombre      = nombre;
    tarea.email       = email;
    tarea.prioridad   = prioridad;
    tarea.fechaLimite = fechaLimite || null;
    guardar(tareas);
    return tarea;
  }

  function toggle(id) {
    const tareas = obtener();
    const tarea  = tareas.find(t => t.id === id);
    if (!tarea) return null;
    tarea.completada = !tarea.completada;
    guardar(tareas);
    return tarea;
  }

  function eliminar(id) {
    guardar(obtener().filter(t => t.id !== id));
  }

  function resetear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  return { obtener, guardar, agregar, editar, toggle, eliminar, resetear };
})();

// ════════════════════════════════════════════════════════════════════════════
// MÓDULO 2 — QUERY
// Interfaz: aplicar(tareas, { filtro, busqueda, orden }) → Tarea[]
// Estado mutable de la vista vive aquí, aislado.
// ════════════════════════════════════════════════════════════════════════════

const PRIORIDAD_PESO = { urgente: 4, alta: 3, media: 2, baja: 1 };

const Query = (() => {
  let filtro   = 'todas';
  let busqueda = '';
  let orden    = 'creacion';

  function setFiltro(v)   { filtro   = v; }
  function setBusqueda(v) { busqueda = v.trim(); }
  function setOrden(v)    { orden    = v; }

  /**
   * Aplica filtro, búsqueda y ordenamiento sobre un array de tareas.
   * Función pura: no accede al Store ni al DOM.
   * @param {Tarea[]} tareas
   * @returns {Tarea[]}
   */
  function aplicar(tareas) {
    let resultado = [...tareas];

    // Filtro por estado
    if (filtro === 'completada') resultado = resultado.filter(t =>  t.completada);
    if (filtro === 'pendiente')  resultado = resultado.filter(t => !t.completada);

    // Búsqueda por texto
    if (busqueda) {
      const q = busqueda.toLowerCase();
      resultado = resultado.filter(t =>
        t.nombre.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q)
      );
    }

    // Ordenamiento
    resultado.sort((a, b) => {
      if (orden === 'prioridad') {
        return (PRIORIDAD_PESO[b.prioridad] || 0) - (PRIORIDAD_PESO[a.prioridad] || 0);
      }
      if (orden === 'fecha') {
        const fa = a.fechaLimite || '9999-12-31';
        const fb = b.fechaLimite || '9999-12-31';
        return fa.localeCompare(fb);
      }
      // 'creacion' — más reciente primero
      return new Date(b.creadoEn) - new Date(a.creadoEn);
    });

    return resultado;
  }

  return { setFiltro, setBusqueda, setOrden, aplicar };
})();

// ════════════════════════════════════════════════════════════════════════════
// MÓDULO 3 — VALIDATOR
// Interfaz: validar({ nombre, email, prioridad, fechaLimite })
//           → { ok: true, datos } | { ok: false, errores: Record<string,string> }
// Sin conocimiento del DOM — testeable en aislamiento.
// ════════════════════════════════════════════════════════════════════════════

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const NAME_REGEX  = /^[\p{L}\p{N}\s.,;:!?¿¡()\/\-–—]{3,120}$/u;

const Validator = (() => {
  function hoyISO() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Valida un objeto de datos de tarea.
   * @param {{ nombre: string, email: string, prioridad: string, fechaLimite: string }} datos
   * @returns {{ ok: boolean, datos?: object, errores?: Record<string,string> }}
   */
  function validar({ nombre, email, prioridad, fechaLimite }) {
    const errores = {};
    const n = (nombre    || '').trim().replace(/\s+/g, ' ');
    const e = (email     || '').trim().replace(/\s+/g, ' ');
    const p = (prioridad || '').trim();
    const f = (fechaLimite || '').trim();

    if (!n) {
      errores.nombre = 'El nombre de la tarea es obligatorio.';
    } else if (!NAME_REGEX.test(n)) {
      errores.nombre = 'Usa entre 3–120 caracteres válidos. Sin símbolos especiales.';
    }

    if (!e) {
      errores.email = 'El email del asignado es obligatorio.';
    } else if (!EMAIL_REGEX.test(e)) {
      errores.email = 'Ingresa un email válido (ej: nombre@empresa.com).';
    }

    if (!p) {
      errores.prioridad = 'Selecciona una prioridad.';
    }

    if (f && f < hoyISO()) {
      errores.fechaLimite = 'La fecha límite no puede ser anterior a hoy.';
    }

    if (Object.keys(errores).length > 0) {
      return { ok: false, errores };
    }

    return { ok: true, datos: { nombre: n, email: e, prioridad: p, fechaLimite: f || null } };
  }

  return { validar, hoyISO };
})();

// ════════════════════════════════════════════════════════════════════════════
// MÓDULO 4 — UI
// Responsabilidades: DOM, toasts, renderizado, modales, estadísticas.
// Consume Store, Query y Validator. No contiene lógica de negocio.
// ════════════════════════════════════════════════════════════════════════════

const UI = (() => {

  // ── Utilidades de fecha ──────────────────────────────────────────────────

  function formatearFecha(isoDate) {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-CL', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  // ── Toasts ───────────────────────────────────────────────────────────────

  function toast(mensaje, tipo = 'success') {
    const container = document.getElementById('toast-container');
    const div = document.createElement('div');
    div.classList.add('toast', `toast-${tipo}`);

    const icono = document.createElement('i');
    icono.classList.add(
      tipo === 'success' ? 'ri-checkbox-circle-fill' :
      tipo === 'danger'  ? 'ri-error-warning-fill'   : 'ri-information-fill'
    );

    const texto = document.createElement('span');
    texto.textContent = mensaje;

    div.appendChild(icono);
    div.appendChild(texto);
    container.appendChild(div);

    setTimeout(() => {
      div.style.animation = 'toastOut 0.3s var(--ease-out) forwards';
      div.addEventListener('animationend', () => div.remove());
    }, 3500);
  }

  // ── Errores de formulario ────────────────────────────────────────────────

  /**
   * Muestra los errores de Validator en el DOM.
   * @param {Record<string,string>} errores
   * @param {'create'|'edit'} modo
   */
  function mostrarErrores(errores, modo) {
    const gp = modo === 'edit' ? 'group-edit-' : 'group-task-';
    const ep = modo === 'edit' ? 'error-edit-' : 'error-task-';

    // Mapeo campo semántico → sufijo de ID en el DOM
    const camposSufijo = {
      nombre:      'name',
      email:       'email',
      prioridad:   'priority',
      fechaLimite: 'due'
    };

    Object.entries(camposSufijo).forEach(([campo, sufijo]) => {
      const g = document.getElementById(gp + sufijo);
      const s = document.getElementById(ep + sufijo);
      if (errores[campo]) {
        if (g) g.classList.add('has-error');
        if (s) s.textContent = errores[campo];
      } else {
        if (g) g.classList.remove('has-error');
        if (s) s.textContent = '';
      }
    });
  }

  function limpiarErrores(modo) {
    mostrarErrores({}, modo);
  }

  // ── Renderizado de lista ─────────────────────────────────────────────────

  function renderizarLista() {
    const contenedor = document.getElementById('task-list');
    const emptyState = document.getElementById('empty-state');
    const tareas     = Query.aplicar(Store.obtener());

    contenedor.replaceChildren();

    if (tareas.length === 0) {
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
      tareas.forEach((tarea, i) => contenedor.appendChild(_crearElementoTarea(tarea, i)));
    }
  }

  function _crearElementoTarea(tarea, index) {
    const hoy = Validator.hoyISO();

    const li = document.createElement('li');
    li.classList.add('task-item');
    if (tarea.completada) li.classList.add('completed');
    li.setAttribute('data-id', tarea.id);
    li.style.animationDelay = `${index * 0.04}s`;

    // Checkbox
    const check = document.createElement('button');
    check.classList.add('task-check');
    check.setAttribute('data-action', 'toggle');
    check.setAttribute('aria-label', tarea.completada ? 'Marcar como pendiente' : 'Marcar como completada');
    check.setAttribute('title', tarea.completada ? 'Desmarcar' : 'Completar');
    if (tarea.completada) {
      const icon = document.createElement('i');
      icon.classList.add('ri-check-line');
      check.appendChild(icon);
    }

    // Cuerpo
    const body   = document.createElement('div');
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

    // Badge prioridad
    const badge = document.createElement('span');
    badge.classList.add('priority-badge', tarea.prioridad);
    badge.textContent = tarea.prioridad;

    meta.appendChild(emailSpan);
    meta.appendChild(badge);

    // Fecha límite
    if (tarea.fechaLimite) {
      const fechaSpan = document.createElement('span');
      fechaSpan.classList.add('task-due');
      if (tarea.fechaLimite < hoy && !tarea.completada) fechaSpan.classList.add('overdue');
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

    // Acciones
    const actions = document.createElement('div');
    actions.classList.add('task-actions');

    const btnEdit = document.createElement('button');
    btnEdit.classList.add('btn', 'btn-icon', 'btn-edit');
    btnEdit.setAttribute('data-action', 'edit');
    btnEdit.setAttribute('aria-label', 'Editar tarea');
    btnEdit.setAttribute('title', 'Editar');
    const editIcon = document.createElement('i');
    editIcon.classList.add('ri-edit-line');
    btnEdit.appendChild(editIcon);

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

  // ── Estadísticas ─────────────────────────────────────────────────────────

  function actualizarStats() {
    const tareas      = Store.obtener();
    const total       = tareas.length;
    const completadas = tareas.filter(t => t.completada).length;
    const pendientes  = total - completadas;

    const container = document.getElementById('stats-bar');
    container.replaceChildren();

    [
      { label: 'Total',      value: total      },
      { label: 'Pendientes', value: pendientes  },
      { label: 'Listas',     value: completadas }
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

  // ── Modal de edición ─────────────────────────────────────────────────────

  function abrirModalEdicion(id) {
    const tarea = Store.obtener().find(t => t.id === id);
    if (!tarea) return;

    document.getElementById('edit-task-id').value       = tarea.id;
    document.getElementById('edit-task-name').value     = tarea.nombre;
    document.getElementById('edit-task-email').value    = tarea.email;
    document.getElementById('edit-task-priority').value = tarea.prioridad;
    document.getElementById('edit-task-due').value      = tarea.fechaLimite || '';
    document.getElementById('edit-task-due').min        = Validator.hoyISO();

    limpiarErrores('edit');

    const modal = document.getElementById('modal-edit');
    modal.classList.remove('hidden');
    document.getElementById('edit-task-name').focus();
  }

  function cerrarModalEdicion() {
    document.getElementById('modal-edit').classList.add('hidden');
  }

  // ── Focus Trap ───────────────────────────────────────────────────────────

  function crearFocusTrap(overlay, cerrarFn) {
    function handler(e) {
      if (e.key === 'Escape') { cerrarFn(); return; }
      if (e.key !== 'Tab') return;

      const focusables = Array.from(
        overlay.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')
      ).filter(el => !el.disabled && !el.closest('[hidden]'));

      if (focusables.length === 0) return;
      const first = focusables[0];
      const last  = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    }
    overlay.addEventListener('keydown', handler);
    return handler;
  }

  // ── Exportar a JSON ──────────────────────────────────────────────────────

  /**
   * Descarga todas las tareas como archivo .json usando la Web API nativa.
   * Patrón: Blob → URL.createObjectURL → <a>.click() → revokeObjectURL
   */
  function exportarJSON() {
    const tareas = Store.obtener();
    if (tareas.length === 0) {
      toast('No hay tareas para exportar.', 'info');
      return;
    }
    const json     = JSON.stringify(tareas, null, 2);
    const blob     = new Blob([json], { type: 'application/json' });
    const url      = URL.createObjectURL(blob);
    const nombre   = `taskflow-tareas-${new Date().toISOString().split('T')[0]}.json`;
    const enlace   = document.createElement('a');
    enlace.href     = url;
    enlace.download = nombre;
    enlace.click();
    URL.revokeObjectURL(url);
    toast(`Exportadas ${tareas.length} tarea(s) a JSON ✓`, 'success');
  }

  // ── Refresco completo ─────────────────────────────────────────────────────

  function refrescar() {
    renderizarLista();
    actualizarStats();
  }

  return {
    toast,
    mostrarErrores,
    limpiarErrores,
    renderizarLista,
    actualizarStats,
    abrirModalEdicion,
    cerrarModalEdicion,
    crearFocusTrap,
    refrescar,
    exportarJSON
  };
})();

// ════════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN — DOMContentLoaded
// Solo registra event listeners y hace el render inicial.
// Sin lógica de negocio aquí.
// ════════════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

  // Mínimo de fecha = hoy
  document.getElementById('task-due').min = Validator.hoyISO();

  // Render inicial
  UI.refrescar();

  // ── Crear tarea ───────────────────────────────────────────────────────────
  document.getElementById('task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    UI.limpiarErrores('create');

    const raw = {
      nombre:      document.getElementById('task-name').value,
      email:       document.getElementById('task-email').value,
      prioridad:   document.getElementById('task-priority').value,
      fechaLimite: document.getElementById('task-due').value
    };

    const resultado = Validator.validar(raw);
    if (!resultado.ok) {
      UI.mostrarErrores(resultado.errores, 'create');
      return;
    }

    Store.agregar(resultado.datos);
    e.target.reset();
    document.getElementById('task-due').min = Validator.hoyISO();
    
    // Si estamos en móvil, cerrar el bottom sheet tras crear
    if (window.innerWidth <= 640) {
      document.getElementById('form-section').classList.remove('show-mobile');
      document.getElementById('form-overlay').classList.remove('active');
    }

    UI.refrescar();
    UI.toast('Tarea creada exitosamente', 'success');
  });

  // ── Editar tarea ──────────────────────────────────────────────────────────
  document.getElementById('edit-form').addEventListener('submit', (e) => {
    e.preventDefault();

    const raw = {
      nombre:      document.getElementById('edit-task-name').value,
      email:       document.getElementById('edit-task-email').value,
      prioridad:   document.getElementById('edit-task-priority').value,
      fechaLimite: document.getElementById('edit-task-due').value
    };

    const resultado = Validator.validar(raw);
    if (!resultado.ok) {
      UI.mostrarErrores(resultado.errores, 'edit');
      return;
    }

    const id = document.getElementById('edit-task-id').value;
    Store.editar(id, resultado.datos);
    UI.cerrarModalEdicion();
    UI.refrescar();
    UI.toast('Tarea actualizada', 'success');
  });

  // ── Acciones en la lista (delegación) ────────────────────────────────────
  document.getElementById('task-list').addEventListener('click', (e) => {
    const actionBtn = e.target.closest('[data-action]');
    if (!actionBtn) return;
    const taskItem = actionBtn.closest('.task-item');
    if (!taskItem) return;

    const taskId = taskItem.getAttribute('data-id');
    const action = actionBtn.getAttribute('data-action');

    if (action === 'toggle') {
      const tarea = Store.toggle(taskId);
      UI.refrescar();
      if (tarea) UI.toast(tarea.completada ? 'Tarea completada ✓' : 'Tarea marcada como pendiente', 'success');
    }

    if (action === 'edit') {
      UI.abrirModalEdicion(taskId);
    }

    if (action === 'delete') {
      taskItem.classList.add('removing');
      taskItem.addEventListener('animationend', () => {
        Store.eliminar(taskId);
        UI.refrescar();
        UI.toast('Tarea eliminada', 'danger');
      }, { once: true });
    }
  });

  // ── Filtros ───────────────────────────────────────────────────────────────
  document.querySelector('.filters-section').addEventListener('click', (e) => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    Query.setFiltro(chip.getAttribute('data-filter'));
    UI.renderizarLista();
  });

  // ── Búsqueda ──────────────────────────────────────────────────────────────
  document.getElementById('search-input').addEventListener('input', (e) => {
    Query.setBusqueda(e.target.value);
    UI.renderizarLista();
  });

  // ── Ordenamiento ──────────────────────────────────────────────────────────
  document.querySelector('.sort-controls').addEventListener('click', (e) => {
    const btn = e.target.closest('.sort-btn');
    if (!btn) return;
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    Query.setOrden(btn.getAttribute('data-sort'));
    UI.renderizarLista();
  });

  // ── Limpiar errores en tiempo real (crear) ────────────────────────────────
  [
    ['task-name',     'group-task-name',     'error-task-name',     'input'],
    ['task-email',    'group-task-email',    'error-task-email',    'input'],
    ['task-priority', 'group-task-priority', 'error-task-priority', 'change'],
    ['task-due',      'group-task-due',      'error-task-due',      'change']
  ].forEach(([inputId, groupId, errorId, evt]) => {
    document.getElementById(inputId).addEventListener(evt, () => {
      const g = document.getElementById(groupId);
      const s = document.getElementById(errorId);
      if (g) g.classList.remove('has-error');
      if (s) s.textContent = '';
    });
  });

  // ── Limpiar errores en tiempo real (editar) ───────────────────────────────
  [
    ['edit-task-name',     'group-edit-name',     'error-edit-name',     'input'],
    ['edit-task-email',    'group-edit-email',    'error-edit-email',    'input'],
    ['edit-task-priority', 'group-edit-priority', 'error-edit-priority', 'change'],
    ['edit-task-due',      'group-edit-due',      'error-edit-due',      'change']
  ].forEach(([inputId, groupId, errorId, evt]) => {
    document.getElementById(inputId).addEventListener(evt, () => {
      const g = document.getElementById(groupId);
      const s = document.getElementById(errorId);
      if (g) g.classList.remove('has-error');
      if (s) s.textContent = '';
    });
  });

  // ── Exportar JSON ─────────────────────────────────────────────────────────
  document.getElementById('btn-export-json').addEventListener('click', () => {
    UI.exportarJSON();
  });

  // ── Modal Hard Reset ──────────────────────────────────────────────────────
  const modalReset = document.getElementById('modal-reset');

  document.getElementById('btn-hard-reset').addEventListener('click', () => {
    modalReset.classList.remove('hidden');
    document.getElementById('modal-cancel').focus();
  });

  document.getElementById('modal-cancel').addEventListener('click', () => modalReset.classList.add('hidden'));

  document.getElementById('modal-confirm').addEventListener('click', () => {
    modalReset.classList.add('hidden');
    Store.resetear();
    UI.refrescar();
    UI.toast('Todas las tareas fueron eliminadas', 'danger');
  });

  modalReset.addEventListener('click', (e) => {
    if (e.target === modalReset) modalReset.classList.add('hidden');
  });

  UI.crearFocusTrap(modalReset, () => modalReset.classList.add('hidden'));

  // ── Modal Edición ─────────────────────────────────────────────────────────
  const modalEdit = document.getElementById('modal-edit');

  document.getElementById('modal-edit-close').addEventListener('click', UI.cerrarModalEdicion);
  document.getElementById('edit-cancel').addEventListener('click', UI.cerrarModalEdicion);

  modalEdit.addEventListener('click', (e) => {
    if (e.target === modalEdit) UI.cerrarModalEdicion();
  });

  UI.crearFocusTrap(modalEdit, UI.cerrarModalEdicion);

  // ── Dark Mode ─────────────────────────────────────────────────────────────
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

  // ── Mobile Bottom Sheet (Phase 3) ─────────────────────────────────────────
  const formSection = document.getElementById('form-section');
  const formOverlay = document.getElementById('form-overlay');
  const fabAdd      = document.getElementById('fab-add-task');
  const btnClose    = document.getElementById('btn-close-form');

  function toggleMobileForm(show) {
    if (show) {
      formSection.classList.add('show-mobile');
      formOverlay.classList.add('active');
      document.getElementById('task-name').focus();
    } else {
      formSection.classList.remove('show-mobile');
      formOverlay.classList.remove('active');
    }
  }

  fabAdd.addEventListener('click', () => toggleMobileForm(true));
  btnClose.addEventListener('click', () => toggleMobileForm(false));
  formOverlay.addEventListener('click', () => toggleMobileForm(false));

});
