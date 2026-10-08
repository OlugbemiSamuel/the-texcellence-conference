import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

// Learn: this component owns the CAMERA only. It reports a decoded string
// once, then stops itself - it never calls the API and never accredits.
// The parent (AccreditPage) decides what a scanned value means.
//
// Lifecycle is tracked EXPLICITLY because html5-qrcode throws if stop()
// or clear() runs in the wrong state ("Cannot stop, scanner is not
// running"). Every transition below is guarded by the current phase, so
// permission denial, quick Stop taps, scan success, unmounts (including
// StrictMode remounts) and races between them are all safe.

interface QrScannerProps {
  onScan: (value: string) => void;
  onError: (message: string) => void;
}

type Phase = "idle" | "starting" | "running" | "stopping" | "stopped";

const SCANNER_REGION_ID = "texcellence-qr-reader";

const describeStartError = (err: unknown): string => {
  const name = err instanceof Error ? err.name : "";
  if (name === "NotAllowedError") {
    return "Camera permission was denied. Allow camera access and try again.";
  }
  if (name === "NotFoundError" || name === "OverconstrainedError") {
    return "No usable camera was found on this device.";
  }
  if (name === "NotReadableError") {
    return "The camera is already in use by another app or tab.";
  }
  return "Could not start the camera. Check the device and try again.";
};

export default function QrScanner({ onScan, onError }: QrScannerProps): JSX.Element {
  // Refs (not state): scanner instance, phase and flags must survive
  // re-renders and async callbacks without triggering restarts.
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const reportedRef = useRef(false);
  const aliveRef = useRef(true);
  const callbacksRef = useRef({ onScan, onError });
  callbacksRef.current = { onScan, onError };
  const [failed, setFailed] = useState(false);

  // Safe stop: only when actually running/paused. Resolves instead of
  // throwing when there is nothing to stop (already stopped, never
  // started, or torn down racing us).
  const stopSafely = async (): Promise<void> => {
    const instance = scannerRef.current;
    if (!instance || (phaseRef.current !== "running" && phaseRef.current !== "starting")) {
      return;
    }
    phaseRef.current = "stopping";
    try {
      await instance.stop();
    } catch {
      // Not running after all (start failed midway) - nothing to stop.
    } finally {
      if (phaseRef.current === "stopping") phaseRef.current = "stopped";
    }
  };

  // Safe clear: releases the video element only after a stop settled,
  // and never throws out of cleanup.
  const clearSafely = (): void => {
    const instance = scannerRef.current;
    scannerRef.current = null;
    if (!instance) return;
    try {
      instance.clear();
    } catch {
      // Element already gone or never rendered - nothing to clean up.
    }
  };

  useEffect(() => {
    aliveRef.current = true;
    reportedRef.current = false;
    // One instance per mount against this DOM element - never two.
    const scanner = new Html5Qrcode(SCANNER_REGION_ID);
    scannerRef.current = scanner;
    phaseRef.current = "starting";

    void scanner
      .start(
        { facingMode: "environment" },
        // Viewfinder scales with the screen (85% of the smaller side,
        // clamped): a full ticket QR fits on phones and on desktop.
        {
          fps: 10,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const side = Math.max(250, Math.min(400, Math.floor(Math.min(viewfinderWidth, viewfinderHeight) * 0.85)));
            return { width: side, height: side };
          },
        },
        (decodedText) => {
          // First detection wins: stop the camera, then report exactly once.
          // The reported flag also swallows the rapid repeat callbacks
          // scanners emit while a code stays in frame.
          if (reportedRef.current) return;
          reportedRef.current = true;
          void (async () => {
            await stopSafely();
            clearSafely();
            if (aliveRef.current) callbacksRef.current.onScan(decodedText);
          })();
        },
        () => {
          // Per-frame "nothing found" noise - not an error, ignore it.
        }
      )
      .then(() => {
        // start() resolved: the camera preview is now live.
        if (phaseRef.current === "starting") phaseRef.current = "running";
      })
      .catch((err: unknown) => {
        phaseRef.current = "stopped";
        clearSafely();
        if (aliveRef.current) {
          setFailed(true);
          callbacksRef.current.onError(describeStartError(err));
        }
      });

    return () => {
      // Unmount (incl. StrictMode remount): never leave the camera on.
      aliveRef.current = false;
      void (async () => {
        await stopSafely();
        clearSafely();
      })();
    };
    // Mount-only: callbacks travel via ref so effects never restart.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Explicit size: html5-qrcode renders its video into this box, and a
          zero-height container is exactly the "blank area" failure mode. */}
      <div id={SCANNER_REGION_ID} className="aspect-square max-h-[520px] min-h-[320px] w-full overflow-hidden rounded-lg bg-slate-900" />
      <p className="mt-3 text-center text-xs text-slate-500">
        {failed
          ? "Camera could not start - see the message above to retry."
          : "Point the camera at the guest's QR code. Scanning only identifies the guest - you still press Verify afterwards."}
      </p>
    </div>
  );
}
