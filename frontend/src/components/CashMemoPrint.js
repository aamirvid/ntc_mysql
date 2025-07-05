import React, { useEffect } from "react";
import QRCode from "qrcode";

function CashMemoPrint(props) {
  const { cashMemo, lr, memo, user, onAfterPrint } = props;

  useEffect(() => {
    console.log("CashMemoPrint MOUNTED", cashMemo, lr, user);

    // Robust: accept either username string or user object
    let username = "";
    if (typeof user === "object" && user !== null) {
      username = user.username || "Unknown";
    } else if (typeof user === "string") {
      username = user;
    } else {
      username = "Unknown";
    }

    const qrValue = lr?.lr_no || "";
    const today = new Date().toLocaleDateString();

    const trueTotal = (
      (parseFloat(cashMemo.hamali) || 0) +
      (parseFloat(cashMemo.bc) || 0) +
      (parseFloat(cashMemo.landing) || 0) +
      (parseFloat(cashMemo.lc) || 0) +
      (lr?.freight_type === "Topay" ? (parseFloat(lr.freight) || 0) : 0)
    ).toFixed(2);

    if (!qrValue) return;

    QRCode.toDataURL(qrValue, { width: 128 }, (err, url) => {
      if (err) {
        alert("QR code generation failed!");
        if (onAfterPrint) onAfterPrint();
        return;
      }

      const safe = (val) => (val == null ? "" : val);

      // HTML for 2 slips side by side
      const htmlString = `
        <div style="display:flex;flex-direction:row;gap:32px;padding:32px;background:white;">
          ${[1, 2].map(
            () => `
              <div style="border:1px dashed #888;padding:16px;width:340px;box-sizing:border-box;">
                <div style="font-size:18px;margin-bottom:12px;">Cash Memo No: <b>${safe(cashMemo.cash_memo_no)}</b></div>
                <div style="font-size:14px;margin-bottom:6px;">Date: ${today}</div>
                <div style="font-size:16px;"><b>LR No:</b> ${safe(lr.lr_no)}</div>
                <div><b>Pkgs:</b> ${safe(lr.pkgs)}</div>
                <div><b>PM No:</b> ${safe(lr.pm_no)}</div>
                <div><b>Truck No:</b> ${safe(memo.truck_no)}</div>
                <div><b>Consignee:</b> ${safe(lr.consignee)}</div>
                <div><b>Consignor:</b> ${safe(lr.consignor)}</div>
                <div><b>Freight:</b> ${
                  safe(lr.freight_type) === "Topay"
                    ? "₹" + safe(lr.freight)
                    : safe(lr.freight_type)
                }</div>
                <div><b>Hamali:</b> ${safe(cashMemo.hamali)}</div>
                <div><b>BC:</b> ${safe(cashMemo.bc)}</div>
                <div><b>Landing:</b> ${safe(cashMemo.landing)}</div>
                <div><b>LC:</b> ${safe(cashMemo.lc)}</div>
                <div><b>Total:</b> ₹${trueTotal}</div>
                <div><b>User:</b> ${safe(username)}</div>
                <div style="margin-top:12px;text-align:center;">
                  <img src="${url}" alt="QR Code" style="width:64px;height:64px;" />
                </div>
              </div>
            `
          ).join("")}
        </div>
      `;

      // Always open a new print window (unique each time!)
      const printWindow = window.open("", "_blank", `width=800,height=600,left=200,top=100,popup_${Date.now()}`);
      if (!printWindow) {
        alert("Pop-up was blocked. Please allow pop-ups for printing.");
        if (onAfterPrint) onAfterPrint();
        return;
      }
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Content</title>
          </head>
          <body>
            ${htmlString}
          </body>
        </html>
      `);
      printWindow.document.close();

      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
        if (onAfterPrint) onAfterPrint();
      };
    });
    // eslint-disable-next-line
  }, [cashMemo, lr, memo, user]);

  return null;
}

export default CashMemoPrint;
