document.addEventListener('DOMContentLoaded', function(){
  var nav = document.getElementById('mainNav');
  var toggle = document.getElementById('navToggle');
  if(toggle){
    toggle.addEventListener('click', function(){
      nav.classList.toggle('open');
    });
  }

  var form = document.getElementById('contactForm');
  if(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var name = form.name.value.trim();
      var message = form.message.value.trim();
      if(!name || !message){
        alert('Por favor completa los campos requeridos.');
        return;
      }
      // En una implementación real, aquí se enviaría el formulario a un backend.
      alert('Gracias, ' + name + '. Tu mensaje fue recibido. Nos pondremos en contacto.');
      form.reset();
    });
  }
});
