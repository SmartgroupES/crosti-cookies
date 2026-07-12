const translations = {
  es: {
    "nav_resumen": "Resumen del Día",
    "nav_ventas": "Ventas & Análisis",
    "nav_personal": "Control Personal",
    "nav_kpis": "KPIs Mensuales",
    "nav_facturas": "Facturas Proveedores",
    "nav_rentabilidad": "Rentabilidad (P&L)",
    "nav_liquidaciones": "Liquidaciones (Royalties)",
    "nav_auditorias": "Auditoría Vitrina",
    "nav_soporte": "Soporte (Helpdesk)",
    "nav_marketing": "Marketing Local",
    "nav_logout": "Cerrar sesión",
    "nav_empresa": "Visión Global Empresa",
    "nav_escandallos": "Gestor de Escandallos",
    "nav_ingredientes": "Base de Ingredientes",
    "nav_proveedores": "Central de Compras",
    "nav_franquicias": "Red de Franquicias",
    "nav_crm": "Marketing & CRM",
    "nav_expansion": "Expansión y Proyectos",
    "nav_usuarios": "Usuarios y Permisos",
    "header_welcome": "¡Bienvenido",
    "header_role": "Rol actual:"
  },
  en: {
    "nav_resumen": "Daily Summary",
    "nav_ventas": "Sales & Analysis",
    "nav_personal": "Staff Control",
    "nav_kpis": "Monthly KPIs",
    "nav_facturas": "Supplier Invoices",
    "nav_rentabilidad": "Profitability (P&L)",
    "nav_liquidaciones": "Royalties & Settlements",
    "nav_auditorias": "Display Audit",
    "nav_soporte": "Support Helpdesk",
    "nav_marketing": "Local Marketing",
    "nav_logout": "Logout",
    "nav_empresa": "Global Company Vision",
    "nav_escandallos": "Recipe Costing",
    "nav_ingredientes": "Ingredients Base",
    "nav_proveedores": "Purchasing Center",
    "nav_franquicias": "Franchise Network",
    "nav_crm": "Marketing & CRM",
    "nav_expansion": "Expansion & Projects",
    "nav_usuarios": "Users & Permissions",
    "header_welcome": "Welcome",
    "header_role": "Current role:"
  }
};

function initI18n() {
  let lang = localStorage.getItem('crosti_lang') || 'es';
  document.documentElement.lang = lang;
  
  // Apply language globally to any element with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[lang] && translations[lang][key]) {
      // If it has children (like an icon svg), we want to only replace the text node
      if (el.childNodes.length > 1) {
        for (let i = 0; i < el.childNodes.length; i++) {
          if (el.childNodes[i].nodeType === 3 && el.childNodes[i].textContent.trim().length > 0) {
            el.childNodes[i].textContent = " " + translations[lang][key] + " ";
            break; // assume first text node is the label
          }
        }
      } else {
        el.textContent = translations[lang][key];
      }
    }
  });

  // Highlight active language button
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.style.opacity = btn.getAttribute('data-lang') === lang ? '1' : '0.5';
  });
}

function switchLang(lang) {
  localStorage.setItem('crosti_lang', lang);
  initI18n();
  // Optional: trigger a small reload or re-render of components if needed
  if(typeof cargarDashboard === 'function') cargarDashboard();
}

document.addEventListener('DOMContentLoaded', initI18n);
