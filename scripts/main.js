document.addEventListener('DOMContentLoaded', function(){
  var nav = document.getElementById('mainNav');
  var toggle = document.getElementById('navToggle');
  if(nav && toggle){
    toggle.addEventListener('click', function(){
      var isOpen = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.setAttribute('aria-label', isOpen ? 'Cerrar menú' : 'Abrir menú');
    });

    nav.querySelectorAll('a').forEach(function(link){
      link.addEventListener('click', function(){
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Abrir menú');
      });
    });
  }

  var catalogTabs = Array.from(document.querySelectorAll('.catalog-tab'));
  var catalogPanels = Array.from(document.querySelectorAll('.catalog-panel'));
  function selectCategory(category, shouldScroll){
    var selectedPanel = document.getElementById(category);
    if(!selectedPanel || !selectedPanel.classList.contains('catalog-panel')) return;

    catalogTabs.forEach(function(tab){
      var isSelected = tab.dataset.category === category;
      tab.classList.toggle('is-active', isSelected);
      tab.setAttribute('aria-selected', String(isSelected));
    });
    catalogPanels.forEach(function(panel){
      panel.hidden = panel.id !== category;
    });
    if(shouldScroll) selectedPanel.scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  catalogTabs.forEach(function(tab){
    tab.addEventListener('click', function(){
      selectCategory(tab.dataset.category, false);
    });
  });

  function selectCategoryFromHash(){
    var category = window.location.hash.slice(1);
    if(category) selectCategory(category, true);
  }
  selectCategoryFromHash();
  window.addEventListener('hashchange', selectCategoryFromHash);

  var form = document.getElementById('contactForm');
  if(form){
    var status = document.getElementById('formStatus');
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var name = form.name.value.trim();
      var company = form.company.value.trim();
      var email = form.email.value.trim();
      var message = form.message.value.trim();
      if(!name || !email || !message){
        status.textContent = 'Por favor completa los campos requeridos.';
        return;
      }

      var whatsappNumber = '5215611660078';
      var body = '*Nueva solicitud de cotización desde el sitio web*\n\n' +
        'Nombre: ' + name + '\n' +
        'Empresa: ' + (company || 'No indicada') + '\n' +
        'Correo: ' + email + '\n\n' +
        'Mensaje:\n' + message;

      status.textContent = 'Abriendo WhatsApp para enviar tu solicitud.';
      window.open('https://wa.me/' + whatsappNumber + '?text=' + encodeURIComponent(body), '_blank', 'noopener');
      form.reset();
    });
  }
});
