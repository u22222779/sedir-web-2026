/* SECTION: Contact Form */
function initForm() {
  var form = document.getElementById("contact-form");
  if (!form) {
    return;
  }

  form.addEventListener("submit", function () {
    // Se mantiene el comportamiento nativo del formulario.
  });
}

window.initForm = initForm;
