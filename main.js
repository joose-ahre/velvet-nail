// Importar funciones necesarias de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAOMScCoEsyoGFvNGaNtRlZg1ZYnsl0kZ4",
  authDomain: "turnero-c651b.firebaseapp.com",
  projectId: "turnero-c651b",
  storageBucket: "turnero-c651b.firebasestorage.app",
  messagingSenderId: "384466203676",
  appId: "1:384466203676:web:a1a0ac56d7b62334ec9bd9",
  measurementId: "G-5TMKWVV89W"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Variables globales
let currentUser = null;
let reservasPendientes = {};

// ==================== AUTH ====================
const authModal = document.getElementById("authModal");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const authTabs = document.querySelectorAll(".auth-tab");
const mainContent = document.getElementById("mainContent");
const logoutBtn = document.getElementById("logoutBtn");
const userName = document.getElementById("userName");

// Cambiar entre login y registro
authTabs.forEach(tab => {
  tab.addEventListener("click", (e) => {
    authTabs.forEach(t => t.classList.remove("active"));
    e.target.classList.add("active");

    const tabName = e.target.dataset.tab;
    document.querySelectorAll(".auth-form").forEach(form => {
      form.classList.remove("active");
    });

    if (tabName === "login") {
      loginForm.classList.add("active");
    } else {
      registerForm.classList.add("active");
    }
  });
});

// LOGIN
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = loginForm.querySelector('input[type="email"]').value.trim();
  const password = loginForm.querySelector('input[type="password"]').value;
  const errorMsg = document.getElementById("loginError");

  if (!email || !password) {
    errorMsg.textContent = "Completa todos los campos";
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginForm.reset();
    errorMsg.textContent = "";
  } catch (error) {
    errorMsg.textContent = getErrorMessage(error.code);
  }
});

// REGISTRO
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nombre = registerForm.querySelector('input[type="text"]').value.trim();
  const email = registerForm.querySelector('input[type="email"]').value.trim();
  const telefono = registerForm.querySelector('input[type="tel"]').value.trim();
  const password = registerForm.querySelectorAll('input[type="password"]')[0].value;
  const password2 = registerForm.querySelectorAll('input[type="password"]')[1].value;
  const errorMsg = document.getElementById("registerError");

  if (!nombre || !email || !telefono || !password || !password2) {
    errorMsg.textContent = "Completa todos los campos";
    return;
  }

  if (password !== password2) {
    errorMsg.textContent = "Las contraseñas no coinciden";
    return;
  }

  if (password.length < 6) {
    errorMsg.textContent = "La contraseña debe tener mínimo 6 caracteres";
    return;
  }

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    // Aquí podrías guardar nombre y teléfono en Firestore si lo necesitas
    registerForm.reset();
    errorMsg.textContent = "";
    
    // Cambiar a tab login automáticamente
    document.querySelector('[data-tab="login"]').click();
    document.getElementById("loginError").textContent = "Cuenta creada! Inicia sesión";
  } catch (error) {
    errorMsg.textContent = getErrorMessage(error.code);
  }
});

// LOGOUT
logoutBtn.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error al cerrar sesión:", error);
  }
});

// Monitorear estado de autenticación
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    authModal.classList.add("hidden");
    mainContent.classList.remove("hidden");
    userName.textContent = user.email;
    await cargarReservas();
  } else {
    currentUser = null;
    authModal.classList.remove("hidden");
    mainContent.classList.add("hidden");
    userName.textContent = "";
  }
});

// ==================== RESERVAS ====================
const bookingForm = document.getElementById("bookingForm");
const dateInput = document.getElementById("dateInput");
const timeInput = document.getElementById("timeInput");
const serviceSelect = document.getElementById("serviceSelect");
const bookingError = document.getElementById("bookingError");
const confirmModal = document.getElementById("confirmModal");
const confirmBtn = document.getElementById("confirmBtn");
const cancelBtn = document.getElementById("cancelBtn");
const confirmDetails = document.getElementById("confirmDetails");

// Fijar fecha mínima a hoy
const today = new Date();
const todayString = today.toISOString().split('T')[0];
dateInput.setAttribute('min', todayString);

// Validar que no sea una hora pasada cuando se selecciona una fecha
dateInput.addEventListener("change", () => {
  timeInput.value = "";
  validarHorasDisponibles();
});

function validarHorasDisponibles() {
  const selectedDate = new Date(dateInput.value + "T00:00:00");
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  const options = timeInput.querySelectorAll("option");
  
  options.forEach(option => {
    if (option.value === "") return;
    
    // Si es hoy, bloquear horas pasadas
    if (selectedDate.getTime() === todayDate.getTime()) {
      const now = new Date();
      const optionTime = option.value.split(":");
      const optionHour = parseInt(optionTime[0]);
      const optionMinute = parseInt(optionTime[1]);
      
      const optionDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), optionHour, optionMinute);
      
      if (optionDate <= now) {
        option.disabled = true;
        option.textContent = option.value + " (Pasado)";
      } else {
        option.disabled = false;
        option.textContent = option.value;
      }
    } else {
      // Si es futuro, habilitar todas las horas
      option.disabled = false;
      option.textContent = option.value;
    }
  });
}

// Validar al cambiar la hora
timeInput.addEventListener("change", validarHorasDisponibles);

// Enviar formulario de reserva
bookingForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const service = serviceSelect.value;
  const date = dateInput.value;
  const time = timeInput.value;

  if (!service || !date || !time) {
    mostrarError("Completa todos los campos");
    return;
  }

  // Validación final de fecha y hora
  const selectedDateTime = new Date(date + "T" + time + ":00");
  const now = new Date();

  if (selectedDateTime <= now) {
    mostrarError("No puedes reservar para una fecha/hora pasada");
    timeInput.value = "";
    validarHorasDisponibles();
    return;
  }

  // Mostrar modal de confirmación
  mostrarConfirmacion(service, date, time);
});

function mostrarConfirmacion(service, date, time) {
  const fechaFormato = new Date(date + "T00:00:00").toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  reservasPendientes = { service, date, time, fechaFormato };

  confirmDetails.innerHTML = `
    <p><strong>Servicio:</strong> ${service}</p>
    <p><strong>Fecha:</strong> ${fechaFormato}</p>
    <p><strong>Hora:</strong> ${time}</p>
    <p style="color: var(--primary); margin-top: 15px; font-weight: 600;">¿Deseas confirmar esta reserva?</p>
  `;

  confirmModal.classList.add("show");
}

confirmBtn.addEventListener("click", async () => {
  if (!currentUser) {
    mostrarError("Debes estar autenticado");
    return;
  }

  try {
    // Guardar en Firestore
    await addDoc(collection(db, "reservas"), {
      userId: currentUser.uid,
      userEmail: currentUser.email,
      servicio: reservasPendientes.service,
      fecha: reservasPendientes.date,
      hora: reservasPendientes.time,
      estado: "confirmada",
      fechaCreacion: new Date(),
      fechaReserva: new Date(reservasPendientes.date + "T" + reservasPendientes.time + ":00")
    });

    // Cerrar modal y resetear form
    confirmModal.classList.remove("show");
    bookingForm.reset();
    timeInput.value = "";
    mostrarExito(`¡Reserva confirmada para ${reservasPendientes.fechaFormato} a las ${reservasPendientes.time}!`);
    
    // Recargar lista de reservas
    await cargarReservas();

  } catch (error) {
    console.error("Error al guardar reserva:", error);
    mostrarError("Error al guardar la reserva: " + error.message);
  }
});

cancelBtn.addEventListener("click", () => {
  confirmModal.classList.remove("show");
});

// Cargar y mostrar las reservas del usuario
async function cargarReservas() {
  if (!currentUser) return;

  try {
    const q = query(
      collection(db, "reservas"),
      where("userId", "==", currentUser.uid)
    );

    const querySnapshot = await getDocs(q);
    const bookingsContainer = document.getElementById("bookingsContainer");
    
    if (querySnapshot.empty) {
      bookingsContainer.innerHTML = "<p style='text-align: center; color: #999;'>No tienes reservas aún</p>";
      return;
    }

    let html = "";
    querySnapshot.forEach(docSnapshot => {
      const data = docSnapshot.data();
      const fecha = new Date(data.fecha + "T00:00:00").toLocaleDateString("es-AR");
      
      html += `
        <div class="booking-item">
          <div class="booking-info">
            <p><strong>${data.servicio}</strong></p>
            <p>📅 ${fecha}</p>
            <p>🕐 ${data.hora}</p>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="booking-status status-confirmed">${data.estado}</span>
            <button onclick="eliminarReserva('${docSnapshot.id}')" class="btn-delete">✕</button>
          </div>
        </div>
      `;
    });

    bookingsContainer.innerHTML = html;
  } catch (error) {
    console.error("Error al cargar reservas:", error);
  }
}

// Función para eliminar reserva
window.eliminarReserva = async (docId) => {
  if (!confirm("¿Deseas cancelar esta reserva?")) return;

  try {
    await deleteDoc(doc(db, "reservas", docId));
    await cargarReservas();
    mostrarExito("Reserva cancelada");
  } catch (error) {
    console.error("Error al eliminar:", error);
    mostrarError("Error al cancelar la reserva");
  }
};

// Estilos para botón delete
const style = document.createElement("style");
style.textContent = `
  .btn-delete {
    background: #ffebee;
    color: #d32f2f;
    border: none;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s ease;
  }

  .btn-delete:hover {
    background: #d32f2f;
    color: white;
  }
`;
document.head.appendChild(style);

// ==================== UTILIDADES ====================
function mostrarError(mensaje) {
  bookingError.textContent = mensaje;
  bookingError.classList.add("show");
  setTimeout(() => {
    bookingError.classList.remove("show");
  }, 4000);
}

function mostrarExito(mensaje) {
  const div = document.createElement("div");
  div.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #4caf50;
    color: white;
    padding: 15px 25px;
    border-radius: 8px;
    z-index: 3000;
    animation: slideInRight 0.3s ease;
  `;
  div.textContent = mensaje;
  document.body.appendChild(div);

  setTimeout(() => {
    div.remove();
  }, 3000);
}

function getErrorMessage(code) {
  const errors = {
    "auth/user-not-found": "Usuario no encontrado",
    "auth/wrong-password": "Contraseña incorrecta",
    "auth/email-already-in-use": "Este correo ya está registrado",
    "auth/weak-password": "La contraseña es muy débil",
    "auth/invalid-email": "Correo electrónico inválido",
    "auth/operation-not-allowed": "Operación no permitida",
    "auth/user-disabled": "Usuario deshabilitado"
  };
  return errors[code] || "Error de autenticación";
}

// Agregar animación slide-in-right
const slideStyle = document.createElement("style");
slideStyle.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(slideStyle);