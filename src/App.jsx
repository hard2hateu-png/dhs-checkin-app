import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import jsQR from "jsqr";

const API_URL = "https://script.google.com/macros/s/AKfycbw9mRofEQdVmM-RS9c6awsFWSz2HLxywNjBCoyU9MWC_AAIxfQYyf57tRKjN6FYo4-Isw/exec";
const STAFF_PASSWORD = "delino2026";

const FALLBACK_ATTENDEES = Array.from({ length: 100 }, (_, i) => ({
  ticket_id: `DHS26-${String(i + 1).padStart(3, "0")}`,
  first_name: "",
  last_name: "",
  job_role: "",
  cosmetology_license: "",
  phone: "",
  email: "",
  vendor_rep: "",
  registered: "NO",
  qr_scanned: 0,
  checked_in: false,
}));

// --- UTILS ---

function normalizeTicketId(value) {
  if (!value) return "";
  const raw = String(value).trim();

  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    const pathMatch = url.pathname.match(/DHS26-\d{3}/i);
    if (pathMatch) return pathMatch[0].toUpperCase();

    const fromQuery =
      url.searchParams.get("ticket") ||
      url.searchParams.get("ticket_id") ||
      url.searchParams.get("id");

    if (fromQuery) {
      const match = String(fromQuery).match(/DHS26-\d{3}/i);
      return match ? match[0].toUpperCase() : "";
    }
    return "";
  } catch {
    const match = raw.match(/DHS26-\d{3}/i);
    return match ? match[0].toUpperCase() : "";
  }
}

function normalizeTicket(ticket, index = null) {
  const possibleTicketId =
    ticket?.ticket_id ||
    ticket?.Ticket_ID ||
    ticket?.["Ticket ID"] ||
    ticket?.qr_id ||
    ticket?.QR_ID ||
    ticket?.qr_text ||
    ticket?.QR_TEXT ||
    ticket?.registration_url ||
    ticket?.Registration_URL ||
    "";

  const fallbackTicketId = index !== null ? `DHS26-${String(index + 1).padStart(3, "0")}` : "";
  const cleanTicketId = normalizeTicketId(possibleTicketId) || fallbackTicketId;

  return {
    ...ticket,
    ticket_id: cleanTicketId,
    first_name: ticket?.first_name || ticket?.["First Name"] || "",
    last_name: ticket?.last_name || ticket?.["Last Name"] || "",
    job_role: ticket?.job_role || ticket?.["Job Role"] || "",
    cosmetology_license: ticket?.cosmetology_license || ticket?.["Cosmetology License"] || "",
    phone: ticket?.phone || ticket?.Phone || "",
    email: ticket?.email || ticket?.Email || "",
    vendor_rep: ticket?.vendor_rep || ticket?.["Vendor Rep"] || "",
    registered: ticket?.registered ?? "NO",
    checked_in:
      ticket?.checked_in === true ||
      ticket?.qr_scanned === 1 ||
      String(ticket?.qr_scanned).toUpperCase() === "TRUE",
  };
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text || "Server Error");
  }
}

// --- API ---

async function apiGetTicket(ticketId) {
  const cleanId = normalizeTicketId(ticketId);
  const data = await fetchJson(`${API_URL}?ticket_id=${encodeURIComponent(cleanId)}`);
  if (!data.success) throw new Error(data.error || "Ticket not found");
  return normalizeTicket(data.ticket);
}

async function apiListTickets() {
  const data = await fetchJson(`${API_URL}?action=list`);
  if (!data.success) throw new Error(data.error || "Could not load tickets");
  return data.tickets.map((ticket, index) => normalizeTicket(ticket, index));
}

async function apiRegisterTicket(formData) {
  const data = await fetchJson(API_URL, {
    method: "POST",
    body: JSON.stringify({ action: "register", ...formData, ticket_id: normalizeTicketId(formData.ticket_id) }),
  });
  if (!data.success) throw new Error(data.error || "Registration failed");
  return normalizeTicket(data.ticket);
}

async function apiCheckInTicket(ticketId) {
  const data = await fetchJson(API_URL, {
    method: "POST",
    body: JSON.stringify({ action: "check_in", ticket_id: normalizeTicketId(ticketId) }),
  });
  if (!data.success) throw new Error(data.error || "Check-in failed");
  return normalizeTicket(data.ticket);
}

async function apiUndoCheckInTicket(ticketId) {
  const data = await fetchJson(API_URL, {
    method: "POST",
    body: JSON.stringify({ action: "undo_check_in", ticket_id: normalizeTicketId(ticketId) }),
  });
  if (!data.success) throw new Error(data.error || "Undo failed");
  return normalizeTicket(data.ticket);
}

// --- ICONS ---

const IconBack = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>;
const IconCheck = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
const IconScan = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M8 12h8" /></svg>;

// --- COMPONENTS ---

function StaffLogin({ onLogin, onCancel }) {
  const [pass, setPass] = useState("");
  const handleSubmit = (e) => {
    e.preventDefault();
    if (pass === STAFF_PASSWORD) onLogin();
    else alert("Contraseña incorrecta");
  };
  return (
    <div style={{ padding: 40, textAlign: "center", height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <h2 style={{ marginBottom: 20 }}>Acceso Staff</h2>
      <form onSubmit={handleSubmit}>
        <input autoFocus type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="Contraseña" 
               style={{ width: "100%", padding: 15, background: "#1a1a1a", border: "1px solid #333", color: "#fff", marginBottom: 20, textAlign: "center", fontSize: 18 }} />
        <button type="submit" style={{ width: "100%", padding: 15, background: "#00ff88", fontWeight: 700, borderRadius: 8 }}>ENTRAR</button>
        <button type="button" onClick={onCancel} style={{ marginTop: 20, color: "#888", background: "none", border: "none" }}>Cancelar</button>
      </form>
    </div>
  );
}

function GuestView({ attendee, onRegister, onStaffMode }) {
  const isReg = attendee?.first_name || attendee?.last_name;
  return (
    <div style={{ padding: 30, textAlign: "center", display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <h2 style={{ color: "#aaa", fontSize: 16, marginBottom: 10 }}>TICKET {attendee.ticket_id}</h2>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 20 }}>{isReg ? "YA ESTÁS REGISTRADO" : "BIENVENIDO"}</h1>
        {isReg && <div style={{ fontSize: 24, color: "#00ff88", marginBottom: 40 }}>{attendee.first_name} {attendee.last_name}</div>}
        
        <button type="button" onClick={onRegister} style={{ width: "100%", padding: 20, background: isReg ? "#222" : "#00ff88", color: isReg ? "#fff" : "#000", fontWeight: 700, borderRadius: 16, fontSize: 18, marginBottom: 15 }}>
          {isReg ? "EDITAR MI REGISTRO" : "REGISTRAR TICKET"}
        </button>
        
        <a href="tel:9726680516" style={{ width: "100%", padding: 15, background: "#111", border: "1px solid #333", color: "#ccc", textDecoration: "none", fontWeight: 600, borderRadius: 16, fontSize: 16 }}>
          CONTACTAR A DELINO
        </a>
      </div>
      <button type="button" onClick={onStaffMode} style={{ color: "#444", fontSize: 12, background: "none", border: "none", marginTop: 40 }}>MODO STAFF</button>
    </div>
  );
}

function RegistrationForm({ ticketId, initial, onSubmit, onCancel, saving }) {
  const [form, setForm] = useState({
    ticket_id: ticketId,
    first_name: initial?.first_name || "",
    last_name: initial?.last_name || "",
    job_role: initial?.job_role || "",
    cosmetology_license: initial?.cosmetology_license || "",
    phone: initial?.phone || "",
    email: initial?.email || "",
    vendor_rep: initial?.vendor_rep || "",
  });

  const canSubmit = form.first_name && form.last_name && !saving;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0a0a0a" }}>
      <div style={{ padding: "20px 20px", display: "flex", alignItems: "center", gap: 15, borderBottom: "1px solid #1a1a1a" }}>
        <button onClick={onCancel} style={{ background: "none", border: "none", color: "#fff" }}><IconBack /></button>
        <span style={{ fontWeight: 700 }}>{initial?.first_name ? "EDITAR REGISTRO" : "REGISTRO DE TICKET"}</span>
      </div>
      <div style={{ flex: 1, padding: 25, overflowY: "auto" }}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ color: "#666", fontSize: 12 }}>TICKET ID</label>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{ticketId}</div>
        </div>
        <input placeholder="Nombre" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} style={{ width: "100%", padding: 16, background: "#161616", border: "1px solid #222", color: "#fff", marginBottom: 15, borderRadius: 12 }} />
        <input placeholder="Apellido" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} style={{ width: "100%", padding: 16, background: "#161616", border: "1px solid #222", color: "#fff", marginBottom: 15, borderRadius: 12 }} />
        
        <select
          value={form.job_role}
          onChange={e => setForm({ ...form, job_role: e.target.value })}
          style={{ width: "100%", padding: 16, background: "#161616", border: "1px solid #222", color: "#fff", marginBottom: 15, borderRadius: 12 }}
        >
          <option value="">Puesto de trabajo</option>
          <option value="ESTILISTA">ESTILISTA</option>
          <option value="PROPIETARIO DE SALON DE BELLEZA">PROPIETARIO DE SALON DE BELLEZA</option>
          <option value="ESTUDIANTE">ESTUDIANTE</option>
        </select>

        <input
          placeholder="Licencia de cosmetología"
          value={form.cosmetology_license}
          onChange={e => setForm({ ...form, cosmetology_license: e.target.value })}
          style={{ width: "100%", padding: 16, background: "#161616", border: "1px solid #222", color: "#fff", marginBottom: 15, borderRadius: 12 }}
        />

        <input placeholder="Teléfono" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} style={{ width: "100%", padding: 16, background: "#161616", border: "1px solid #222", color: "#fff", marginBottom: 15, borderRadius: 12 }} />
        <input placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={{ width: "100%", padding: 16, background: "#161616", border: "1px solid #222", color: "#fff", marginBottom: 15, borderRadius: 12 }} />
        
        <input
          placeholder="Vendedor / Representante"
          value={form.vendor_rep}
          onChange={e => setForm({ ...form, vendor_rep: e.target.value })}
          style={{ width: "100%", padding: 16, background: "#161616", border: "1px solid #222", color: "#fff", marginBottom: 15, borderRadius: 12 }}
        />
      </div>
      <div style={{ padding: 20 }}>
        <button onClick={() => onSubmit(form)} disabled={!canSubmit} style={{ width: "100%", padding: 20, background: canSubmit ? "#fbbf24" : "#1a1a1a", color: "#000", fontWeight: 800, borderRadius: 16, fontSize: 18 }}>
          {saving ? "GUARDANDO..." : "GUARDAR"}
        </button>
      </div>
    </div>
  );
}

function AttendeeList({ attendees, onSelect, onScanNav, onLogout, loading }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return attendees.filter(a => a.ticket_id.toLowerCase().includes(q) || (a.first_name + a.last_name).toLowerCase().includes(q));
  }, [attendees, query]);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <div style={{ padding: 20, background: "#0d0d0d" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
          <h2 style={{ fontSize: 24, fontWeight: 900 }}>DHS STAFF</h2>
          <button type="button" onClick={onScanNav} style={{ background: "#00ff88", color: "#000", border: "none", padding: "10px 15px", borderRadius: 8, fontWeight: 800, display: "flex", alignItems: "center", gap: 5 }}><IconScan /> SCAN</button>
        </div>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar ticket o nombre..." style={{ width: "100%", padding: 14, background: "#1a1a1a", border: "1px solid #333", color: "#fff", borderRadius: 10 }} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", WebkitOverflowScrolling: "touch", padding: "0 20px 20px" }}>
        {loading ? <div style={{ textAlign: "center", padding: 20, color: "#666" }}>Cargando lista...</div> : 
          filtered.map(a => (
          <div key={a.ticket_id} onClick={() => onSelect(a.ticket_id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onSelect(a.ticket_id)} style={{ padding: "15px 0", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", touchAction: "manipulation" }}>
            <div>
              <div style={{ fontWeight: 700, color: "#fff" }}>{a.ticket_id}</div>
              <div style={{ fontSize: 14, color: (a.first_name || a.last_name) ? "#888" : "#ff4444" }}>{(a.first_name || a.last_name) ? `${a.first_name} ${a.last_name}` : "No registrado"}</div>
            </div>
            {a.checked_in && <IconCheck />}
          </div>
        ))}
      </div>
      <button type="button" onClick={onLogout} style={{ padding: 15, color: "#ff4444", background: "none", border: "none", fontSize: 12 }}>SALIR DE STAFF</button>
    </div>
  );
}

function AttendeeDetail({ attendee, onCheckIn, onUndo, onRegister, onBack, saving }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: 20, display: "flex", alignItems: "center", gap: 15 }}>
        <button type="button" onClick={onBack} style={{ background: "none", border: "none", color: "#fff" }}><IconBack /></button>
        <span style={{ fontWeight: 700 }}>STAFF: DETALLE</span>
      </div>
      <div style={{ flex: 1, padding: 25 }}>
        <div style={{ fontSize: 14, color: "#888", marginBottom: 5 }}>TICKET {attendee.ticket_id}</div>
        <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 10 }}>{(attendee.first_name || attendee.last_name) ? `${attendee.first_name} ${attendee.last_name}` : "No registrado"}</div>
        <div style={{ marginBottom: 30, display: "flex", alignItems: "center", gap: 8 }}>
           {attendee.checked_in ? <><IconCheck /><span style={{ color: "#00ff88", fontWeight: 600 }}>CHECK-IN OK</span></> : <span style={{ color: "#444" }}>Pendiente de entrada</span>}
        </div>

        <button type="button" onClick={onRegister} style={{ width: "100%", padding: 16, background: "#1a1a1a", border: "1px solid #333", color: "#fff", borderRadius: 12, marginBottom: 15 }}>EDITAR REGISTRO</button>
        
        {!attendee.checked_in ? (
          <button type="button" onClick={() => onCheckIn(attendee.ticket_id)} disabled={saving} style={{ width: "100%", padding: 20, background: "#00ff88", color: "#000", fontWeight: 800, borderRadius: 16, fontSize: 18 }}>{saving ? "PROCESANDO..." : "HACER CHECK-IN"}</button>
        ) : (
          <button type="button" onClick={() => onUndo(attendee.ticket_id)} disabled={saving} style={{ width: "100%", padding: 20, background: "#ff444422", color: "#ff4444", fontWeight: 700, border: "1px solid #ff4444", borderRadius: 16 }}>{saving ? "REVIRTIENDO..." : "ANULAR CHECK-IN"}</button>
        )}
      </div>
    </div>
  );
}

function QRScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  useEffect(() => {
    let stream;
    let anim;
    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        const tick = () => {
          if (videoRef.current?.readyState === videoRef.current?.HAVE_ENOUGH_DATA) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            const ctx = canvasRef.current.getContext("2d");
            ctx.drawImage(videoRef.current, 0, 0);
            const imgData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
            const code = jsQR(imgData.data, imgData.width, imgData.height);
            if (code) { const ticketId = normalizeTicketId(code.data); if (ticketId) { onScan(ticketId); return; } }
          }
          anim = requestAnimationFrame(tick);
        };
        tick();
      } catch (err) { alert("Cámara no disponible."); onClose(); }
    };
    start();
    return () => { stream?.getTracks().forEach(t => t.stop()); cancelAnimationFrame(anim); };
  }, [onScan, onClose]);
  return (
    <div style={{ height: "100%", background: "#000", position: "relative" }}>
      <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <button type="button" onClick={onClose} style={{ position: "absolute", top: 20, left: 20, background: "#fff", border: "none", padding: 10, borderRadius: "50%", zIndex: 10 }}><IconBack /></button>
    </div>
  );
}

// --- MAIN APP ---

export default function App() {
  const [isStaff, setIsStaff] = useState(() => localStorage.getItem("STAFF_MODE") === "true");
  const [screen, setScreen] = useState("list");
  const [attendees, setAttendees] = useState(FALLBACK_ATTENDEES);
  const [selectedId, setSelectedId] = useState(null);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedAttendee = useMemo(() => attendees.find(a => a.ticket_id === selectedId), [attendees, selectedId]);

  const upsert = useCallback((t) => {
    const clean = normalizeTicket(t);
    setAttendees(prev => {
      const exists = prev.some(a => a.ticket_id === clean.ticket_id);
      if (!exists) return [...prev, clean].sort((a, b) => a.ticket_id.localeCompare(b.ticket_id));
      return prev.map(a => a.ticket_id === clean.ticket_id ? { ...a, ...clean } : a);
    });
  }, []);

  const handleSelect = useCallback(async (id) => {
    const cleanId = normalizeTicketId(id);
    if (!cleanId) return;

    setSelectedId(cleanId);
    setTicketLoading(true); // START LOADING
    setScreen(isStaff ? "detail" : "guest");

    try {
      const ticket = await apiGetTicket(cleanId);
      upsert(ticket);
    } catch { 
       /* Fail silently - the fallback entry remains */
    } finally {
      setTicketLoading(false); // STOP LOADING
    }
  }, [isStaff, upsert]);

  useEffect(() => {
    const id = normalizeTicketId(window.location.href);
    if (id) {
        handleSelect(id);
    } else if (isStaff) {
      setLoading(true);
      apiListTickets().then(list => { 
        setAttendees(list); 
        setLoading(false); 
      }).catch(() => setLoading(false));
    }
  }, [handleSelect, isStaff]);

  async function handleCheckIn(id) {
    setSaving(true);
    try { upsert(await apiCheckInTicket(id)); } catch(e) { alert(e.message); }
    finally { setSaving(false); }
  }

  async function handleUndo(id) {
    if (!confirm("¿Anular check-in?")) return;
    setSaving(true);
    try { upsert(await apiUndoCheckInTicket(id)); } catch(e) { alert(e.message); }
    finally { setSaving(false); }
  }

  async function handleRegisterSubmit(form) {
    setSaving(true);
    try {
      const t = await apiRegisterTicket(form);
      upsert(t);
      setScreen(isStaff ? "detail" : "guest");
    } catch(e) { alert(e.message); }
    finally { setSaving(false); }
  }

  const logout = () => { 
    localStorage.removeItem("STAFF_MODE"); 
    window.location.href = "/"; 
  };
  
  const login = () => { 
    localStorage.setItem("STAFF_MODE", "true"); 
    window.location.href = "/"; 
  };

  if (screen === "staffLogin") return <StaffLogin onLogin={login} onCancel={() => setScreen(selectedId ? (isStaff ? "detail" : "guest") : "list")} />;

  return (
    <div style={{ maxWidth: 500, margin: "0 auto", background: "#0a0a0a", minHeight: "100dvh", color: "#fff", overflowY: "auto", overflowX: "hidden", fontFamily: "sans-serif", position: "relative", WebkitOverflowScrolling: "touch" }}>
      
      {/* WRAPPER LOGIC: 
          If ticketLoading is true, show the loader. 
          Otherwise, render the specific screen components.
      */}
      {ticketLoading ? (
        <div style={{ padding: 100, textAlign: "center", color: "#aaa", fontFamily: "monospace" }}>
          CARGANDO TICKET...
        </div>
      ) : (
        <>
          {screen === "list" && isStaff && <AttendeeList attendees={attendees} loading={loading} onSelect={handleSelect} onScanNav={() => setScreen("scan")} onLogout={logout} />}
          
          {screen === "list" && !isStaff && (
            <div style={{ padding: 40, textAlign: "center", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <h1 style={{ fontWeight: 900, fontSize: 40, marginBottom: 10 }}>DHS 2026</h1>
              <p style={{ color: "#666", lineHeight: 1.5 }}>Escanea tu ticket físico para ver tus detalles o completar tu registro.</p>
              <button type="button" onClick={() => setScreen("staffLogin")} style={{ marginTop: 60, color: "#222", border: "none", background: "none", fontSize: 12 }}>Staff Access</button>
            </div>
          )}

          {screen === "guest" && selectedAttendee && (
            <GuestView attendee={selectedAttendee} onRegister={() => setScreen("register")} onStaffMode={() => setScreen("staffLogin")} />
          )}
          
          {screen === "detail" && isStaff && selectedAttendee && (
            <AttendeeDetail attendee={selectedAttendee} saving={saving} onBack={() => setScreen("list")} onCheckIn={handleCheckIn} onUndo={handleUndo} onRegister={() => setScreen("register")} />
          )}

          {screen === "register" && (
            <RegistrationForm ticketId={selectedId} initial={selectedAttendee} saving={saving} onSubmit={handleRegisterSubmit} onCancel={() => setScreen(isStaff ? "detail" : "guest")} />
          )}

          {screen === "scan" && isStaff && <QRScanner onScan={handleSelect} onClose={() => setScreen("list")} />}
        </>
      )}
    </div>
  );
}
