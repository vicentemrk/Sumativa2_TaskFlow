/**
 * TaskFlow — Suite de Tests TDD (v2)
 * ====================================
 * Módulos testeados: Validator (8 casos), Query (5 casos)
 * Total: 13 tests de comportamiento.
 *
 * Cómo ejecutar:
 *   1. Abre index.html en el navegador
 *   2. Abre la consola (F12)
 *   3. Copia y pega todo este archivo
 *   4. Verás un reporte ✔ PASS / ✘ FAIL por cada test
 *
 * Patrón: RED → GREEN → REFACTOR
 * Los tests verifican solo comportamiento observable a través
 * de la interfaz pública — sin conocer implementación interna.
 */

'use strict';

(function runTests() {

  // ── Micro-runner ──────────────────────────────────────────────────────────
  let passed = 0;
  let failed = 0;

  function test(descripcion, fn) {
    try {
      fn();
      console.log(`%c  ✔ PASS %c ${descripcion}`, 'color:#22c55e;font-weight:bold', 'color:inherit');
      passed++;
    } catch (err) {
      console.error(`  ✘ FAIL  ${descripcion}\n       → ${err.message}`);
      failed++;
    }
  }

  function assert(condicion, mensaje) {
    if (!condicion) throw new Error(mensaje || 'Aserción fallida');
  }

  function assertEqual(a, b) {
    if (a !== b) throw new Error(`Esperado: ${JSON.stringify(b)}, obtenido: ${JSON.stringify(a)}`);
  }

  // ════════════════════════════════════════════════════════════════════════
  // VALIDATOR — 8 casos
  // Interfaz: Validator.validar({nombre, email, prioridad, fechaLimite})
  //           → { ok: false, errores: {...} } | { ok: true, datos: {...} }
  // ════════════════════════════════════════════════════════════════════════

  console.group('%c── Validator', 'color:#818cf8;font-weight:bold');

  // Caso 1: email vacío
  test('email vacío → error email', () => {
    const r = Validator.validar({ nombre: 'Tarea válida', email: '', prioridad: 'alta', fechaLimite: '' });
    assertEqual(r.ok, false);
    assert(r.errores.email, 'Debe existir error de email');
  });

  // Caso 2: email con formato inválido
  test('email inválido (sin @) → error email', () => {
    const r = Validator.validar({ nombre: 'Tarea válida', email: 'noesunmail', prioridad: 'alta', fechaLimite: '' });
    assertEqual(r.ok, false);
    assert(r.errores.email, 'Debe existir error de email');
  });

  // Caso 3: email válido con subdominio
  test('email con subdominio válido → sin error email', () => {
    const r = Validator.validar({ nombre: 'Tarea ok', email: 'user@mail.empresa.com', prioridad: 'media', fechaLimite: '' });
    assert(!r.errores?.email, 'No debe haber error de email');
  });

  // Caso 4: nombre vacío
  test('nombre vacío → error nombre', () => {
    const r = Validator.validar({ nombre: '', email: 'a@b.com', prioridad: 'alta', fechaLimite: '' });
    assertEqual(r.ok, false);
    assert(r.errores.nombre, 'Debe existir error de nombre');
  });

  // Caso 5: nombre muy corto (menos de 3 caracteres)
  test('nombre muy corto (2 chars) → error nombre', () => {
    const r = Validator.validar({ nombre: 'AB', email: 'a@b.com', prioridad: 'alta', fechaLimite: '' });
    assertEqual(r.ok, false);
    assert(r.errores.nombre, 'Debe existir error de nombre');
  });

  // Caso 6: fecha en el pasado
  test('fecha límite anterior a hoy → error fechaLimite', () => {
    const r = Validator.validar({ nombre: 'Ok tarea', email: 'a@b.com', prioridad: 'alta', fechaLimite: '2020-01-01' });
    assertEqual(r.ok, false);
    assert(r.errores.fechaLimite, 'Debe existir error de fechaLimite');
  });

  // Caso 7: prioridad no seleccionada
  test('prioridad vacía → error prioridad', () => {
    const r = Validator.validar({ nombre: 'Tarea ok', email: 'a@b.com', prioridad: '', fechaLimite: '' });
    assertEqual(r.ok, false);
    assert(r.errores.prioridad, 'Debe existir error de prioridad');
  });

  // Caso 8: datos completamente válidos
  test('datos válidos → ok:true con datos saneados', () => {
    const r = Validator.validar({
      nombre:      '  Mi tarea con espacios  ',
      email:       'test@empresa.com',
      prioridad:   'media',
      fechaLimite: ''
    });
    assertEqual(r.ok, true);
    assertEqual(r.datos.nombre, 'Mi tarea con espacios');  // trim aplicado
    assertEqual(r.datos.email, 'test@empresa.com');
    assertEqual(r.datos.prioridad, 'media');
    assertEqual(r.datos.fechaLimite, null);                // '' → null
  });

  console.groupEnd();

  // ════════════════════════════════════════════════════════════════════════
  // QUERY — 5 casos
  // Interfaz: Query.aplicar(tareas) → Tarea[]  (función pura)
  // ════════════════════════════════════════════════════════════════════════

  console.group('%c── Query', 'color:#818cf8;font-weight:bold');

  const TAREAS_DEMO = [
    { id: '1', nombre: 'Alpha', email: 'a@a.com', prioridad: 'baja',    completada: false, fechaLimite: '2099-01-03', creadoEn: '2024-01-01T00:00:00Z' },
    { id: '2', nombre: 'Beta',  email: 'b@b.com', prioridad: 'urgente', completada: true,  fechaLimite: '2099-01-01', creadoEn: '2024-01-02T00:00:00Z' },
    { id: '3', nombre: 'Gamma', email: 'c@c.com', prioridad: 'alta',    completada: false, fechaLimite: '2099-01-02', creadoEn: '2024-01-03T00:00:00Z' }
  ];

  // Q1: filtro completadas
  test('filtro "completada" devuelve solo completadas', () => {
    Query.setFiltro('completada'); Query.setBusqueda(''); Query.setOrden('creacion');
    const r = Query.aplicar(TAREAS_DEMO);
    assertEqual(r.length, 1);
    assertEqual(r[0].id, '2');
  });

  // Q2: filtro pendientes
  test('filtro "pendiente" devuelve solo pendientes', () => {
    Query.setFiltro('pendiente'); Query.setBusqueda(''); Query.setOrden('creacion');
    const r = Query.aplicar(TAREAS_DEMO);
    assertEqual(r.length, 2);
    assert(r.every(t => !t.completada), 'Todas deben ser pendientes');
  });

  // Q3: búsqueda case-insensitive
  test('búsqueda "gamma" (minúsculas) encuentra "Gamma"', () => {
    Query.setFiltro('todas'); Query.setBusqueda('gamma'); Query.setOrden('creacion');
    const r = Query.aplicar(TAREAS_DEMO);
    assertEqual(r.length, 1);
    assertEqual(r[0].id, '3');
  });

  // Q4: ordenamiento por prioridad
  test('orden "prioridad" → urgente > alta > baja', () => {
    Query.setFiltro('todas'); Query.setBusqueda(''); Query.setOrden('prioridad');
    const r = Query.aplicar(TAREAS_DEMO);
    assertEqual(r[0].prioridad, 'urgente');
    assertEqual(r[1].prioridad, 'alta');
    assertEqual(r[2].prioridad, 'baja');
  });

  // Q5: ordenamiento por fecha límite
  test('orden "fecha" → más próxima primero', () => {
    Query.setFiltro('todas'); Query.setBusqueda(''); Query.setOrden('fecha');
    const r = Query.aplicar(TAREAS_DEMO);
    assertEqual(r[0].fechaLimite, '2099-01-01');
    assertEqual(r[2].fechaLimite, '2099-01-03');
  });

  console.groupEnd();

  // ── Restaurar estado de Query para no afectar la app ─────────────────────
  Query.setFiltro('todas');
  Query.setBusqueda('');
  Query.setOrden('creacion');

  // ── Reporte final ─────────────────────────────────────────────────────────
  const total  = passed + failed;
  const color  = failed === 0 ? '#22c55e' : '#ef4444';
  const estado = failed === 0 ? '✔ Todos los tests pasaron' : `✘ ${failed} test(s) fallaron`;

  console.log(
    `\n%cTaskFlow Tests — ${estado} (${passed}/${total})`,
    `color:${color};font-size:14px;font-weight:bold`
  );

})();
