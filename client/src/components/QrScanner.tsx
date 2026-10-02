import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

// Learn: this component owns the CAMERA only. It reports a decoded string
// once, then stops itself - it never calls the API and never accredits.
// The parent (AccreditPage) decides what a scanned value means.

interface QrScannerProps {
  onScan: (value: string) => void;
  onError: (message: string) => void;
}

const SCANNER_REGION_ID = "texcellence-qr-reader";

const describeStartError = (err: unknown): string => {
  const name = err instanceof Error ? err.name : "";
  if (name === "NotAllowedError") {
    return "Camera permission was denied. Allow camera access and try again.";
  }
  if (name === "NotFoundError") {
    return "No camera was found on this device.";
  }
  return "Could not start the camera. Check the device and try again.";
};

export default function QrScanner({ onScan, onError }: QrScannerProps): JSX.Element {
  // Refs (not state): the scanner instance and "already reported" flag must
  // survive re-renders without triggering new renders or restarts.
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const reportedRef = useRef(false);
  const callbacksRef = useRef({ onScan, onError });
  callbacksRef.current = { onScan, onError };

  useEffect(() => {
    let cancelled = false;
    const scanner = new Html5Qrcode(SCANNER_REGION_ID);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          // First detection wins: stop the camera, then report exactly once.
          // The guard also swallows the rapid repeat callbacks scanners emit
          // while a code stays in frame.
          if (reportedRef.current) return;
          reportedRef.current = true;
          void scanner
            .stop()
            .catch(() => {
              // Already stopped or teardown raced us; the value still counts.
            })
            .then(() => {
              if (!cancelled) callbacksRef.current.onScan(decodedText);
            });
        },
        () => {
          // Per-frame "nothing found" noise - not an error, ignore it.
        }
      )
      .catch((err: unknown) => {
        if (!cancelled) callbacksRef.current.onError(describeStartError(err));
      });

    return () => {
      cancelled = true;
      const instance = scannerRef.current;
      scannerRef.current = null;
      // Best-effort shutdown: stop() rejects when already stopped, and
      // clear() removes the video element. Neither failure matters here.
      if (instance) {
        void instance
          .stop()
          .catch(() => undefined)
          .then(() => {
            try {
              instance.clear();
            } catch {
              // Element already gone - nothing to clean up.
            }
          });
      }
    };
  }, []);

  return (
    <div className="rounded bg-white p-4 shadow">
      <div id={SCANNER_REGION_ID} className="overflow-hidden rounded" />
      <p className="mt-2 text-center text-xs text-gray-500">Point the camera at the guest&apos;s QR code</p>
    </div>
  );
}
