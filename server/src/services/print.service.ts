import ExcelJS from "exceljs";
import QRCode from "qrcode";
import { generateTicketCredentials, listGuests } from "../repositories/guest.repository.js";

// Learn: the office print file. One row per guest: full name + QR image,
// A-Z by first name. The QR encodes the PUBLIC ticket URL (name + company
// on scan, no login), same links as the print sheet and future emails.
// exceljs is pure JavaScript (no native builds), so it installs and runs
// on Namecheap shared hosting just like the rest of this backend.

// Base URL for QR links: the public site guests' cameras reach.
const publicBase = (): string =>
  (process.env.PUBLIC_APP_URL || "http://localhost:5173").replace(/\/+$/, "");

export const buildGuestQrWorkbook = async (): Promise<Buffer> => {
  const guests = listGuests()
    // Every printed row must scan: backfill credentials for rows created
    // before tickets became automatic (idempotent for the rest).
    .map((guest) =>
      guest.ticket_number && guest.qr_token
        ? guest
        : (generateTicketCredentials(guest.id) ?? guest)
    )
    .sort((a, b) =>
      `${a.first_name} ${a.last_name}`.localeCompare(
        `${b.first_name} ${b.last_name}`,
        undefined,
        { sensitivity: "base" }
      )
    );

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Guest QR List");
  sheet.columns = [
    { header: "Full Name", key: "name", width: 34 },
    { header: "QR Code (scan for name + company)", key: "qr", width: 22 },
  ];

  for (const guest of guests) {
    const url = `${publicBase()}/ticket?token=${encodeURIComponent(guest.qr_token as string)}`;
    const png = await QRCode.toBuffer(url, { width: 140, margin: 1 });
    const rowNumber = sheet.rowCount + 1;
    sheet.addRow({ name: `${guest.first_name} ${guest.last_name}` });
    const imageId = workbook.addImage({ base64: png.toString("base64"), extension: "png" });
    sheet.addImage(imageId, {
      tl: { col: 1, row: rowNumber - 1 },
      ext: { width: 100, height: 100 },
    });
    sheet.getRow(rowNumber).height = 78;
  }

  sheet.getRow(1).height = 20;
  const out = await workbook.xlsx.writeBuffer();
  return Buffer.from(out as unknown as Uint8Array);
};
