import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import jsQR from "jsqr";

const API_URL = "https://script.google.com/macros/s/AKfycbw9mRofEQdVmM-RS9c6awsFWSz2HLxywNjBCoyU9MWC_AAIxfQYyf57tRKjN6FYo4-Isw/exec";

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
  check_in_time: "",
})); [cite: 2]

// --- UTILS ---

function normalizeTicketId(value) {
  if (!value) return "";
  const raw = String(value).trim();
  try {
    const url = new URL(raw);
    const fromQuery = url.searchParams.get("ticket") || url.searchParams.get("ticket_id") || url.searchParams.get("id");
    if (fromQuery) return fromQuery.trim().toUpperCase();
    const matchFromPath = url.pathname.match(/DHS26-\d{3}/i);
    if (matchFromPath) return matchFromPath[0].toUpperCase();
  } catch { /* Not a URL */ }
  const match = raw.match(/DHS26-\d{3}/i);
  return match ? match[0].toUpperCase() : raw.toUpperCase();
} [cite: 3, 4, 5, 6, 7]

function normalizeTicket(ticket) {
  return {
    ...ticket,
    ticket_id: normalizeTicketId(ticket?.ticket_id || ticket?.Ticket_ID || ""),
    first_name: ticket?.first_name || ticket?.["First Name"] || "",
    last_name: ticket?.last_name || ticket?.["Last Name"] || "",
    registered: ticket?.registered ?? "NO",
    checked_in:
      ticket?.checked_in === true ||
      ticket?.qr_scanned === 1 ||
      String(ticket?.qr_scanned).toUpperCase() === "TRUE",
  };
} [cite: 7, 8, 9, 10]

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(text || "Server returned invalid JSON");
  }
} [cite: 10, 11, 12]

// --- API ---

async function apiGetTicket(ticketId) {
  const cleanId = normalizeTicketId(ticketId);
  const data = await fetchJson(`${API_URL}?ticket_id=${encodeURIComponent(cleanId)}`);
  if (!data.success) throw new Error(data.error || "Ticket not found");
  return normalizeTicket(data.ticket);
} [cite: 13, 14]

async function apiListTickets() {
  const data = await fetchJson(`${API_URL}?action=list`);
  if (!data.success) throw new Error(data.error || "Could not load tickets");
  return data.tickets.map(normalizeTicket);
} [cite: 15, 16]

async function apiRegisterTicket(formData) {
  const data = await fetchJson(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "register",
      ...formData,
      ticket_id: normalizeTicketId(formData.ticket_id),
    }),
  });
  if (!data.success) throw new Error(data.error || "Registration failed");
  return normalizeTicket(data.ticket);
} [cite: 16, 17]

async function apiCheckInTicket(ticketId) {
  const data = await fetchJson(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "check_in",
      ticket_id: normalizeTicketId(ticketId),
    }),
  });
  if (!data.success) throw new Error(data.error || "Check-in failed");
  return normalizeTicket(data.ticket);
} [cite: 18, 19]

async function apiUndoCheckInTicket(ticketId) {
  const data = await fetchJson(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "undo_check_in",
      ticket_id: normalizeTicketId(ticketId),
    }),
  });
  if (!data.success) throw new Error(data.error || "Undo check-in failed");
  return normalizeTicket(data.ticket);
} [cite: 20, 21]

// --- LOGIC HELPERS ---

function isRegistered(attendee) {
  return Boolean(
    attendee?.first_name ||
      attendee?.last_name ||
      attendee?.email ||
      attendee?.registered === true ||
      String(attendee?.registered).toUpperCase() === "YES" ||
      String(attendee?.registered).toUpperCase() === "TRUE"
  );
} [cite: 22]

function isCheckedIn(attendee) {
  return Boolean(
    attendee?.checked_in === true ||
      attendee?.qr_scanned === 1 ||
      String(attendee?.qr_scanned).toUpperCase() === "TRUE"
  );
} [cite: 23]

function roleBadge(role) {
  if (!role) return { bg: "#2a2a2a", text: "#888", label: "-" };
  const r = String(role).toUpperCase();
  if (r.includes("ESTILISTA")) return { bg: "#1a2f1a", text: "#4ade80", label: "ESTILISTA" };
  if (r.includes("PROPIETARIO")) return { bg: "#1a1f3a", text: "#60a5fa", label: "PROPIETARIO" };
  if (r.includes("ESTUDIANTE")) return { bg: "#2a1a2f", text: "#c084fc", label: "ESTUDIANTE" };
  return { bg: "#2a2a1a", text: "#fbbf24", label: role };
} [cite: 24, 25, 26, 27]

// --- ICONS ---

const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
);
const IconScan = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M8 12h8" />
  </svg>
);
const IconBack = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5M12 5l-7 7 7 7" />
  </svg>
);
const IconCheck = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const IconUndo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
  </svg>
); [cite: 28, 29, 30, 31, 32, 33]

// --- COMPONENTS ---

function QRScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animRef = useRef(null);
  const [status, setStatus] = useState("Iniciando cámara...");
  const [manualInput, setManualInput] = useState("");

  useEffect(() => {
    let active = true;
    function stopCamera() {
      active = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    }
    function scanFrame() {
      if (!active) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "attemptBoth" });
        if (code?.data) {
          stopCamera();
          onScan(normalizeTicketId(code.data));
          return;
        }
      }
      animRef.current = requestAnimationFrame(scanFrame);
    }
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!active) return;
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStatus("Apunta al código QR del ticket");
          scanFrame();
        }
      } catch { setStatus("No se pudo usar la cámara. Usa entrada manual."); }
    }
    startCamera();
    return () => stopCamera();
  }, [onScan]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#000" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: "#0d0d0d", borderBottom: "1px solid #1a1a1a" }}>
        <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "#aaa" }}><IconBack /></button>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700, color: "#fff" }}>ESCANEAR TICKET</span>
      </div>
      <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} playsInline muted />
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>
      <div style={{ textAlign: "center", padding: 12, color: "#aaa" }}>{status}</div>
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={manualInput} onChange={(e) => setManualInput(e.target.value)} placeholder="DHS26-001" style={{ flex: 1, padding: 13, background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#fff" }} />
          <button onClick={() => onScan(normalizeTicketId(manualInput))} style={{ padding: "13px 20px", background: "#00ff88", fontWeight: 700 }}>IR</button>
        </div>
      </div>
    </div>
  );
} [cite: 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 55, 56, 57]

function AttendeeList({ attendees, onSelect, onScanNav, loading }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    if (!query) return attendees;
    const q = query.toLowerCase();
    return attendees.filter(a => a.ticket_id?.toLowerCase().includes(q) || (a.first_name || "").toLowerCase().includes(q) || (a.last_name || "").toLowerCase().includes(q));
  }, [attendees, query]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: 20, background: "#0d0d0d" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 700 }}>DHS 2026</div>
          <button onClick={onScanNav} style={{ background: "#00ff88", padding: "12px 18px", fontWeight: 700, borderRadius: 12 }}><IconScan /> SCAN</button>
        </div>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar..." style={{ width: "100%", marginTop: 16, padding: 13, background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#fff" }} />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        {filtered.map(a => (
          <button key={a.ticket_id} onClick={() => onSelect(a.ticket_id)} style={{ width: "100%", padding: 16, background: "#111", marginBottom: 10, textAlign: "left", display: "flex", alignItems: "center", border: "1px solid #222" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{a.ticket_id}</div>
              <div style={{ color: isRegistered(a) ? "#aaa" : "#ff7777" }}>{isRegistered(a) ? `${a.first_name} ${a.last_name}` : "No registrado"}</div>
            </div>
            {isCheckedIn(a) && <IconCheck />}
          </button>
        ))}
      </div>
    </div>
  );
} [cite: 72, 73, 74, 75, 76, 78, 79, 80, 81, 82, 83, 84, 85, 86]

function AttendeeDetail({ attendee, onCheckIn, onUndoCheckIn, onRegister, onBack, saving }) {
  const checked = isCheckedIn(attendee);
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: 20, background: "#0d0d0d", display: "flex", gap: 14 }}>
        <button onClick={onBack}><IconBack /></button>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{attendee.ticket_id}</div>
      </div>
      <div style={{ flex: 1, padding: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>{isRegistered(attendee) ? `${attendee.first_name} ${attendee.last_name}` : "No registrado"}</div>
        {checked && (
          <div style={{ background: "#0a1f0a", padding: 20, borderRadius: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <IconCheck />
            <div style={{ flex: 1, color: "#00ff88" }}>Check-in completo</div>
            <button onClick={() => onUndoCheckIn(attendee.ticket_id)} disabled={saving}><IconUndo /></button>
          </div>
        )}
      </div>
      <div style={{ padding: 20 }}>
        <button onClick={() => onRegister(attendee.ticket_id)} style={{ width: "100%", padding: 16, background: "#222", marginBottom: 10 }}>EDITAR REGISTRO</button>
        {!checked && isRegistered(attendee) && (
          <button onClick={() => onCheckIn(attendee.ticket_id)} disabled={saving} style={{ width: "100%", padding: 20, background: "#00ff88", fontWeight: 700 }}>HACER CHECK-IN</button>
        )}
      </div>
    </div>
  );
} [cite: 88, 89, 92, 93, 95, 96, 98, 99, 100, 101, 102, 103, 105, 106, 107, 108, 109]

function RegistrationForm({ ticketId, initial, onSubmit, onCancel, saving }) {
  const [form, setForm] = useState({
    ticket_id: ticketId,
    first_name: initial?.first_name || "",
    last_name: initial?.last_name || "",
    job_role: initial?.job_role || "",
    phone: initial?.phone || "",
    email: initial?.email || "",
  });
  const canSubmit = form.first_name && form.last_name && form.phone && form.email && !saving;
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: 20, background: "#0d0d0d", display: "flex", gap: 14 }}>
        <button onClick={onCancel}><IconBack /></button>
        <div style={{ fontSize: 20, fontWeight: 700 }}>REGISTRO</div>
      </div>
      <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
        <input placeholder="Nombre" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} style={{ width: "100%", padding: 14, background: "#111", marginBottom: 14 }} />
        <input placeholder="Apellido" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} style={{ width: "100%", padding: 14, background: "#111", marginBottom: 14 }} />
        <input placeholder="Email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={{ width: "100%", padding: 14, background: "#111", marginBottom: 14 }} />
        <input placeholder="Teléfono" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} style={{ width: "100%", padding: 14, background: "#111" }} />
      </div>
      <div style={{ padding: 20 }}>
        <button onClick={() => onSubmit(form)} disabled={!canSubmit} style={{ width: "100%", padding: 20, background: canSubmit ? "#fbbf24" : "#1a1a1a", fontWeight: 700 }}>{saving ? "GUARDANDO..." : "GUARDAR REGISTRO"}</button>
      </div>
    </div>
  );
} [cite: 61, 62, 63, 64, 65, 68, 69, 70, 71]

// --- MAIN APP ---

export default function App() {
  const [screen, setScreen] = useState("list");
  const [attendees, setAttendees] = useState(FALLBACK_ATTENDEES);
  const [selectedId, setSelectedId] = useState(null);
  const [notFoundMsg, setNotFoundMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ticketLoading, setTicketLoading] = useState(false); [cite: 138]

  const selectedAttendee = useMemo(() => attendees.find(a => a.ticket_id === selectedId), [attendees, selectedId]);

  const upsertAttendee = useCallback((ticket) => {
    setAttendees(prev => {
      const clean = normalizeTicket(ticket);
      const exists = prev.some(a => a.ticket_id === clean.ticket_id);
      if (!exists) return [...prev, clean].sort((a, b) => a.ticket_id.localeCompare(b.ticket_id));
      return prev.map(a => a.ticket_id === clean.ticket_id ? { ...a, ...clean } : a);
    });
  }, []);

  const handleSelect = useCallback(async (ticketId) => {
    const cleanId = normalizeTicketId(ticketId);
    setNotFoundMsg("");
    setSelectedId(cleanId);
    setTicketLoading(true); [cite: 138]
    setScreen("detail");
    try {
      const ticket = await apiGetTicket(cleanId);
      upsertAttendee(ticket);
    } catch {
      setNotFoundMsg(`${cleanId} - no encontrado`);
      window.setTimeout(() => setNotFoundMsg(""), 3000);
    } finally { setTicketLoading(false); } [cite: 138]
  }, [upsertAttendee]);

  async function handleCheckIn(ticketId) {
    setSaving(true);
    try {
      const updated = await apiCheckInTicket(ticketId);
      upsertAttendee(updated);
    } catch (err) { setNotFoundMsg(err.message); }
    finally { setSaving(false); }
  }

  async function handleUndoCheckIn(ticketId) {
    if (!window.confirm("¿Anular el check-in?")) return;
    setSaving(true);
    try {
      const updated = await apiUndoCheckInTicket(ticketId);
      upsertAttendee(updated);
    } catch (err) { setNotFoundMsg(err.message); }
    finally { setSaving(false); }
  }

  async function handleRegisterSubmit(formData) {
    setSaving(true);
    try {
      const updated = await apiRegisterTicket(formData);
      upsertAttendee(updated);
      setScreen("detail");
    } catch (err) { setNotFoundMsg(err.message); }
    finally { setSaving(false); }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const rows = await apiListTickets();
        setAttendees(rows);
      } catch { /* Use fallback */ }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", background: "#0a0a0a", height: "100vh", color: "#fff", position: "relative" }}>
      {screen === "list" && <AttendeeList attendees={attendees} loading={loading} onSelect={handleSelect} onScanNav={() => setScreen("scan")} />}
      {screen === "scan" && <QRScanner onScan={handleSelect} onClose={() => setScreen("list")} />}
      {screen === "detail" && ticketLoading && <div style={{ padding: 40, textAlign: "center" }}>Cargando ticket...</div>} 
      {screen === "detail" && !ticketLoading && selectedAttendee && (
        <AttendeeDetail attendee={selectedAttendee} saving={saving} onBack={() => setScreen("list")} onCheckIn={handleCheckIn} onUndoCheckIn={handleUndoCheckIn} onRegister={() => setScreen("register")} />
      )} 
      {screen === "register" && <RegistrationForm ticketId={selectedId} initial={selectedAttendee} saving={saving} onSubmit={handleRegisterSubmit} onCancel={() => setScreen("detail")} />}
      {notFoundMsg && <div style={{ position: "absolute", bottom: 100, left: 20, right: 20, background: "#ff4444", padding: 12, borderRadius: 12, textAlign: "center" }}>{notFoundMsg}</div>}
    </div>
  );
} [cite: 110, 111, 112, 113, 116, 117, 118, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 133, 134, 135, 136, 137]
