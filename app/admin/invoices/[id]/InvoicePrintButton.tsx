'use client';

export default function InvoicePrintButton() {
  return (
    <button className="adminPrimaryBtn invoicePrintBtn" type="button" onClick={() => window.print()}>
      Download / Save PDF ↓
    </button>
  );
}
