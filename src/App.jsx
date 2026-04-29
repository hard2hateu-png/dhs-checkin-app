import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import jsQR from "jsqr";

const API_URL = "https://script.google.com/macros/s/AKfycbw9mRofEQdVmM-RS9c6awsFWSz2HLxywNjBCoyU9MWC_AAIxfQYyf57tRKjN6FYo4-Isw/exec";
const STAFF_PASSWORD = "delino2026";
const LOGO_URL = "/delino-logo.jpeg.png";
const SUBHEADING = "Hair Show 2026";

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
}));

function normalizeTicketId(value) {
  if (!value) return "";
  const raw = String(value).trim();

  try {
    const url = new URL(raw);
    const fromQuery = url.searchParams.get("ticket") || url.searchParams.get("ticket_id") || url.searchParams.get("id");
    if (fromQuery) return fromQuery.trim().toUpperCase();
    const matchFromPath = url.pathname.match(/DHS26-\d{3}/i);
    if (matchFromPath) return matchFromPath[0].toUpperCase();
  } catch {
    // Not a URL.
  }

  const match = raw.match(/DHS26-\d{3}/i);
  return match ? match[0].toUpperCase() : raw.toUpperCase();
}

function normalizeTicket(ticket) {
  return {
    ...ticket,
    ticket_id: normalizeTicketId(ticket?.ticket_id || ticket?.Ticket_ID || ""),
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
    throw new Error(text || "Server returned invalid JSON");
  }
}

async function apiGetTicket(ticketId) {
  const cleanId = normalizeTicketId(ticketId);
  const data = await fetchJson(`${API_URL}?ticket_id=${encodeURIComponent(cleanId)}`);
  if (!data.success) throw new Error(data.error || "Ticket not found");
  return normalizeTicket(data.ticket);
}

async function apiListTickets() {
  const data = await fetchJson(`${API_URL}?action=list`);
  if (!data.success) throw new Error(data.error || "Could not load tickets");
  return data.tickets.map(normalizeTicket);
}

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
  if (!data.success) throw new Error(data.error || "Undo check-in failed");
  return normalizeTicket(data.ticket);
}

function isRegistered(attendee) {
  return Boolean(
    attendee?.first_name ||
      attendee?.last_name ||
      attendee?.email ||
      attendee?.registered === true ||
      String(attendee?.registered).toUpperCase() === "YES" ||
      String(attendee?.registered).toUpperCase() === "TRUE"
  );
}

function isCheckedIn(attendee) {
  return Boolean(
    attendee?.checked_in === true ||
      attendee?.qr_scanned === 1 ||
      String(attendee?.qr_scanned).toUpperCase() === "TRUE"
  );
}

function roleBadge(role) {
  if (!role) return { bg: "#2a2a2a", text: "#888", label: "-" };
  const r = String(role).toUpperCase();
  if (r.includes("ESTILISTA")) return { bg: "#1a2f1a", text: "#4ade80", label: "ESTILISTA" };
  if (r.includes("PROPIETARIO")) return { bg: "#1a1f3a", text: "#60a5fa", label: "PROPIETARIO" };
  if (r.includes("ESTUDIANTE")) return { bg: "#2a1a2f", text: "#c084fc", label: "ESTUDIANTE" };
  return { bg: "#2a2a1a", text: "#fbbf24", label: role };
}

const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
);
const IconScan = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M8 12h8" /></svg>
);
const IconBack = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
);
const IconCheck = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
);
const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);
const IconUndo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
);

function GlobalHeader() {
  return (
    <div style={{ padding: "18px 20px 14px", background: "#0a0a0a", borderBottom: "1px solid #1a1a1a", textAlign: "center", flexShrink: 0 }}>
      <img src={LOGO_URL} alt="Delino" style={{ width: 150, height: "auto", display: "block", margin: "0 auto 6px" }} />
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, letterSpacing: 2, color: "#888" }}>{SUBHEADING}</div>
    </div>
  );
}

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
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } } });
        if (!active) return;
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setStatus("Apunta al código QR del ticket");
          scanFrame();
        }
      } catch {
        setStatus("No se pudo usar la cámara. Usa entrada manual.");
      }
    }
    startCamera();
    return () => stopCamera();
  }, [onScan]);

  function handleManual() {
    if (manualInput.trim()) onScan(normalizeTicketId(manualInput));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "#000" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", background: "#0d0d0d", borderBottom: "1px solid #1a1a1a" }}>
        <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", padding: 4, display: "flex" }}><IconBack /></button>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700, color: "#fff", letterSpacing: 1 }}>ESCANEAR TICKET</span>
      </div>
      <div style={{ position: "relative", flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", maxHeight: 380 }}>
        <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} playsInline muted />
        <canvas ref={canvasRef} style={{ display: "none" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ position: "relative", width: 220, height: 220 }}>
            {[["top", "left"], ["top", "right"], ["bottom", "left"], ["bottom", "right"]].map(([v, h]) => (
              <div key={`${v}-${h}`} style={{ position: "absolute", [v]: 0, [h]: 0, width: 36, height: 36, borderTop: v === "top" ? "3px solid #00ff88" : "none", borderBottom: v === "bottom" ? "3px solid #00ff88" : "none", borderLeft: h === "left" ? "3px solid #00ff88" : "none", borderRight: h === "right" ? "3px solid #00ff88" : "none" }} />
            ))}
            <div style={{ position: "absolute", left: 8, right: 8, top: "40%", height: 2, background: "linear-gradient(90deg, transparent, #00ff88, transparent)", animation: "scanLine 1.5s ease-in-out infinite" }} />
          </div>
        </div>
        <style>{`@keyframes scanLine { 0%,100%{opacity:0;transform:translateY(-30px)} 50%{opacity:1;transform:translateY(30px)} }`}</style>
      </div>
      <div style={{ textAlign: "center", padding: "12px 20px", color: "#aaa", fontFamily: "'Space Mono', monospace", fontSize: 13 }}>{status}</div>
      <div style={{ padding: "12px 20px 28px", borderTop: "1px solid #1a1a1a" }}>
        <div style={{ marginBottom: 8, color: "#666", fontFamily: "'Space Mono', monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>Entrada manual</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={manualInput} onChange={(e) => setManualInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleManual()} placeholder="DHS26-001" style={{ flex: 1, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "13px 16px", color: "#fff", fontFamily: "'Space Mono', monospace", fontSize: 16, outline: "none" }} />
          <button type="button" onClick={handleManual} style={{ background: "#00ff88", color: "#000", border: "none", borderRadius: 10, padding: "13px 20px", fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>IR -&gt;</button>
        </div>
      </div>
    </div>
  );
}

const labelStyle = { display: "block", color: "#777", fontFamily: "'Space Mono', monospace", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, margin: "14px 0 6px" };
const inputStyle = { width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 12, padding: "14px 16px", color: "#fff", fontSize: 16, boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif", outline: "none" };

function FormInput({ label, value, onChange, required, type = "text" }) {
  return <><label style={labelStyle}>{label}{required ? " *" : ""}</label><input type={type} value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} /></>;
}

function RegistrationDirections() {
  return (
    <div style={{ background: "#111", border: "1px solid rgba(251, 191, 36, 0.35)", borderRadius: 16, padding: "18px 20px", marginBottom: 22 }}>
      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 8 }}>Instrucciones</div>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, lineHeight: 1.45, color: "#ddd" }}>Por favor completa todos los campos requeridos. Verifica que tu información esté correcta antes de enviar.<br />Solo podrás editar y enviar este registro.</div>
    </div>
  );
}

function RegistrationForm({ ticketId, initial, onSubmit, onCancel, saving, publicMode = false }) {
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

  useEffect(() => {
    setForm({
      ticket_id: ticketId,
      first_name: initial?.first_name || "",
      last_name: initial?.last_name || "",
      job_role: initial?.job_role || "",
      cosmetology_license: initial?.cosmetology_license || "",
      phone: initial?.phone || "",
      email: initial?.email || "",
      vendor_rep: initial?.vendor_rep || "",
    });
  }, [ticketId, initial]);

  function update(key, value) { setForm((prev) => ({ ...prev, [key]: value })); }
  const canSubmit = publicMode
    ? form.first_name && form.last_name && form.phone && form.email && !saving
    : !saving;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "#0a0a0a", minHeight: 0 }}>
      <div style={{ padding: "16px 20px", background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        {!publicMode && <button type="button" onClick={onCancel} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", padding: 4, display: "flex" }}><IconBack /></button>}
        <div><div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700, color: "#fff" }}>REGISTRO</div><div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#fbbf24", marginTop: 2 }}>{ticketId}</div></div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 128px" }}>
        <RegistrationDirections />
        <FormInput label="Nombre" value={form.first_name} onChange={(v) => update("first_name", v)} required />
        <FormInput label="Apellido" value={form.last_name} onChange={(v) => update("last_name", v)} required />
        <label style={labelStyle}>Puesto de trabajo *</label>
        <select value={form.job_role} onChange={(e) => update("job_role", e.target.value)} style={inputStyle}>
          <option value="">Seleccione...</option><option value="ESTILISTA">ESTILISTA</option><option value="PROPIETARIO DE SALON DE BELLEZA">PROPIETARIO DE SALON DE BELLEZA</option><option value="ESTUDIANTE">ESTUDIANTE</option>
        </select>
        <FormInput label="Licencia de cosmetologia" value={form.cosmetology_license} onChange={(v) => update("cosmetology_license", v)} />
        <FormInput label="Telefono" value={form.phone} onChange={(v) => update("phone", v)} required type="tel" />
        <FormInput label="Correo electronico" value={form.email} onChange={(v) => update("email", v)} required type="email" />
        <FormInput label="Vendedor / Representante" value={form.vendor_rep} onChange={(v) => update("vendor_rep", v)} />
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "12px 20px 22px", background: "linear-gradient(transparent, #0a0a0a 40%)" }}>
        <button type="button" disabled={!canSubmit} onClick={() => onSubmit(form)} style={{ width: "100%", background: !canSubmit ? "#1a1a1a" : "#fbbf24", color: !canSubmit ? "#444" : "#000", border: "none", borderRadius: 14, padding: 15, fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 16, cursor: canSubmit ? "pointer" : "not-allowed", transition: "background 0.2s", letterSpacing: 0.5 }}>{saving ? "GUARDANDO..." : "GUARDAR REGISTRO"}</button>
      </div>
    </div>
  );
}

function PublicTicketInfoCard({ attendee }) {
  const name = [attendee?.first_name, attendee?.last_name].filter(Boolean).join(" ") || "Sin nombre";
  const badge = roleBadge(attendee?.job_role);
  function Field({ label, value }) {
    if (!value) return null;
    return <div style={{ marginBottom: 14 }}><div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>{label}</div><div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: "#ddd" }}>{value}</div></div>;
  }
  return (
    <>
      <div style={{ background: "#111", borderRadius: 16, padding: "20px", marginBottom: 16, border: "1px solid #1e1e1e" }}>
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ width: 48, height: 48, background: "#1a1a1a", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "#555", flexShrink: 0 }}><IconUser /></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>{name}</div>
            {attendee?.job_role && <span style={{ display: "inline-block", marginTop: 8, background: badge.bg, color: badge.text, fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6 }}>{badge.label}</span>}
          </div>
        </div>
      </div>
      <div style={{ background: "#111", borderRadius: 16, padding: "20px", marginBottom: 16, border: "1px solid #1e1e1e" }}>
        <Field label="Ticket ID" value={attendee?.ticket_id} />
        <Field label="Licencia de cosmetologia" value={attendee?.cosmetology_license} />
        <Field label="Telefono" value={attendee?.phone} />
        <Field label="Email" value={attendee?.email} />
        <Field label="Vendedor / Representante" value={attendee?.vendor_rep} />
      </div>
    </>
  );
}

function PublicRegistrationSuccess({ ticketId, attendee, onEdit }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, background: "#0a0a0a", minHeight: 0 }}>
      <div style={{ padding: "16px 20px", background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", flexShrink: 0 }}>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700, color: "#fff" }}>REGISTRO COMPLETO</div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#fbbf24", marginTop: 2 }}>{ticketId}</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 140px" }}>
        <div style={{ background: "#0a1f0a", border: "1px solid #1a3a1a", borderRadius: 16, padding: "18px 20px", marginBottom: 16 }}>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 17, fontWeight: 700, color: "#00ff88", marginBottom: 6 }}>Gracias por registrarte</div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, lineHeight: 1.45, color: "#ddd" }}>Tu información fue guardada correctamente. Presenta este ticket al llegar al evento.</div>
        </div>
        {attendee && <PublicTicketInfoCard attendee={attendee} />}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 20px 28px", background: "linear-gradient(transparent, #0a0a0a 40%)" }}>
        <button type="button" onClick={onEdit} style={{ width: "100%", background: "#222", color: "#fff", border: "1px solid #333", borderRadius: 16, padding: 16, fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>EDITAR REGISTRO</button>
      </div>
    </div>
  );
}

function AttendeeList({ attendees, onSelect, onScanNav, loading }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    if (!query) return attendees;
    const q = query.toLowerCase();
    return attendees.filter((a) => a.ticket_id?.toLowerCase().includes(q) || (a.first_name || "").toLowerCase().includes(q) || (a.last_name || "").toLowerCase().includes(q) || (a.email || "").toLowerCase().includes(q));
  }, [attendees, query]);
  const totalChecked = attendees.filter(isCheckedIn).length;
  const totalRegistered = attendees.filter(isRegistered).length;
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ padding: "20px 20px 0", background: "#0d0d0d" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div><div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700, color: "#fff" }}>DHS 2026</div><div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#555", marginTop: 3 }}>{loading ? "Cargando..." : `${totalChecked} check-ins · ${totalRegistered} registrados · ${attendees.length} tickets`}</div></div>
          <button type="button" onClick={onScanNav} style={{ background: "#00ff88", color: "#000", border: "none", borderRadius: 12, padding: "12px 18px", display: "flex", alignItems: "center", gap: 8, fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 14, cursor: "pointer" }}><IconScan /> SCAN</button>
        </div>
        <div style={{ height: 3, background: "#1a1a1a", borderRadius: 2, marginBottom: 14 }}><div style={{ height: "100%", width: `${attendees.length ? (totalChecked / attendees.length) * 100 : 0}%`, background: "#00ff88", borderRadius: 2, transition: "width 0.4s" }} /></div>
        <div style={{ position: "relative", marginBottom: 16 }}><div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#555" }}><IconSearch /></div><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por ticket, nombre o email..." style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, padding: "13px 16px 13px 44px", color: "#fff", fontFamily: "'Space Mono', monospace", fontSize: 14, outline: "none", boxSizing: "border-box" }} /></div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 100px" }}>
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: "48px 0", color: "#444", fontFamily: "'Space Mono', monospace" }}>Sin resultados para "{query}"</div>}
        {filtered.map((a) => {
          const checked = isCheckedIn(a); const registered = isRegistered(a); const name = [a.first_name, a.last_name].filter(Boolean).join(" "); const badge = roleBadge(a.job_role);
          return <button type="button" key={a.ticket_id} onClick={() => onSelect(a.ticket_id)} style={{ width: "100%", background: "#111", border: `1px solid ${checked ? "#1a3a1a" : registered ? "#252520" : "#2a1a1a"}`, borderRadius: 14, padding: "16px 18px", marginBottom: 10, display: "flex", alignItems: "center", gap: 14, cursor: "pointer", textAlign: "left", position: "relative", overflow: "hidden" }}><div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, background: checked ? "#00ff88" : registered ? "#fbbf24" : "#ff4444" }} /><div style={{ flex: 1, minWidth: 0 }}><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}><span style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: "#fff" }}>{a.ticket_id}</span>{a.job_role && <span style={{ background: badge.bg, color: badge.text, fontFamily: "'Space Mono', monospace", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4 }}>{badge.label}</span>}</div><div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: registered ? "#aaa" : "#ff7777" }}>{registered ? name || a.email || "-" : "No registrado"}</div>{a.email && registered && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#555", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.email}</div>}</div><div style={{ width: 32, height: 32, background: checked ? "#00ff88" : "#1a1a1a", borderRadius: "50%", border: checked ? "none" : "1px solid #2a2a2a", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#000" }}>{checked && <IconCheck />}</div></button>;
        })}
      </div>
    </div>
  );
}

function AttendeeDetail({ attendee, onCheckIn, onUndoCheckIn, onRegister, onBack, saving }) {
  const checked = isCheckedIn(attendee); const registered = isRegistered(attendee); const name = [attendee.first_name, attendee.last_name].filter(Boolean).join(" ") || "Sin nombre"; const badge = roleBadge(attendee.job_role);
  function Field({ label, value }) { if (!value) return null; return <div style={{ marginBottom: 14 }}><div style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4 }}>{label}</div><div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: "#ddd" }}>{value}</div></div>; }
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ padding: "16px 20px", background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", gap: 14 }}><button type="button" onClick={onBack} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", padding: 4, display: "flex" }}><IconBack /></button><div><div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700, color: "#fff" }}>{attendee.ticket_id}</div><div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: checked ? "#00ff88" : registered ? "#fbbf24" : "#ff7777" }}>{checked ? "✓ Check-in completo" : registered ? "Registrado · pendiente check-in" : "No registrado"}</div></div></div>
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 140px" }}>
        <div style={{ background: "#111", borderRadius: 16, padding: "20px", marginBottom: 16, border: "1px solid #1e1e1e" }}><div style={{ display: "flex", gap: 14 }}><div style={{ width: 48, height: 48, background: "#1a1a1a", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "#555", flexShrink: 0 }}><IconUser /></div><div style={{ flex: 1 }}><div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 22, fontWeight: 700, color: registered ? "#fff" : "#ff7777", lineHeight: 1.2 }}>{registered ? name : "No registrado"}</div>{attendee.job_role && <span style={{ display: "inline-block", marginTop: 8, background: badge.bg, color: badge.text, fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6 }}>{badge.label}</span>}</div></div></div>
        <div style={{ background: "#111", borderRadius: 16, padding: "20px", marginBottom: 16, border: "1px solid #1e1e1e" }}><Field label="Ticket ID" value={attendee.ticket_id} /><Field label="Licencia de cosmetologia" value={attendee.cosmetology_license} /><Field label="Telefono" value={attendee.phone} /><Field label="Email" value={attendee.email} /><Field label="Vendedor / Representante" value={attendee.vendor_rep} />{!registered && <div style={{ color: "#ff7777", fontFamily: "'Space Mono', monospace", fontSize: 12 }}>Este ticket aun no tiene informacion de registro.</div>}</div>
        {checked && <div style={{ background: "#0a1f0a", border: "1px solid #1a3a1a", borderRadius: 16, padding: "18px 20px" }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><div style={{ width: 40, height: 40, background: "#00ff88", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#000" }}><IconCheck /></div><div style={{ flex: 1 }}><div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, color: "#00ff88", fontSize: 15 }}>Ya hizo check-in</div>{attendee.check_in_time && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#4ade80", marginTop: 3 }}>{String(attendee.check_in_time)}</div>}</div><button type="button" onClick={() => onUndoCheckIn(attendee.ticket_id)} disabled={saving} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: 8, color: "#ff4444", cursor: "pointer", display: "flex" }} title="Deshacer check-in"><IconUndo /></button></div></div>}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "16px 20px 28px", background: "linear-gradient(transparent, #0a0a0a 40%)" }}>{registered && <button type="button" onClick={() => onRegister(attendee.ticket_id)} style={{ width: "100%", background: "#222", color: "#fff", border: "1px solid #333", borderRadius: 16, padding: 16, fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 15, cursor: "pointer", marginBottom: 10, letterSpacing: 0.5 }}>EDITAR REGISTRO</button>}{!registered && <button type="button" onClick={() => onRegister(attendee.ticket_id)} style={{ width: "100%", background: "#fbbf24", color: "#000", border: "none", borderRadius: 16, padding: 18, fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 16, cursor: "pointer", marginBottom: 10, letterSpacing: 0.5 }}>REGISTRAR TICKET</button>}{registered && !checked && <button type="button" disabled={saving} onClick={() => onCheckIn(attendee.ticket_id)} style={{ width: "100%", background: saving ? "#1a1a1a" : "#00ff88", color: saving ? "#444" : "#000", border: "none", borderRadius: 16, padding: 20, fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 18, cursor: saving ? "not-allowed" : "pointer", letterSpacing: 1 }}>{saving ? "GUARDANDO..." : "HACER CHECK-IN"}</button>}</div>
    </div>
  );
}

function StaffPasswordScreen({ onUnlock }) {
  const [password, setPassword] = useState(""); const [error, setError] = useState("");
  function handleSubmit(e) { e.preventDefault(); if (password === STAFF_PASSWORD) { sessionStorage.setItem("dhs_staff_unlocked", "true"); setError(""); onUnlock(); return; } setError("Contraseña incorrecta"); }
  return <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, background: "#0a0a0a", padding: "24px 20px", justifyContent: "center" }}><div style={{ fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 6 }}>ACCESO STAFF</div><div style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#666", marginBottom: 18 }}>Ingresa la contraseña para ver check-in, scanner y lista de tickets.</div><label style={labelStyle}>Contraseña</label><input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} style={inputStyle} autoFocus />{error && <div style={{ marginTop: 12, color: "#ff7777", fontFamily: "'Space Mono', monospace", fontSize: 12 }}>{error}</div>}<button type="submit" style={{ width: "100%", background: "#00ff88", color: "#000", border: "none", borderRadius: 16, padding: 18, fontFamily: "'Space Mono', monospace", fontWeight: 700, fontSize: 16, cursor: "pointer", marginTop: 18, letterSpacing: 0.5 }}>ENTRAR</button></form>;
}

export default function App() {
  const urlTicketId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return normalizeTicketId(params.get("ticket") || params.get("ticket_id") || params.get("id") || "");
  }, []);
  const isPublicTicketMode = Boolean(urlTicketId);
  const [staffUnlocked, setStaffUnlocked] = useState(() => isPublicTicketMode ? false : sessionStorage.getItem("dhs_staff_unlocked") === "true");
  const [screen, setScreen] = useState(isPublicTicketMode ? "register" : "list");
  const [attendees, setAttendees] = useState(FALLBACK_ATTENDEES);
  const [selectedId, setSelectedId] = useState(isPublicTicketMode ? urlTicketId : null);
  const [notFoundMsg, setNotFoundMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publicRegistered, setPublicRegistered] = useState(false);
  const selectedAttendee = useMemo(() => attendees.find((a) => a.ticket_id === selectedId), [attendees, selectedId]);
  const publicTicketAlreadyRegistered = Boolean(isPublicTicketMode && selectedAttendee && isRegistered(selectedAttendee));

  const upsertAttendee = useCallback((ticket) => {
    setAttendees((prev) => {
      const clean = normalizeTicket(ticket);
      const exists = prev.some((a) => a.ticket_id === clean.ticket_id);
      if (!exists) return [...prev, clean].sort((a, b) => a.ticket_id.localeCompare(b.ticket_id));
      return prev.map((a) => (a.ticket_id === clean.ticket_id ? { ...a, ...clean } : a));
    });
  }, []);

  function showError(msg, ms = 3000) { setNotFoundMsg(msg); window.setTimeout(() => setNotFoundMsg(""), ms); }

  const handleSelect = useCallback(async (ticketId) => {
    const cleanId = normalizeTicketId(ticketId);
    setNotFoundMsg("");
    setSelectedId(cleanId);
    setScreen(isPublicTicketMode ? "register" : "detail");
    try {
      const ticket = await apiGetTicket(cleanId);
      upsertAttendee(ticket);
      if (isPublicTicketMode && isRegistered(ticket)) setPublicRegistered(true);
    } catch {
      if (isPublicTicketMode) setPublicRegistered(false);
      showError(`${cleanId} - no encontrado en la hoja`);
    }
  }, [isPublicTicketMode, upsertAttendee]);

  async function refreshList() {
    if (isPublicTicketMode || !staffUnlocked) return;
    setLoading(true);
    try { const rows = await apiListTickets(); setAttendees(rows.map(normalizeTicket)); } catch { } finally { setLoading(false); }
  }

  useEffect(() => {
    if (isPublicTicketMode) { setSelectedId(urlTicketId); setScreen("register"); handleSelect(urlTicketId); return; }
    if (staffUnlocked) refreshList();
  }, [handleSelect, isPublicTicketMode, staffUnlocked, urlTicketId]);

  async function handleCheckIn(ticketId) { if (isPublicTicketMode || !staffUnlocked) return; setSaving(true); try { const updated = await apiCheckInTicket(ticketId); upsertAttendee(updated); } catch (err) { showError(err.message || "No se pudo hacer check-in"); } finally { setSaving(false); } }
  async function handleUndoCheckIn(ticketId) { if (isPublicTicketMode || !staffUnlocked) return; if (!window.confirm("¿Anular el check-in de este ticket?")) return; setSaving(true); try { const updated = await apiUndoCheckInTicket(ticketId); upsertAttendee(updated); } catch (err) { showError(err.message || "No se pudo anular el check-in"); } finally { setSaving(false); } }
  function handleRegisterStart(ticketId) { const cleanId = normalizeTicketId(ticketId); if (isPublicTicketMode && cleanId !== urlTicketId) return; setSelectedId(cleanId); setPublicRegistered(false); setScreen("register"); }
  async function handleRegisterSubmit(formData) {
    const cleanId = normalizeTicketId(formData.ticket_id);
    if (isPublicTicketMode && cleanId !== urlTicketId) { showError("Solo puedes editar este ticket"); return; }
    setSaving(true);
    try {
      const updated = await apiRegisterTicket({ ...formData, ticket_id: isPublicTicketMode ? urlTicketId : cleanId });
      upsertAttendee(updated);
      if (isPublicTicketMode) setPublicRegistered(true); else { setScreen("detail"); refreshList(); }
    } catch (err) { showError(err.message || "Error al registrar"); } finally { setSaving(false); }
  }

  const showStaffApp = !isPublicTicketMode && staffUnlocked;
  const showPasswordScreen = !isPublicTicketMode && !staffUnlocked;
  const showPublicSuccess = isPublicTicketMode && (publicRegistered || publicTicketAlreadyRegistered);
  const showPublicForm = isPublicTicketMode && !publicRegistered && !publicTicketAlreadyRegistered;

  return (
    <>
      <style>{`html,body,#root{margin:0;padding:0;width:100%;min-height:100%;background:#0a0a0a;overflow-x:hidden} body{overscroll-behavior:none} *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}`}</style>
      <div style={{ background: "#0a0a0a", minHeight: "100dvh", height: "100dvh", width: "100vw", maxWidth: 480, margin: "0 auto", position: "relative", display: "flex", flexDirection: "column", color: "#fff", overflow: "hidden" }}>
        <GlobalHeader />
        {showPasswordScreen && <StaffPasswordScreen onUnlock={() => setStaffUnlocked(true)} />}
        {showStaffApp && screen === "list" && <AttendeeList attendees={attendees} loading={loading} onSelect={handleSelect} onScanNav={() => setScreen("scan")} />}
        {showStaffApp && screen === "scan" && <QRScanner onScan={(id) => handleSelect(id)} onClose={() => { setScreen("list"); refreshList(); }} />}
        {showStaffApp && screen === "detail" && selectedAttendee && <AttendeeDetail attendee={selectedAttendee} saving={saving} onBack={() => { setScreen("list"); refreshList(); }} onCheckIn={handleCheckIn} onUndoCheckIn={handleUndoCheckIn} onRegister={handleRegisterStart} />}
        {showPublicSuccess && <PublicRegistrationSuccess ticketId={selectedId} attendee={selectedAttendee} onEdit={() => setPublicRegistered(false)} />}
        {(showStaffApp || showPublicForm) && screen === "register" && <RegistrationForm ticketId={selectedId} initial={selectedAttendee} saving={saving} publicMode={isPublicTicketMode} onSubmit={handleRegisterSubmit} onCancel={() => { if (!isPublicTicketMode) setScreen("detail"); }} />}
        {notFoundMsg && <div style={{ position: "absolute", bottom: 100, left: 20, right: 20, background: notFoundMsg === "Registro guardado" ? "#00ff88" : "#ff4444", color: notFoundMsg === "Registro guardado" ? "#000" : "#fff", padding: "12px 20px", borderRadius: 12, textAlign: "center", fontFamily: "'Space Mono', monospace", fontSize: 13, zIndex: 1000, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>{notFoundMsg}</div>}
      </div>
    </>
  );
}
