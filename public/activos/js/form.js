/* SECTION: Contact Form */
function initForm() {
  var form = document.getElementById("contact-form");
  if (!form) {
    return;
  }

  var status = document.getElementById("contact-form-status");
  var submitButton = form.querySelector('button[type="submit"]');

  function getValue(selector) {
    var field = form.querySelector(selector);
    return field ? field.value.trim() : "";
  }

  function setStatus(message, type) {
    if (!status) {
      alert(message);
      return;
    }

    status.textContent = message;
    status.className = type === "success"
      ? "text-sm font-semibold text-green-700"
      : "text-sm font-semibold text-red-600";
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    var privacy = form.querySelector("#politica, #privacy");
    if (privacy && !privacy.checked) {
      setStatus("Debe aceptar la política de privacidad.", "error");
      return;
    }

    var payload = {
      nombre: getValue('[name="nombre"], #name'),
      correo: getValue('[name="correo"], #email'),
      telefono: getValue('[name="telefono"], #phone'),
      asunto: getValue('[name="asunto"], #subject'),
      mensaje: getValue('[name="mensaje"], #message'),
    };

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.classList.add("opacity-70", "cursor-not-allowed");
    }
    setStatus("Enviando mensaje...", "success");

    try {
      var response = await fetch("/api/contacto", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      var data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No fue posible enviar el mensaje.");
      }

      form.reset();
      setStatus("Mensaje enviado correctamente. Gracias por contactarnos.", "success");
    } catch (error) {
      setStatus(error.message, "error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.classList.remove("opacity-70", "cursor-not-allowed");
      }
    }
  });
}

window.initForm = initForm;
