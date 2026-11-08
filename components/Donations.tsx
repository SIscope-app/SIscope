import QRCode from "qrcode";
import { DONATION_ADDRESSES, DONATION_COPY } from "@/lib/donations";
import { CopyButton } from "./CopyButton";

/** QR code as one SVG path. It encodes the address string exactly, with no URI scheme or amount. */
function Qr({ value, label }: { value: string; label: string }) {
  const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const q = 2; // quiet zone, in modules
  let d = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.modules.get(y, x)) d += `M${x + q} ${y + q}h1v1h-1z`;
  return (
    <svg className="qr" viewBox={`0 0 ${n + q * 2} ${n + q * 2}`} role="img" aria-label={`QR code for the ${label} address`} shapeRendering="crispEdges">
      <rect width="100%" height="100%" fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}

/** Footer section for voluntary donations. Renders nothing until addresses exist in lib/donations.ts. */
export function Donations() {
  if (DONATION_ADDRESSES.length === 0) return null;
  return (
    <section className="donate" aria-labelledby="donate-h">
      <div className="donate-head">
        <h2 id="donate-h">{DONATION_COPY.heading}</h2>
        <p>{DONATION_COPY.line}</p>
      </div>
      <ul className="donate-list">
        {DONATION_ADDRESSES.map((a) => (
          <li key={a.address} className="donate-item">
            <Qr value={a.address} label={a.label} />
            <div className="donate-body">
              <div className="donate-label">
                {a.label} <span>· {a.networks.join(", ")}{a.note ? ` (${a.note})` : ""} · {a.assets.join(", ")}</span>
              </div>
              <div className="donate-row">
                <code className="donate-addr">{a.address}</code>
                <CopyButton text={a.address} label={a.label} />
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="donate-small">{DONATION_COPY.smallPrint}</p>
    </section>
  );
}
