if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

var lastFocusedElement = null;

function resetPageState() {
  if (!window.location.hash) {
    window.scrollTo(0, 0);
  }

  var modal = document.getElementById('catalogModal');
  if (modal) {
    modal.classList.add('modal-hidden');
    modal.setAttribute('aria-hidden', 'true');
    if ('inert' in modal) {
      modal.inert = true;
    }
  }

  var pageContent = document.querySelector('main');
  if (pageContent) {
    pageContent.removeAttribute('aria-hidden');
  }

  document.body.classList.remove('no-scroll');
  lastFocusedElement = null;
}

window.addEventListener('pageshow', function(event) {
  if (event.persisted) {
    resetPageState();
  }
});

window.addEventListener('load', resetPageState);

document.addEventListener('DOMContentLoaded', function(){
  resetPageState();
  document.body.classList.add('page-ready');

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

  function selectCategory(category){
    var selectedPanel = document.getElementById(category);
    if(!selectedPanel || !selectedPanel.classList.contains('catalog-panel')) return;

    catalogTabs.forEach(function(tab){
      var isSelected = tab.dataset.category === category;
      tab.classList.toggle('is-active', isSelected);
      tab.setAttribute('aria-pressed', String(isSelected));
    });
    catalogPanels.forEach(function(panel){
      panel.hidden = true;
    });
  }

  function openCatalogModal(category){
    var modal = document.getElementById('catalogModal');
    var panel = document.getElementById(category);
    if(!modal || !panel) return;

    var modalTitle = modal.querySelector('.modal-title');
    var modalList = modal.querySelector('.modal-list');
    modalTitle.textContent = panel.querySelector('h4') ? panel.querySelector('h4').textContent : '';
    modalList.innerHTML = '';
    panel.querySelectorAll('li').forEach(function(item){
      var listItem = document.createElement('li');
      listItem.textContent = item.textContent;
      modalList.appendChild(listItem);
    });

    lastFocusedElement = document.activeElement;
    modal.classList.remove('modal-hidden');
    modal.setAttribute('aria-hidden', 'false');
    if ('inert' in modal) {
      modal.inert = false;
    }
    var pageContent = document.querySelector('main');
    if (pageContent) {
      pageContent.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.add('no-scroll');
    var closeButton = modal.querySelector('[data-close]');
    if(closeButton) closeButton.focus();
  }

  function closeCatalogModal(){
    var modal = document.getElementById('catalogModal');
    if(!modal) return;
    modal.classList.add('modal-hidden');
    modal.setAttribute('aria-hidden', 'true');
    if ('inert' in modal) {
      modal.inert = true;
    }
    var pageContent = document.querySelector('main');
    if (pageContent) {
      pageContent.removeAttribute('aria-hidden');
    }
    document.body.classList.remove('no-scroll');
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  catalogTabs.forEach(function(tab){
    tab.addEventListener('click', function(){
      catalogTabs.forEach(function(other){
        other.classList.remove('is-active');
        other.setAttribute('aria-pressed', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-pressed', 'true');
      openCatalogModal(tab.dataset.category);
    });
  });

  var modal = document.getElementById('catalogModal');
  if(modal){
    modal.addEventListener('click', function(event){
      if(event.target === modal){
        closeCatalogModal();
      }
    });
    var closeButton = modal.querySelector('[data-close]');
    if(closeButton){
      closeButton.addEventListener('click', closeCatalogModal);
    }
    document.addEventListener('keydown', function(event){
      if(event.key === 'Escape' && !modal.classList.contains('modal-hidden')){
        closeCatalogModal();
      }
    });
  }

  function selectCategoryFromHash(){
    var category = window.location.hash.slice(1);
    if(category) selectCategory(category);
  }
  if(window.location.hash){
    selectCategoryFromHash();
  } else {
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', selectCategoryFromHash);

  var form = document.getElementById('contactForm');
  if(form){
    var status = document.getElementById('formStatus');
    var productTypeSelect = form.productType;
    var otherProductField = document.getElementById('otherProductField');
    var otherProductInput = form.otherProduct;

    function toggleOtherProductField(){
      var isOtherProduct = productTypeSelect.value === 'Otro producto';
      otherProductField.hidden = !isOtherProduct;
      otherProductInput.disabled = !isOtherProduct;
      otherProductInput.required = isOtherProduct;
      if(!isOtherProduct) otherProductInput.value = '';
    }

    productTypeSelect.addEventListener('change', toggleOtherProductField);
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var name = form.name.value.trim();
      var company = form.company.value.trim();
      var productType = form.productType.value;
      var otherProduct = form.otherProduct.value.trim();
      var serviceType = form.serviceType.value;
      var email = form.email.value.trim();
      var message = form.message.value.trim();
      if(!name || !productType || !serviceType || !email || !message || (productType === 'Otro producto' && !otherProduct)){
        status.textContent = 'Por favor completa los campos requeridos.';
        return;
      }

      var whatsappNumber = '525611660078';
      var body = '*Nueva solicitud de cotización desde el sitio web*\n\n' +
        'Nombre: ' + name + '\n' +
        'Empresa: ' + (company || 'No indicada') + '\n' +
        'Producto que busca: ' + (productType === 'Otro producto' ? otherProduct : productType) + '\n' +
        'Servicio requerido: ' + serviceType + '\n' +
        'Correo: ' + email + '\n\n' +
        'Mensaje:\n' + message;

      var whatsappUrl = 'https://api.whatsapp.com/send?phone=' + whatsappNumber + '&text=' + encodeURIComponent(body);
      status.textContent = 'Abriendo WhatsApp para enviar tu solicitud...';
      var opened = window.open(whatsappUrl, '_blank', 'noopener');
      if (!opened) {
        status.innerHTML = 'Tu navegador bloqueó la apertura de la ventana. <a href="' + whatsappUrl + '" target="_blank" rel="noopener" class="text-link">Haz clic aquí para enviar por WhatsApp</a>';
      } else {
        form.reset();
        toggleOtherProductField();
      }
    });
  }
});
