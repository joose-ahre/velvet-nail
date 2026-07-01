const STORAGE = {
  users: "vn_users",
  session: "vn_session",
  bookings: "vn_bookings",
  services: "vn_services"
};

const DEFAULT_SERVICES = [
  { id: "semi", name: "Semipermanente", price: 7500, duration: "60 min", description: "Color prolijo, brillo duradero y cuidado de cutículas." },
  { id: "gel", name: "Kapping gel", price: 9000, duration: "75 min", description: "Refuerzo para uñas naturales con terminación elegante." },
  { id: "soft-gel", name: "Soft gel", price: 12000, duration: "90 min", description: "Extensiones livianas con forma y largo personalizados." },
  { id: "esculpidas", name: "Esculpidas", price: 15000, duration: "120 min", description: "Construcción completa para un look resistente y definido." },
  { id: "nail-art", name: "Nail art", price: 3500, duration: "30 min", description: "Diseños, detalles, stickers, brillos o dibujos a mano." },
  { id: "retiro", name: "Retiro + limpieza", price: 4500, duration: "45 min", description: "Retiro seguro del producto y preparación de la uña." }
];

const OWNER_USER = {
  name: "Dueña",
  last: "Velvet",
  email: "owner@velvetnails.com",
  pass: "admin123",
  phone: "Sin teléfono",
  role: "admin"
};

const TIMES = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

let currentUser = JSON.parse(localStorage.getItem(STORAGE.session)) || null;
let currentView = "client";

const $ = (selector) => document.querySelector(selector);

function read(key, fallback) {
  return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function money(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(value || 0);
}

function ensureSeedData() {
  const users = read(STORAGE.users, []);
  if (!users.some((user) => user.email === OWNER_USER.email)) {
    users.push(OWNER_USER);
    write(STORAGE.users, users);
  }

  if (!localStorage.getItem(STORAGE.services)) {
    write(STORAGE.services, DEFAULT_SERVICES);
  }
}

function getServices() {
  return read(STORAGE.services, DEFAULT_SERVICES);
}

function getBookings() {
  return read(STORAGE.bookings, []);
}

function openModal() {
  $("#authOverlay").classList.add("active");
  $("#authOverlay").setAttribute("aria-hidden", "false");
}

function closeModal() {
  $("#authOverlay").classList.remove("active");
  $("#authOverlay").setAttribute("aria-hidden", "true");
  $("#loginError").textContent = "";
  $("#regError").textContent = "";
}

function setUser(user) {
  currentUser = user;
  write(STORAGE.session, user);
  renderUser();
  renderBookings();
  renderAdmin();
}

function logout() {
  currentUser = null;
  localStorage.removeItem(STORAGE.session);
  currentView = "client";
  renderUser();
  renderBookings();
  renderAdmin();
}

function setView(view) {
  currentView = view;
  const isAdmin = currentUser?.role === "admin";
  const showAdmin = view === "admin" && isAdmin;

  document.querySelectorAll(".client-view").forEach((section) => {
    section.hidden = showAdmin;
  });

  $("#adminPanel").hidden = !showAdmin;
  $("#viewClientBtn").classList.toggle("active", !showAdmin);
  $("#viewAdminBtn").classList.toggle("active", showAdmin);

  if (view === "admin" && !isAdmin) {
    $("#loginEmail").value = OWNER_USER.email;
    openModal();
  }
}

function renderUser() {
  const isLogged = Boolean(currentUser);
  const isAdmin = currentUser?.role === "admin";

  document.body.classList.toggle("is-admin", isAdmin);
  $("#loginButton").hidden = isLogged;
  $("#userBadge").hidden = !isLogged;
  $("#userName").textContent = isLogged ? `${currentUser.name}${isAdmin ? " · Dueño" : ""}` : "";

  if (isLogged && !isAdmin) {
    $("#bookName").value = currentUser.name || "";
    $("#bookPhone").value = currentUser.phone || "";
  }

  setView(isAdmin && currentView === "admin" ? "admin" : "client");
}

function renderServices() {
  const services = getServices();
  $("#heroServiceCount").textContent = services.length;

  $("#servicesGrid").innerHTML = services.map((service) => `
    <article class="service-card">
      <h3>${service.name}</h3>
      <p>${service.description}</p>
      <div class="service-meta">
        <span>${money(service.price)}</span>
        <span>${service.duration}</span>
      </div>
    </article>
  `).join("");

  $("#bookService").innerHTML = `<option value="">Servicio</option>` + services.map((service) => (
    `<option value="${service.id}">${service.name} · ${money(service.price)}</option>`
  )).join("");

  $("#adminServices").innerHTML = services.map((service) => `
    <div class="service-row">
      <div><strong>${service.name}</strong><br>${money(service.price)} · ${service.duration}</div>
      <button class="btn-ghost" type="button" onclick="deleteService('${service.id}')">Eliminar</button>
    </div>
  `).join("");
}

function renderTimes() {
  $("#bookTime").innerHTML = `<option value="">Hora</option>` + TIMES.map((time) => (
    `<option value="${time}">${time}</option>`
  )).join("");
}

function submitBooking(event) {
  event.preventDefault();
  if (!currentUser) {
    openModal();
    return;
  }

  const name = $("#bookName").value.trim();
  const phone = $("#bookPhone").value.trim();
  const serviceId = $("#bookService").value;
  const date = $("#bookDate").value;
  const time = $("#bookTime").value;

  if (!name || !phone || !serviceId || !date || !time) {
    $("#bookError").textContent = "Completá todos los campos.";
    return;
  }

  const selectedDate = new Date(`${date}T${time}`);
  if (selectedDate <= new Date()) {
    $("#bookError").textContent = "No podés reservar turnos pasados.";
    return;
  }

  const taken = getBookings().some((booking) => (
    booking.date === date && booking.time === time && booking.status !== "cancelada"
  ));

  if (taken) {
    $("#bookError").textContent = "Ese horario ya está reservado.";
    return;
  }

  const service = getServices().find((item) => item.id === serviceId);
  const bookings = getBookings();
  bookings.push({
    id: crypto.randomUUID(),
    user: currentUser.email,
    name,
    phone,
    serviceId,
    serviceName: service.name,
    price: service.price,
    date,
    time,
    status: "confirmada",
    createdAt: new Date().toISOString()
  });

  write(STORAGE.bookings, bookings);
  $("#bookError").textContent = "";
  $("#bookingForm").reset();
  if (currentUser.role !== "admin") {
    $("#bookName").value = currentUser.name || "";
    $("#bookPhone").value = currentUser.phone || "";
  }
  renderBookings();
  renderAdmin();
}

function renderBookings() {
  const container = $("#misTurnos");
  if (!currentUser) {
    container.innerHTML = `<div class="empty-state">Iniciá sesión para ver tus turnos.</div>`;
    return;
  }

  const mine = getBookings()
    .filter((booking) => booking.user === currentUser.email)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  if (!mine.length) {
    container.innerHTML = `<div class="empty-state">Todavía no tenés turnos reservados.</div>`;
    return;
  }

  container.innerHTML = mine.map((booking) => `
    <article class="booking-card">
      <div>
        <h3>${booking.serviceName}</h3>
        <p>${booking.date} · ${booking.time}</p>
        <p>${booking.phone}</p>
      </div>
      <div class="booking-actions">
        <span class="status ${booking.status}">${booking.status}</span>
        ${booking.status === "confirmada" ? `<button class="btn-ghost" type="button" onclick="cancelBooking('${booking.id}')">Cancelar</button>` : ""}
      </div>
    </article>
  `).join("");
}

function renderAdmin() {
  const bookings = getBookings().sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const filter = $("#adminFilter")?.value || "all";
  const visible = filter === "all" ? bookings : bookings.filter((booking) => booking.status === filter);
  const confirmed = bookings.filter((booking) => booking.status === "confirmada");
  const revenue = bookings
    .filter((booking) => booking.status !== "cancelada")
    .reduce((sum, booking) => sum + Number(booking.price || 0), 0);

  $("#statTotal").textContent = bookings.length;
  $("#statConfirmed").textContent = confirmed.length;
  $("#statRevenue").textContent = money(revenue);

  $("#adminBookings").innerHTML = visible.length ? visible.map((booking) => `
    <article class="booking-card">
      <div>
        <h3>${booking.serviceName}</h3>
        <p>${booking.name} · ${booking.phone}</p>
        <p>${booking.date} · ${booking.time} · ${money(booking.price)}</p>
      </div>
      <div class="booking-actions">
        <span class="status ${booking.status}">${booking.status}</span>
        <button class="btn-ghost" type="button" onclick="updateBookingStatus('${booking.id}', 'confirmada')">Confirmar</button>
        <button class="btn-ghost" type="button" onclick="updateBookingStatus('${booking.id}', 'realizada')">Realizada</button>
        <button class="btn-ghost" type="button" onclick="updateBookingStatus('${booking.id}', 'cancelada')">Cancelar</button>
      </div>
    </article>
  `).join("") : `<div class="empty-state">No hay reservas para este filtro.</div>`;
}

function cancelBooking(id) {
  updateBookingStatus(id, "cancelada");
}

function updateBookingStatus(id, status) {
  const bookings = getBookings().map((booking) => (
    booking.id === id ? { ...booking, status } : booking
  ));
  write(STORAGE.bookings, bookings);
  renderBookings();
  renderAdmin();
}

function addService(event) {
  event.preventDefault();
  const name = $("#serviceName").value.trim();
  const price = Number($("#servicePrice").value);
  const duration = $("#serviceDuration").value.trim();
  const description = $("#serviceDescription").value.trim();

  if (!name || !price || !duration || !description) {
    $("#serviceError").textContent = "Completá todos los datos del servicio.";
    return;
  }

  const services = getServices();
  services.push({
    id: `${name.toLowerCase().replaceAll(" ", "-")}-${Date.now()}`,
    name,
    price,
    duration,
    description
  });

  write(STORAGE.services, services);
  $("#serviceForm").reset();
  $("#serviceError").textContent = "";
  renderServices();
}

function deleteService(id) {
  const services = getServices().filter((service) => service.id !== id);
  write(STORAGE.services, services);
  renderServices();
}

function doLogin(event) {
  event.preventDefault();
  const email = $("#loginEmail").value.trim().toLowerCase();
  const pass = $("#loginPass").value;
  const users = read(STORAGE.users, []);
  const user = users.find((item) => item.email.toLowerCase() === email && item.pass === pass);

  if (!user) {
    $("#loginError").textContent = "Datos incorrectos.";
    return;
  }

  setUser(user);
  closeModal();
  if (user.role === "admin") setView("admin");
}

function doRegister(event) {
  event.preventDefault();
  const user = {
    name: $("#regName").value.trim(),
    last: $("#regLastname").value.trim(),
    email: $("#regEmail").value.trim().toLowerCase(),
    pass: $("#regPass").value,
    phone: $("#regPhone").value.trim(),
    role: "client"
  };

  if (!user.name || !user.last || !user.email || !user.pass || !user.phone) {
    $("#regError").textContent = "Completá todos los campos.";
    return;
  }

  const users = read(STORAGE.users, []);
  if (users.some((item) => item.email === user.email)) {
    $("#regError").textContent = "Ese email ya está registrado.";
    return;
  }

  users.push(user);
  write(STORAGE.users, users);
  setUser(user);
  closeModal();
}

function bindEvents() {
  $("#loginButton").addEventListener("click", openModal);
  $("#closeModalButton").addEventListener("click", closeModal);
  $("#logoutButton").addEventListener("click", logout);
  $("#bookingForm").addEventListener("submit", submitBooking);
  $("#loginForm").addEventListener("submit", doLogin);
  $("#registerForm").addEventListener("submit", doRegister);
  $("#serviceForm").addEventListener("submit", addService);
  $("#adminFilter").addEventListener("change", renderAdmin);
  $("#viewClientBtn").addEventListener("click", () => setView("client"));
  $("#viewAdminBtn").addEventListener("click", () => setView("admin"));
  $("#authOverlay").addEventListener("click", (event) => {
    if (event.target.id === "authOverlay") closeModal();
  });

  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".auth-tab").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".auth-form").forEach((form) => form.classList.remove("active"));
      tab.classList.add("active");
      $(`#${tab.dataset.authTab}Form`).classList.add("active");
    });
  });
}

function init() {
  ensureSeedData();
  bindEvents();
  renderTimes();
  renderServices();
  renderUser();
  renderBookings();
  renderAdmin();
  $("#bookDate").min = new Date().toISOString().split("T")[0];
}

init();
