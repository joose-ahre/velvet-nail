"use client";

import { useEffect, useMemo, useState } from "react";

const SERVICES = [
  { id: "semi", name: "Esmaltado gel", price: 6800, duration: "60 min", description: "Esmalte semipermanente de larga duración." },
  { id: "kapping", name: "Kapping gel", price: 9000, duration: "75 min", description: "Refuerzo para uñas naturales con terminación elegante." },
  { id: "soft-gel", name: "Soft gel", price: 12000, duration: "90 min", description: "Extensiones livianas, resistentes y personalizadas." },
  { id: "esculpidas", name: "Esculpidas acrílico", price: 15000, duration: "120 min", description: "Construcción completa para un look definido." },
  { id: "art", name: "Nail art diseño", price: 3500, duration: "30 min", description: "Detalles creativos, brillos y diseños a mano." },
  { id: "retiro", name: "Retiro + limpieza", price: 4500, duration: "45 min", description: "Retiro seguro del producto y cuidado de la uña." }
];
const HOURS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"];
const OWNER = { name: "Dueña", email: "owner@velvetnails.com", password: "admin123", role: "admin" };
const formatMoney = (value) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value);
const today = () => new Date().toISOString().slice(0, 10);

export default function Home() {
  const [services, setServices] = useState(SERVICES);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([OWNER]);
  const [user, setUser] = useState(null);
  const [modal, setModal] = useState(false);
  const [tab, setTab] = useState("login");
  const [view, setView] = useState("client");
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const read = (key, fallback) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    setServices(read("vn_services", SERVICES)); setBookings(read("vn_bookings", [])); setUsers(read("vn_users", [OWNER])); setUser(read("vn_session", null));
  }, []);
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("vn_services", JSON.stringify(services)); }, [services]);
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("vn_bookings", JSON.stringify(bookings)); }, [bookings]);
  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem("vn_users", JSON.stringify(users)); }, [users]);
  useEffect(() => { if (typeof window !== "undefined") user ? localStorage.setItem("vn_session", JSON.stringify(user)) : localStorage.removeItem("vn_session"); }, [user]);
  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(""), 2800); return () => clearTimeout(id); }, [notice]);

  const isAdmin = user?.role === "admin";
  const visibleBookings = useMemo(() => (filter === "all" ? bookings : bookings.filter((b) => b.status === filter)), [bookings, filter]);
  const updateStatus = (id, status) => setBookings((all) => all.map((b) => b.id === id ? { ...b, status } : b));
  const book = (event) => {
    event.preventDefault(); setError("");
    if (!user) { setModal(true); setError("Iniciá sesión para confirmar tu turno."); return; }
    const form = new FormData(event.currentTarget); const service = services.find((item) => item.id === form.get("service"));
    const date = form.get("date"), time = form.get("time");
    if (!form.get("name") || !form.get("phone") || !service || !date || !time) return setError("Completá todos los campos.");
    if (new Date(`${date}T${time}`) <= new Date()) return setError("Elegí un horario futuro.");
    if (bookings.some((b) => b.date === date && b.time === time && b.status !== "cancelada")) return setError("Ese horario ya está reservado.");
    setBookings((all) => [...all, { id: crypto.randomUUID(), user: user.email, name: form.get("name"), phone: form.get("phone"), serviceId: service.id, serviceName: service.name, price: service.price, date, time, status: "confirmada" }]);
    event.currentTarget.reset(); setNotice("¡Tu turno quedó confirmado!");
  };
  const login = (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const found = users.find((item) => item.email === data.get("email")?.toLowerCase() && item.password === data.get("password")); if (!found) return setError("Email o contraseña incorrectos."); setUser(found); setError(""); setModal(false); if (found.role === "admin") setView("admin"); };
  const register = (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const email = data.get("email")?.toLowerCase(); if (!data.get("name") || !email || !data.get("password") || !data.get("phone")) return setError("Completá todos los campos."); if (users.some((item) => item.email === email)) return setError("Ese email ya está registrado."); const newUser = { name: `${data.get("name")} ${data.get("last") || ""}`.trim(), email, password: data.get("password"), phone: data.get("phone"), role: "client" }; setUsers((all) => [...all, newUser]); setUser(newUser); setError(""); setModal(false); setNotice("¡Cuenta creada! Ya podés reservar."); };
  const addService = (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); if (!data.get("name") || !data.get("price") || !data.get("duration")) return; setServices((all) => [...all, { id: crypto.randomUUID(), name: data.get("name"), price: Number(data.get("price")), duration: data.get("duration"), description: data.get("description") || "Un servicio pensado para vos." }]); event.currentTarget.reset(); setNotice("Servicio agregado."); };
  const myBookings = bookings.filter((b) => b.user === user?.email);
  const revenue = bookings.filter((b) => b.status !== "cancelada").reduce((sum, b) => sum + b.price, 0);

  return <>
    <header className="site-header"><nav className="nav-shell"><a href="#inicio" className="nav-logo">Velvet <span>Nails</span></a><div className="nav-links"><a href="#servicios">Servicios</a><a href="#turnos">Reservar</a><a href="#mis-turnos">Mis turnos</a>{isAdmin && <a href="#admin">Dueño</a>}</div><div className="nav-actions"><button className={view === "client" ? "btn-ghost active" : "btn-ghost"} onClick={() => setView("client")}>Cliente</button><button className={view === "admin" ? "btn-ghost active" : "btn-ghost"} onClick={() => isAdmin ? setView("admin") : setModal(true)}>Dueño</button>{user ? <div className="user-badge"><span>{user.name}</span><button className="btn-ghost small" onClick={() => { setUser(null); setView("client"); }}>Salir</button></div> : <button className="btn-primary compact" onClick={() => { setError(""); setModal(true); }}>Iniciar sesión</button>}</div></nav></header>
    <main id="inicio">
      <section className="hero"><div className="hero-orb"/><div className="hero-copy"><p className="eyebrow">Studio de uñas · turnos online</p><h1>Tu próximo <em>ritual</em> de belleza.</h1><p>Reservá tu momento de cuidado, elegí el servicio que más te gusta y dejá que tus manos hablen por vos.</p><div className="hero-actions"><a className="btn-primary" href="#turnos">Reservar turno <span>→</span></a><a className="btn-ghost" href="#servicios">Ver servicios</a></div></div><div className="hero-panel"><div><strong>{services.length}</strong><span>servicios</span></div><div><strong>9–18</strong><span>horarios</span></div><div><strong>Online</strong><span>reservas</span></div></div></section>
      {view === "client" && <><section id="servicios" className="section"><div className="section-heading"><p className="eyebrow">Carta de servicios</p><h2>Elegí el tratamiento ideal</h2><p>Detalles cuidados, técnicas actuales y una terminación que se siente tan linda como se ve.</p></div><div className="services-grid">{services.map((service, index) => <article className="service-card" key={service.id}><div className={`service-art art-${index % 3}`}><span>✦</span></div><div className="service-card-body"><h3>{service.name}</h3><p>{service.description}</p><div className="service-meta"><strong>{formatMoney(service.price)}</strong><span>{service.duration}</span></div></div></article>)}</div></section>
      <section id="turnos" className="section booking-section"><div className="booking-copy"><p className="eyebrow">Vista cliente</p><h2>Reservá tu turno</h2><p>Elegí una fecha, un horario disponible y confirmá en menos de un minuto.</p><div className="booking-note">Atendemos de lunes a sábado, de 9:00 a 18:00.</div></div><form className="form-card" onSubmit={book}><label>Nombre<input name="name" defaultValue={user?.name || ""} placeholder="Tu nombre"/></label><label>Teléfono<input name="phone" defaultValue={user?.phone || ""} placeholder="Tu teléfono"/></label><label>Servicio<select name="service" defaultValue=""><option value="" disabled>Elegí un servicio</option>{services.map((s) => <option value={s.id} key={s.id}>{s.name} · {formatMoney(s.price)}</option>)}</select></label><div className="form-row"><label>Fecha<input name="date" type="date" min={today()}/></label><label>Hora<select name="time" defaultValue=""><option value="" disabled>Hora</option>{HOURS.map((hour) => <option key={hour}>{hour}</option>)}</select></label></div><p className="form-error">{error}</p><button className="btn-primary" type="submit">Confirmar turno</button></form></section>
      <section id="mis-turnos" className="section"><div className="section-heading left"><p className="eyebrow">Vista cliente</p><h2>Mis turnos</h2></div><div className="booking-list">{!user ? <Empty text="Iniciá sesión para consultar tus turnos."/> : !myBookings.length ? <Empty text="Todavía no tenés turnos reservados."/> : myBookings.map((b) => <Booking key={b.id} booking={b} canCancel onStatus={updateStatus}/>)}</div></section></>}
      {view === "admin" && isAdmin && <section id="admin" className="section admin-section"><div className="section-heading left"><p className="eyebrow">Panel del estudio</p><h2>Todo bajo control</h2><p>Gestioná reservas y mantené tu carta de servicios actualizada.</p></div><div className="admin-stats"><Stat label="Turnos totales" value={bookings.length}/><Stat label="Confirmados" value={bookings.filter((b) => b.status === "confirmada").length}/><Stat label="Ingresos estimados" value={formatMoney(revenue)}/></div><div className="admin-layout"><div className="panel-card"><div className="panel-title"><h3>Reservas</h3><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">Todas</option><option value="confirmada">Confirmadas</option><option value="realizada">Realizadas</option><option value="cancelada">Canceladas</option></select></div><div className="booking-list">{visibleBookings.length ? visibleBookings.map((b) => <Booking key={b.id} booking={b} admin onStatus={updateStatus}/>) : <Empty text="No hay reservas para este filtro."/>}</div></div><form className="panel-card" onSubmit={addService}><h3>Agregar servicio</h3><label>Nombre<input name="name" placeholder="Ej: Nail art"/></label><div className="form-row"><label>Precio<input name="price" type="number" min="0" placeholder="8500"/></label><label>Duración<input name="duration" placeholder="60 min"/></label></div><label>Descripción<textarea name="description" rows="3" placeholder="Detalle breve del servicio"/></label><button className="btn-primary">Guardar servicio</button><div className="service-admin-list">{services.map((s) => <div className="service-row" key={s.id}><span>{s.name}<b>{formatMoney(s.price)}</b></span><button className="icon-button" type="button" aria-label={`Eliminar ${s.name}`} onClick={() => setServices((all) => all.filter((item) => item.id !== s.id))}>×</button></div>)}</div></form></div></section>}
    </main><footer>© {new Date().getFullYear()} <b>Velvet Nails</b> — Todos los derechos reservados.</footer>
    {notice && <div className="toast">{notice}</div>}
    {modal && <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setModal(false)}><div className="modal"><button className="modal-close" onClick={() => setModal(false)} aria-label="Cerrar">×</button><h2>Ingresar a Velvet Nails</h2><p className="modal-note">Para probar como dueño usá: owner@velvetnails.com / admin123</p><div className="auth-tabs"><button className={tab === "login" ? "auth-tab active" : "auth-tab"} onClick={() => { setTab("login"); setError(""); }}>Login</button><button className={tab === "register" ? "auth-tab active" : "auth-tab"} onClick={() => { setTab("register"); setError(""); }}>Registro</button></div>{tab === "login" ? <form className="auth-form active" onSubmit={login}><input name="email" type="email" placeholder="Email"/><input name="password" type="password" placeholder="Contraseña"/><p className="form-error">{error}</p><button className="btn-primary">Entrar</button></form> : <form className="auth-form active" onSubmit={register}><input name="name" placeholder="Nombre"/><input name="last" placeholder="Apellido"/><input name="email" type="email" placeholder="Email"/><input name="password" type="password" placeholder="Contraseña"/><input name="phone" placeholder="Teléfono"/><p className="form-error">{error}</p><button className="btn-primary">Crear cuenta</button></form>}</div></div>}
  </>;
}

function Empty({ text }) { return <div className="empty-state"><span>✦</span>{text}</div>; }
function Stat({ label, value }) { return <article><span>{label}</span><strong>{value}</strong></article>; }
function Booking({ booking, admin, canCancel, onStatus }) { return <article className="booking-card"><div><h3>{admin ? booking.name : booking.serviceName}</h3><p>{admin ? `${booking.serviceName} · ${booking.date} · ${booking.time}` : `${booking.date} · ${booking.time} · ${formatMoney(booking.price)}`}</p>{admin && <p>{booking.phone} · {formatMoney(booking.price)}</p>}</div><div className="booking-actions"><span className={`status ${booking.status}`}>{booking.status}</span>{canCancel && booking.status === "confirmada" && <button className="btn-ghost small" onClick={() => onStatus(booking.id, "cancelada")}>Cancelar</button>}{admin && <><button className="btn-ghost small" onClick={() => onStatus(booking.id, "confirmada")}>Confirmar</button><button className="btn-ghost small" onClick={() => onStatus(booking.id, "realizada")}>Realizada</button><button className="btn-ghost small" onClick={() => onStatus(booking.id, "cancelada")}>Cancelar</button></>}</div></article>; }
