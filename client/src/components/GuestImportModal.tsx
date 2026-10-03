import { useRef, useState } from "react";
import { importGuestsCsv } from "../api/guests.api.js";
import { ApiError, getErrorMessage } from "../api/client.js";
import type { CsvImportResult } from "../types/guest.types.js";
import { alertErrorCls, btnPrimary, btnSecondary } from "./ui.js";

// Learn: the file never leaves the browser unvalidated - the picked text
// is POSTed to the admin-only endpoint, which validates every row and
// reports per-row results. This modal only displays what came back.

interface GuestImportModalProps {
  onClose: () => void;
  onImported: (result: CsvImportResult) => void;
  onAuthExpired: () => void;
}

export default function GuestImportModal({ onClose, onImported, onAuthExpired }: GuestImportModalProps): JSX.Element {
  const [fileName, setFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handlePick = async (file: File | undefined): Promise<void> => {
    setError(null);
    setResult(null);
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please choose a .csv file.");
      return;
    }
    setFileName(file.name);
    try {
      setCsvText(await file.text());
    } catch {
      setError("Could not read the file. Try again.");
    }
  };

  const handleImport = async (): Promise<void> => {
    if (!csvText || loading) return;
    setLoading(true);
    setError(null);
    try {
      const outcome = await importGuestsCsv(csvText);
      setResult(outcome);
      onImported(outcome);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onAuthExpired();
        return;
      }
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-brand-deep/60 p-4">
      <section aria-labelledby="import-heading" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <h2 id="import-heading" className="text-lg font-bold text-slate-900">Import guests</h2>
        <p className="mt-1 text-sm text-slate-600">
          CSV with header: <span className="font-mono text-xs">first_name, last_name, email, phone, attendance_status</span> (yes/no).
          Existing emails are updated; tickets and accreditation are preserved.
        </p>

        <div className="mt-4">
          <label htmlFor="csv-file" className="block text-sm font-medium text-slate-700">CSV file</label>
          <input
            id="csv-file"
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => { void handlePick(e.target.files?.[0]); }}
            className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-50"
          />
          {fileName && <p className="mt-1 text-xs text-slate-500">Selected: {fileName}</p>}
        </div>

        {error && <p role="alert" className={`${alertErrorCls} mt-4`}>{error}</p>}

        {result && (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm" role="status">
            <p className="font-semibold text-slate-900">
              {result.processed} rows: {result.created} created, {result.updated} updated, {result.skipped} skipped.
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-red-700">
                {result.errors.map((e, i) => (
                  <li key={`${e.row}-${i}`}>Row {e.row}{e.email ? ` (${e.email})` : ""}: {e.message}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={loading} className={btnSecondary}>
            {result ? "Close" : "Cancel"}
          </button>
          {!result && (
            <button type="button" onClick={() => { void handleImport(); }} disabled={!csvText || loading} className={btnPrimary}>
              {loading ? "Importing..." : "Import"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
