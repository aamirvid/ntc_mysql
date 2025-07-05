import React, { useEffect, useState } from "react";
import api from "../../api";
import { formatDateIndian } from "../../utils/formatDate";

export default function PendingDeliveriesReport({ selectedYear }) {
  const [data, setData] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedYear) return;
    setLoading(true);
    setError("");
    setData([]);
    api.get(`/reports/pending?year=${selectedYear}`)
      .then(res => setData(res.data))
      .catch(() => setError("Could not load pending deliveries."))
      .finally(() => setLoading(false));
  }, [selectedYear]);

  if (error) return <div style={{ color: "red" }}>{error}</div>;

  return (
    <div style={{ maxWidth: 1200, margin: "40px auto", padding: 24, background: "#fff", borderRadius: 12 }}>
      <h2>Pending Deliveries – {selectedYear}</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
          <thead>
            <tr style={{ background: "#eee" }}>
              <th>#</th>
              <th>LR No</th>
              <th>Date</th>
              <th>From</th>
              <th>To</th>
              <th>Consignor</th>
              <th>Consignee</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", color: "#888" }}>Loading...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", color: "#888" }}>
                  No pending deliveries found for this year.
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr key={row.id || i}>
                  <td>{i + 1}</td>
                  <td>{row.lr_no}</td>
                  <td>{row.lr_date ? formatDateIndian(row.lr_date) : ""}</td>
                  <td>{row.from_city}</td>
                  <td>{row.to_city}</td>
                  <td>{row.consignor}</td>
                  <td>{row.consignee}</td>
                  <td>
                    <span style={{
                      display: "inline-block",
                      minWidth: 64,
                      padding: "2px 8px",
                      borderRadius: 8,
                      background: row.status === "Pending" ? "#fffae6" : "#e6f7ff",
                      color: row.status === "Pending" ? "#c96c00" : "#0b6fc2",
                      fontWeight: 500,
                      textAlign: "center"
                    }}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
