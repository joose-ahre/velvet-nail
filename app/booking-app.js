"use client";

import { useEffect, useMemo, useState } from "react";

const STORAGE = {
  services: "vn_services",
  bookings: "vn_bookings",
  users: "vn_users",
  session: "vn_session",
};

const SERVICES = [
  {
    id: "semi",
    name: "Esmaltado gel",
    price: 6800,
    duration: "60 min",
    description: "Esmalte semipermanente de larga duración.",
  },
  {
    id: "kapping",
    name: "Kapping gel",
    price: 9000,
    duration: "75 min",
    description: "Refuerzo para uñas naturales con terminación elegante.",
  },
  {
    id: "soft-gel",
    name: "Soft gel",
    price: 12000,
    duration: "90 min",
    description: "Extensiones livianas, resistentes y personalizadas.",
  },
  {
    id: "esculpidas",
    name: "Esculpidas acrílico",
    price: 15000,
    duration: "120 min",
    description: "Construcción completa para un look definido.",
  },
  {
    id: "art",
    name: "Nail art diseño",
    price: 3500,
    duration: "30 min",
    description: "Detalles creativos, brillos y diseños a mano.",
  },
  {
    id: "retiro",
    name: "Retiro + limpieza",
    price: 4500,
    duration: "45 min",
    description: "Retiro seguro del producto y cuidado de la uña.",
  },
];

const OWNER = {
  name: "Dueña",
  email: "owner@velvetnails.com",
  password: "admin123",
  role: "admin",
};

const HOURS = Array.from({ length: 18 }, (_, index) => {
  const minutes = 9 * 60 + index * 30;
  const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
  const minute = String(minutes % 60).padStart(2, "0");
  return `${hour}:${minute}`;
});

const OPENING_MINUTES = 9 * 60;
const CLOSING_MINUTES = 18 * 60;
const formatMoney = (value) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

function todayLocal() {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function readStoredValue(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function writeStoredValue(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // The app can still be used for this session if browser storage is unavailable.
  }
}

function normalizeServiceList(value) {
  if (!Array.isArray(value)) return SERVICES;

  return value
    .filter((service) => service && typeof service.id === "string" && typeof service.name === "string")
    .map((service) => ({
      ...service,
      price: Number(service.price) || 0,
      duration: String(service.duration || "60 min"),
      description: String(service.description || "Un servicio pensado para vos."),
    }));
}

function normalizeUser(value) {
  if (!value || typeof value !== "object" || typeof value.email !== "string") return null;

  const email = value.email.trim().toLowerCase();
  const firstName = String(value.name || "").trim();
  const lastName = String(value.last || "").trim();

  return {
    name: [firstName, lastName].filter(Boolean).join(" ") || email,
    email,
    password: String(value.password ?? value.pass ?? ""),
    phone: String(value.phone || ""),
    role: value.role === "admin" ? "admin" : "client",
  };
}

function normalizeUserList(value) {
  const storedUsers = Array.isArray(value)
    ? value.map(normalizeUser).filter(Boolean)
    : [];
  const ownerExists = storedUsers.some((user) => user.email === OWNER.email);

  return ownerExists ? storedUsers : [...storedUsers, OWNER];
}

function normalizeBookingList(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((booking) => booking && typeof booking.id === "string")
    .map((booking) => ({
      ...booking,
      date: String(booking.date || ""),
      time: String(booking.time || ""),
      price: Number(booking.price) || 0,
      duration: String(booking.duration || "60 min"),
      status: ["confirmada", "realizada", "cancelada"].includes(booking.status)
        ? booking.status
        : "confirmada",
    }));
}

function publicUser(user) {
  if (!user) return null;
  const safeUser = { ...user };
  delete safeUser.password;
  return safeUser;
}

function minutesFromTime(time) {
  const [hours, minutes] = String(time).split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function durationInMinutes(serviceOrDuration) {
  const duration = typeof serviceOrDuration === "string"
    ? serviceOrDuration
    : serviceOrDuration?.duration;
  return Math.max(30, Number.parseInt(duration, 10) || 60);
}

function isSlotAvailable({ date, time, service, bookings, services }) {
  const start = minutesFromTime(time);
  if (start === null || start < OPENING_MINUTES) return false;

  const duration = durationInMinutes(service);
  const end = start + duration;
  if (end > CLOSING_MINUTES) return false;

  if (date) {
    const selectedDate = new Date(`${date}T00:00:00`);
    if (Number.isNaN(selectedDate.getTime()) || selectedDate.getDay() === 0) return false;

    if (new Date(`${date}T${time}:00`) <= new Date()) return false;

    const conflicts = bookings.some((booking) => {
      if (booking.date !== date || booking.status === "cancelada") return false;

      const bookingStart = minutesFromTime(booking.time);
      if (bookingStart === null) return false;

      const bookedService = services.find((item) => item.id === booking.serviceId);
      const bookingDuration = durationInMinutes(bookedService || booking.duration);
      const bookingEnd = bookingStart + bookingDuration;
      return start < bookingEnd && end > bookingStart;
    });

    if (conflicts) return false;
  }

  return true;
}

function newId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function BookingApp() {
  const [services, setServices] = useState(SERVICES);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([OWNER]);
  const [user, setUser] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [minimumDate, setMinimumDate] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [bookingServiceId, setBookingServiceId] = useState("");
  const [modal, setModal] = useState(false);
  const [tab, setTab] = useState("login");
  const [view, setView] = useState("client");
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [bookingError, setBookingError] = useState("");
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const loadedServices = normalizeServiceList(readStoredValue(STORAGE.services, SERVICES));
    const loadedBookings = normalizeBookingList(readStoredValue(STORAGE.bookings, []));
    const loadedUsers = normalizeUserList(readStoredValue(STORAGE.users, []));
    const savedSession = normalizeUser(readStoredValue(STORAGE.session, null));
    const matchingUser = savedSession
      ? loadedUsers.find((item) => item.email === savedSession.email) || savedSession
      : null;

    setServices(loadedServices);
    setBookings(loadedBookings);
    setUsers(loadedUsers);
    setUser(matchingUser);
    setMinimumDate(todayLocal());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeStoredValue(STORAGE.services, services);
  }, [hydrated, services]);

  useEffect(() => {
    if (!hydrated) return;
    writeStoredValue(STORAGE.bookings, bookings);
  }, [hydrated, bookings]);

  useEffect(() => {
    if (!hydrated) return;
    writeStoredValue(STORAGE.users, users);
  }, [hydrated, users]);

  useEffect(() => {
    if (!hydrated) return;
    if (user) writeStoredValue(STORAGE.session, publicUser(user));
    else {
      try {
        window.localStorage.removeItem(STORAGE.session);
      } catch {
        // Session cleanup is best effort when browser storage is unavailable.
      }
    }
  }, [hydrated, user]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(""), 2800);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!modal) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setModal(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [modal]);

  const isAdmin = user?.role === "admin";
  const selectedService = services.find((service) => service.id === bookingServiceId);
  const availableHours = useMemo(
    () => HOURS.filter((time) => isSlotAvailable({
      date: bookingDate,
      time,
      service: selectedService,
      bookings,
      services,
    })),
    [bookingDate, bookings, selectedService, services],
  );
  const visibleBookings = useMemo(() => {
    const filtered = filter === "all"
      ? bookings
      : bookings.filter((booking) => booking.status === filter);
    return [...filtered].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  }, [bookings, filter]);

  const updateStatus = (id, status) => {
    setBookings((all) => all.map((booking) =>
      booking.id === id ? { ...booking, status } : booking,
    ));
  };

  const openAuth = (nextTab = "login") => {
    setTab(nextTab);
    setAuthError("");
    setModal(true);
  };

  const book = (event) => {
    event.preventDefault();
    setBookingError("");

    if (!user) {
      setBookingError("Iniciá sesión para confirmar tu turno.");
      openAuth();
      return;
    }

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const date = bookingDate;
    const time = bookingTime;
    const service = services.find((item) => item.id === bookingServiceId);

    if (!name || !phone || !service || !date || !time) {
      setBookingError("Completá todos los campos.");
      return;
    }

    const selectedDate = new Date(`${date}T00:00:00`);
    if (selectedDate.getDay() === 0) {
      setBookingError("El estudio permanece cerrado los domingos.");
      return;
    }

    if (!isSlotAvailable({ date, time, service, bookings, services })) {
      setBookingError("Ese horario ya no está disponible. Elegí otro turno.");
      setBookingTime("");
      return;
    }

    setBookings((all) => [...all, {
      id: newId(),
      user: user.email,
      name,
      phone,
      serviceId: service.id,
      serviceName: service.name,
      price: service.price,
      duration: service.duration,
      date,
      time,
      status: "confirmada",
      createdAt: new Date().toISOString(),
    }]);

    event.currentTarget.reset();
    setBookingServiceId("");
    setBookingDate("");
    setBookingTime("");
    setNotice("¡Tu turno quedó confirmado!");
  };

  const login = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");
    const found = users.find((item) => item.email === email && item.password === password);

    if (!found) {
      setAuthError("Email o contraseña incorrectos.");
      return;
    }

    setUser(found);
    setBookingError("");
    setAuthError("");
    setModal(false);
    event.currentTarget.reset();
    if (found.role === "admin") setView("admin");
  };

  const register = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const firstName = String(data.get("name") || "").trim();
    const lastName = String(data.get("last") || "").trim();
    const email = String(data.get("email") || "").trim().toLowerCase();
    const password = String(data.get("password") || "");
    const phone = String(data.get("phone") || "").trim();

    if (!firstName || !email || !password || !phone) {
      setAuthError("Completá todos los campos.");
      return;
    }
    if (password.length < 6) {
      setAuthError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (users.some((item) => item.email === email)) {
      setAuthError("Ese email ya está registrado.");
      return;
    }

    const newUser = {
      name: `${firstName} ${lastName}`.trim(),
      email,
      password,
      phone,
      role: "client",
    };
    setUsers((all) => [...all, newUser]);
    setUser(newUser);
    setBookingError("");
    setAuthError("");
    setModal(false);
    event.currentTarget.reset();
    setNotice("¡Cuenta creada! Ya podés reservar.");
  };

  const addService = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const priceInput = String(form.get("price") || "");
    const price = Number(priceInput);
    const duration = String(form.get("duration") || "").trim();
    const description = String(form.get("description") || "").trim();

    if (!name || priceInput === "" || !Number.isFinite(price) || price < 0 || !duration) return;

    setServices((all) => [...all, {
      id: newId(),
      name,
      price,
      duration,
      description: description || "Un servicio pensado para vos.",
    }]);
    event.currentTarget.reset();
    setNotice("Servicio agregado.");
  };

  const myBookings = bookings
    .filter((booking) => booking.user === user?.email)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const revenue = bookings
    .filter((booking) => booking.status !== "cancelada")
    .reduce((sum, booking) => sum + booking.price, 0);

  return (
    <>
      <header className="site-header">
        <nav className="nav-shell" aria-label="Navegación principal">
          <a href="#inicio" className="nav-logo">Velvet <span>Nails</span></a>
          <div className="nav-links">
            <a href="#servicios">Servicios</a>
            <a href="#turnos">Reservar</a>
            <a href="#mis-turnos">Mis turnos</a>
            {isAdmin && <a href="#admin">Dueña</a>}
          </div>
          <div className="nav-actions">
            <button
              className={view === "client" ? "btn-ghost active" : "btn-ghost"}
              onClick={() => setView("client")}
              type="button"
            >
              Cliente
            </button>
            <button
              className={view === "admin" ? "btn-ghost active" : "btn-ghost"}
              onClick={() => isAdmin ? setView("admin") : openAuth()}
              type="button"
            >
              Dueña
            </button>
            {user ? (
              <div className="user-badge">
                <span>{user.name}</span>
                <button
                  className="btn-ghost small"
                  onClick={() => {
                    setUser(null);
                    setView("client");
                  }}
                  type="button"
                >
                  Salir
                </button>
              </div>
            ) : (
              <button className="btn-primary compact" onClick={() => openAuth()} type="button">
                Iniciar sesión
              </button>
            )}
          </div>
        </nav>
      </header>

      <main id="inicio">
        <section className="hero">
          <div className="hero-orb" aria-hidden="true" />
          <div className="hero-copy">
            <p className="eyebrow">Studio de uñas · turnos online</p>
            <h1>Tu próximo <em>ritual</em> de belleza.</h1>
            <p>Reservá tu momento de cuidado, elegí el servicio que más te gusta y dejá que tus manos hablen por vos.</p>
            <div className="hero-actions">
              <a className="btn-primary" href="#turnos">Reservar turno <span aria-hidden="true">→</span></a>
              <a className="btn-ghost" href="#servicios">Ver servicios</a>
            </div>
          </div>
          <div className="hero-panel" aria-label="Información del estudio">
            <div><strong>{services.length}</strong><span>servicios</span></div>
            <div><strong>9–18</strong><span>horarios</span></div>
            <div><strong>Online</strong><span>reservas</span></div>
          </div>
        </section>

        {view === "client" && (
          <>
            <section id="servicios" className="section">
              <div className="section-heading">
                <p className="eyebrow">Carta de servicios</p>
                <h2>Elegí el tratamiento ideal</h2>
                <p>Detalles cuidados, técnicas actuales y una terminación que se siente tan linda como se ve.</p>
              </div>
              <div className="services-grid">
                {services.map((service, index) => (
                  <article className="service-card" key={service.id}>
                    <div className={`service-art art-${index % 3}`} aria-hidden="true"><span>✦</span></div>
                    <div className="service-card-body">
                      <h3>{service.name}</h3>
                      <p>{service.description}</p>
                      <div className="service-meta">
                        <strong>{formatMoney(service.price)}</strong>
                        <span>{service.duration}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section id="turnos" className="section booking-section">
              <div className="booking-copy">
                <p className="eyebrow">Vista cliente</p>
                <h2>Reservá tu turno</h2>
                <p>Elegí una fecha, un horario disponible y confirmá en menos de un minuto.</p>
                <div className="booking-note">Atendemos de lunes a sábado, de 9:00 a 18:00.</div>
              </div>
              <form className="form-card" onSubmit={book} key={user?.email || "guest"}>
                <label>
                  Nombre
                  <input name="name" defaultValue={user?.name || ""} autoComplete="name" placeholder="Tu nombre" />
                </label>
                <label>
                  Teléfono
                  <input name="phone" defaultValue={user?.phone || ""} autoComplete="tel" placeholder="Tu teléfono" />
                </label>
                <label>
                  Servicio
                  <select
                    name="service"
                    value={bookingServiceId}
                    onChange={(event) => {
                      setBookingServiceId(event.target.value);
                      setBookingTime("");
                      setBookingError("");
                    }}
                  >
                    <option value="">Elegí un servicio</option>
                    {services.map((service) => (
                      <option value={service.id} key={service.id}>
                        {service.name} · {formatMoney(service.price)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="form-row">
                  <label>
                    Fecha
                    <input
                      name="date"
                      type="date"
                      min={minimumDate}
                      value={bookingDate}
                      onChange={(event) => {
                        setBookingDate(event.target.value);
                        setBookingTime("");
                        setBookingError("");
                      }}
                    />
                  </label>
                  <label>
                    Hora
                    <select
                      name="time"
                      value={bookingTime}
                      onChange={(event) => setBookingTime(event.target.value)}
                    >
                      <option value="">Elegí un horario</option>
                      {HOURS.map((time) => {
                        const available = availableHours.includes(time);
                        return (
                          <option key={time} value={time} disabled={!available}>
                            {time}{bookingDate && !available ? " · No disponible" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                </div>
                <p className="form-error" role="alert">{bookingError}</p>
                <button className="btn-primary" type="submit">Confirmar turno</button>
              </form>
            </section>

            <section id="mis-turnos" className="section">
              <div className="section-heading left">
                <p className="eyebrow">Vista cliente</p>
                <h2>Mis turnos</h2>
              </div>
              <div className="booking-list">
                {!user ? (
                  <Empty text="Iniciá sesión para consultar tus turnos." />
                ) : !myBookings.length ? (
                  <Empty text="Todavía no tenés turnos reservados." />
                ) : myBookings.map((booking) => (
                  <Booking
                    key={booking.id}
                    booking={booking}
                    canCancel
                    onStatus={updateStatus}
                  />
                ))}
              </div>
            </section>
          </>
        )}

        {view === "admin" && isAdmin && (
          <section id="admin" className="section admin-section">
            <div className="section-heading left">
              <p className="eyebrow">Panel del estudio</p>
              <h2>Todo bajo control</h2>
              <p>Gestioná reservas y mantené tu carta de servicios actualizada.</p>
            </div>
            <div className="admin-stats">
              <Stat label="Turnos totales" value={bookings.length} />
              <Stat label="Confirmados" value={bookings.filter((booking) => booking.status === "confirmada").length} />
              <Stat label="Ingresos estimados" value={formatMoney(revenue)} />
            </div>
            <div className="admin-layout">
              <div className="panel-card">
                <div className="panel-title">
                  <h3>Reservas</h3>
                  <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filtrar reservas">
                    <option value="all">Todas</option>
                    <option value="confirmada">Confirmadas</option>
                    <option value="realizada">Realizadas</option>
                    <option value="cancelada">Canceladas</option>
                  </select>
                </div>
                <div className="booking-list">
                  {visibleBookings.length ? visibleBookings.map((booking) => (
                    <Booking key={booking.id} booking={booking} admin onStatus={updateStatus} />
                  )) : <Empty text="No hay reservas para este filtro." />}
                </div>
              </div>

              <form className="panel-card" onSubmit={addService}>
                <h3>Agregar servicio</h3>
                <label>Nombre<input name="name" placeholder="Ej: Nail art" /></label>
                <div className="form-row">
                  <label>Precio<input name="price" type="number" min="0" placeholder="8500" /></label>
                  <label>Duración<input name="duration" placeholder="60 min" /></label>
                </div>
                <label>Descripción<textarea name="description" rows="3" placeholder="Detalle breve del servicio" /></label>
                <button className="btn-primary" type="submit">Guardar servicio</button>
                <div className="service-admin-list">
                  {services.map((service) => (
                    <div className="service-row" key={service.id}>
                      <span>{service.name}<b>{formatMoney(service.price)}</b></span>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label={`Eliminar ${service.name}`}
                        onClick={() => setServices((all) => all.filter((item) => item.id !== service.id))}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </form>
            </div>
          </section>
        )}
      </main>

      <footer>© {new Date().getFullYear()} <b>Velvet Nails</b> — Todos los derechos reservados.</footer>

      {notice && <div className="toast" role="status">{notice}</div>}

      {modal && (
        <div
          className="overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModal(false);
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <button className="modal-close" onClick={() => setModal(false)} aria-label="Cerrar" type="button">×</button>
            <h2 id="auth-title">Ingresar a Velvet Nails</h2>
            <p className="modal-note">Para probar como dueña usá: owner@velvetnails.com / admin123</p>
            <div className="auth-tabs" role="tablist" aria-label="Acceso a la cuenta">
              <button
                className={tab === "login" ? "auth-tab active" : "auth-tab"}
                onClick={() => { setTab("login"); setAuthError(""); }}
                type="button"
                role="tab"
                aria-selected={tab === "login"}
              >
                Iniciar sesión
              </button>
              <button
                className={tab === "register" ? "auth-tab active" : "auth-tab"}
                onClick={() => { setTab("register"); setAuthError(""); }}
                type="button"
                role="tab"
                aria-selected={tab === "register"}
              >
                Registro
              </button>
            </div>
            {tab === "login" ? (
              <form className="auth-form active" onSubmit={login}>
                <label>Email<input name="email" type="email" autoComplete="email" placeholder="Email" /></label>
                <label>Contraseña<input name="password" type="password" autoComplete="current-password" placeholder="Contraseña" /></label>
                <p className="form-error" role="alert">{authError}</p>
                <button className="btn-primary" type="submit">Entrar</button>
              </form>
            ) : (
              <form className="auth-form active" onSubmit={register}>
                <label>Nombre<input name="name" autoComplete="given-name" placeholder="Nombre" /></label>
                <label>Apellido<input name="last" autoComplete="family-name" placeholder="Apellido" /></label>
                <label>Email<input name="email" type="email" autoComplete="email" placeholder="Email" /></label>
                <label>Contraseña<input name="password" type="password" autoComplete="new-password" placeholder="Contraseña" /></label>
                <label>Teléfono<input name="phone" autoComplete="tel" placeholder="Teléfono" /></label>
                <p className="form-error" role="alert">{authError}</p>
                <button className="btn-primary" type="submit">Crear cuenta</button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Empty({ text }) {
  return <div className="empty-state"><span aria-hidden="true">✦</span>{text}</div>;
}

function Stat({ label, value }) {
  return <article><span>{label}</span><strong>{value}</strong></article>;
}

function Booking({ booking, admin = false, canCancel = false, onStatus }) {
  return (
    <article className="booking-card">
      <div>
        <h3>{admin ? booking.name : booking.serviceName}</h3>
        <p>
          {admin
            ? `${booking.serviceName} · ${booking.date} · ${booking.time}`
            : `${booking.date} · ${booking.time} · ${formatMoney(booking.price)}`}
        </p>
        {admin && <p>{booking.phone} · {formatMoney(booking.price)}</p>}
      </div>
      <div className="booking-actions">
        <span className={`status ${booking.status}`}>{booking.status}</span>
        {canCancel && booking.status === "confirmada" && (
          <button className="btn-ghost small" onClick={() => onStatus(booking.id, "cancelada")} type="button">
            Cancelar
          </button>
        )}
        {admin && (
          <>
            <button className="btn-ghost small" onClick={() => onStatus(booking.id, "confirmada")} type="button">Confirmar</button>
            <button className="btn-ghost small" onClick={() => onStatus(booking.id, "realizada")} type="button">Realizada</button>
            <button className="btn-ghost small" onClick={() => onStatus(booking.id, "cancelada")} type="button">Cancelar</button>
          </>
        )}
      </div>
    </article>
  );
}
