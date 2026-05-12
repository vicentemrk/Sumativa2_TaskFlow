# TaskFlow — Gestor de Tareas

> Gestor tareas moderno, seguro, responsive. HTML5 + CSS3 + Vanilla JS.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript_ES6+-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-Academic-blue?style=flat-square)
![Arquitectura](https://img.shields.io/badge/Arquitectura-IIFE_Modular-8b5cf6?style=flat-square)

---

## 🚀 Descripción

**TaskFlow** es un gestor de tareas tipo SaaS premium, desarrollado como proyecto académico. Implementa un diseño "Electric SaaS" con optimización móvil avanzada, micro-interacciones y una arquitectura modular robusta. Sin dependencias externas.

---

## ✨ Características

### Experiencia Premium (v4.0)
- 🎨 **Electric SaaS UI** — Estética moderna basada en la paleta **Electric Violet** con tipografía **Outfit**.
- 📱 **Experiencia Mobile-First** — FAB (Botón Flotante) y Bottom Sheet para una gestión táctil ergonómica.
- ✨ **Design Spells** — Micro-interacciones premium: animaciones spring, efectos de brillo (shimmer) y feedback visual avanzado.
- 🌓 **Dark Mode Pro** — Soporte nativo para temas claro y oscuro con persistencia y contrastes optimizados.

### CRUD & Gestión
- **Ciclo Completo** — Crear, leer, editar, toggle y eliminar tareas con confirmación.
- 🔍 **Búsqueda Pro** — Filtrado en tiempo real por nombre o email (case-insensitive).
- 🔃 **Orden Inteligente** — Ordenamiento por creación, prioridad (urgente > baja) o fecha límite.
- 📥 **Exportación JSON** — Respaldo de datos instantáneo usando la API de Blobs.

### Seguridad & Calidad
- 🛡️ **XSS-safe**: Uso estricto de `textContent` y DOM API.
- ✅ **Validación Robusta**: Regex RFC 5322 + sanitización automática de espacios.
- ♿ **Accesibilidad**: Focus trap en modales (Tab / Shift+Tab / Escape) y soporte ARIA.
- 🧪 **TDD Ready**: Suite de tests integrada para validar lógica de negocio en aislamiento.

---

## 🏗️ Arquitectura — Módulos IIFE

4 módulos [IIFE](https://developer.mozilla.org/es/docs/Glossary/IIFE) en `app.js`. Encapsula estado interno, expone solo API pública — mismo concepto que `export` en ES6.

```
app.js
├── Store     — CRUD sobre localStorage
├── Query     — Filtrado, búsqueda, ordenamiento (estado vista)
├── Validator — Validación pura, sin DOM
└── UI        — Renderizado, toasts, modales, stats
```

| Principio | Aplicación |
|-----------|-----------|
| **Encapsulación** | Impl oculta, solo API pública visible |
| **Módulos profundos** | `Validator.validar(datos) → {ok, errores/datos}` — regex + sanitización ocultos |
| **Sin DOM en lógica** | `Validator` y `Query` testables en aislamiento |
| **Delegación eventos** | Un listener en `#task-list` maneja toggle/edit/delete |

```
DOMContentLoaded
      ├─► Store    ◄─── UI
      ├─► Query    ◄─── UI
      ├─► Validator ◄── UI
      └─► UI (consume Store + Query + Validator)
```

---

## 🧪 Tests

`app.test.js` — 13 tests de comportamiento. Sin framework.

**Ejecutar:**
1. Abrir `index.html` en browser.
2. Consola (F12).
3. Pegar contenido de `app.test.js`.
4. Ver reporte `✔ PASS / ✘ FAIL`.

Ciclo TDD: **RED → GREEN → REFACTOR**. Testea solo interfaz pública.

---

## 🛠️ Tecnologías

| Tecnología | Uso |
|---|---|
| **HTML5 semántico** | Estructura, roles ARIA |
| **CSS3 (Advanced)** | HSL Tokens, Spring Easing, Backdrop Blur, Shimmer |
| **JavaScript ES6+** | Arquitectura IIFE, crypto UUID, Blobs |
| **Web Storage API** | Persistencia sin backend |
| **Remix Icon** | Iconografía ligera y profesional |
| **Outfit & Inter** | Tipografía premium vía Google Fonts |

---

## 📂 Estructura

```
Sumativa-2-TaskFlow-/
├── index.html      # HTML + referencias recursos
├── styles.css      # Design system (tokens, componentes, animaciones)
├── app.js          # Store + Query + Validator + UI
├── app.test.js     # 13 tests comportamiento
└── README.md
```

---

## 🚀 Despliegue

```bash
git clone https://github.com/vicentemrk/Sumativa-2-TaskFlow-.git
cd Sumativa-2-TaskFlow-
# Abrir index.html o usar Live Server
```

👉 **[Ver en vivo — GitHub Pages](https://vicentemrk.github.io/Sumativa-2-TaskFlow-/)**

---

## 🤖 IA Generativa (Antigravity)

| Iteración | Contribución |
|-----------|-------------|
| **v1** | Estructura, paleta básica y validaciones |
| **v2** | XSS-safe, toasts y modo oscuro |
| **v3** | Arquitectura IIFE, tests TDD, focus trap |
| **v4** | UI Premium "Electric SaaS", FAB, Bottom Sheet y Micro-interacciones |

IA auditó arquitectura, seguridad y testing. Diseño conceptual: requerimiento académico.

---

## 👤 Autor

- GitHub: [@vicentemrk](https://github.com/vicentemrk)

---

## 📄 Licencia

Proyecto con fines académicos. Todos derechos reservados © 2026.
