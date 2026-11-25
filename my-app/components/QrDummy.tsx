"use client";

import { QRCodeSVG } from "qrcode.react";

export default function QrDummy({ seed }: { seed: string }) {
  return (
    <QRCodeSVG
      value={seed}
      className="qr-box h-full w-full"
      bgColor="#ffffff"
      fgColor="#000000"
      marginSize={2}
    />
  );
}