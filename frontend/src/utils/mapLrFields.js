// src/utils/mapLrFields.js
export function mapLrFields(lr) {
  // Accepts any LR data from API or form and guarantees all fields for the table
  return {
    id: lr.id || lr.lr_id || lr._id || "",
    lrNo: lr.lrNo || lr.lr_no || "",
    lrDate: lr.lrDate || lr.lr_date || "",
    from: lr.from || lr.from_city || "",
    to: lr.to || lr.to_city || "",
    consignor: lr.consignor || "",
    consignee: lr.consignee || "",
    pkgs: lr.pkgs || "",
    content: lr.content || "",
    freightType: lr.freightType || lr.freight_type || "Topay",
    freight: lr.freight || "",
    weight: lr.weight || "",
    ddRate: lr.ddRate || lr.dd_rate || "",
    ddTotal: lr.ddTotal || lr.dd_total || "",
    pmNo: lr.pmNo || lr.pm_no || "",
    refund: lr.refund || "",
    remarks: lr.remarks || "",
    status: lr.status || "",
    hamali: lr.hamali || "",
    bc: lr.bc || "",
    landing: lr.landing || "",
    lc: lr.lc || "",
    cashMemoNo: lr.cashMemoNo || lr.cash_memo_no || "",
    cashMemoTotal: lr.cashMemoTotal || "",
  };
}
