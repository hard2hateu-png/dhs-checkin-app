import { useEffect, useRef, useState } from "react";

const API_URL =
  "https://script.google.com/macros/s/AKfycbw9mRofEQdVmM-RS9c6awsFWSz2HLxywNjBCoyU9MWC_AAIxfQYyf57tRKjN6FYo4-Isw/exec";

function normalizeTicketId(value) {
  if (!value) return "";
  const match = String(value).match(/DHS26-\d{3}/i);
  return match ? match[0].toUpperCase() : value;
}

// ✅ API
async function apiCheckIn(ticketId) {
  const res = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      action: "check_in",
      ticket_id: normalizeTicketId(ticketId),
    }),
  });
  const data = await res.json();
  if (!data.success) throw new Error("Check-in failed");
  return data.ticket;
}

// ✅ SCANNER (FIXED)
function Scanner({ onScan }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const [status, setStatus] = useState("Starting camera...");
  const [manual, setManual] = useState("");

  useEffect(() => {
    let active = true;

    const stop = () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        if (!active) return;

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        setStatus("Point camera at QR");

        // iPhone + modern browsers
        const detector =
          "BarcodeDetector" in window
            ? new BarcodeDetector({ formats: ["qr_code"] })
            : null;

        if (!detector) {
          setStatus("Scanner not supported → use manual input");
          return;
        }

        const scan = async () => {
          if (!active) return;

          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length > 0) {
              stop();
              onScan(normalizeTicketId(codes[0].rawValue));
              return;
            }
          } catch {}

          rafRef.current = requestAnimationFrame(scan);
        };

        scan();
      } catch {
        setStatus("Camera blocked → use manual input");
      }
    }

    start();
    return stop;
  }, [onScan]);

  return (
    <div style={{ padding: 20 }}>
      <video
        ref={videoRef}
        style={{ width: "100%", borderRadius: 12 }}
        playsInline
        muted
      />

      <p>{status}</p>

      <input
        placeholder="DHS26-001"
        value={manual}
        onChange={(e) => setManual(e.target.value)}
        style={{ width: "100%", padding: 10, marginTop: 10 }}
      />

      <button
        onClick={() => onScan(normalizeTicketId(manual))}
        style={{ width: "100%", marginTop: 10 }}
      >
        ENTER MANUALLY
      </button>
    </div>
  );
}

// ✅ MAIN APP (simple + reliable)
export default function App() {
  const [lastScan, setLastScan] = useState("");

  async function handleScan(ticketId) {
    setLastScan(ticketId);

    try {
      await apiCheckIn(ticketId);
      alert(`✅ Checked in: ${ticketId}`);
    } catch {
      alert(`❌ Not found: ${ticketId}`);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "0 auto" }}>
      <h2>DHS Check-In</h2>

      <Scanner onScan={handleScan} />

      {lastScan && (
        <p>
          Last scanned: <b>{lastScan}</b>
        </p>
      )}
    </div>
  );
}
