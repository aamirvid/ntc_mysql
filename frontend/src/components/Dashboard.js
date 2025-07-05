import React, { useEffect, useState } from "react";
import api from "../api";
import { getUserRole } from "../auth";
import { Box, Typography, Divider } from "@mui/material";
import { Link } from "react-router-dom";
import AssignmentIcon from "@mui/icons-material/Assignment";
import ListAltIcon from "@mui/icons-material/ListAlt";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import ReportIcon from "@mui/icons-material/Report";
import DirectionsBusIcon from "@mui/icons-material/DirectionsBus";
import TodayIcon from "@mui/icons-material/Today";
import ReceiptIcon from "@mui/icons-material/ReceiptLong";
import InfoIcon from "@mui/icons-material/Info";
import PersonIcon from "@mui/icons-material/Person";
import "./Dashboard.css";
import { BoxIcon, DoorOpenIcon, GlassesIcon, StoreIcon } from "lucide-react";
import { DoorBack } from "@mui/icons-material";

const actionIcons = [
  {
    icon: <AssignmentIcon />,
    label: "New Memo",
    to: "/entry",
    color: "icon-bg-blue",
  },
  {
    icon: <ListAltIcon />,
    label: "Memo List",
    to: "/memos",
    color: "icon-bg-purple",
  },
  {
    icon: <LocalShippingIcon />,
    label: "Delivery",
    to: "/deliveries",
    color: "icon-bg-orange",
  },
];

const reportIcons = [
  {
    icon: <StoreIcon />,
    label: "Door Delivery Report",
    to: "/reports/door-delivery",
    color: "icon-bg-green",
  },
  {
    icon: <DirectionsBusIcon />,
    label: "Truck Report",
    to: "/reports/truck",
    color: "icon-bg-blue",
  },
  {
    icon: <GlassesIcon />,
    label: "Search LR",
    to: "/reports/lr-search",
    color: "icon-bg-green",
  },
  {
    icon: <BoxIcon />,
    label: "Undelivered",
    to: "/reports/undelivered",
    color: "icon-bg-green",
  },
  {
    icon: <BoxIcon />,
    label: "Monthly Report",
    to: "/reports/MonthlyReport",
    color: "icon-bg-green",
  },
  {
    icon: <BoxIcon />,
    label: "Refund Report",
    to: "/reports/RefundReport",
    color: "icon-bg-green",
  },
  {
    icon: <BoxIcon />,
    label: "Without CashMemo",
    to: "/reports/LrsWithoutCashMemoReport",
    color: "icon-bg-green",
  },
  {
    icon: <BoxIcon />,
    label: "Delivery Report",
    to: "/reports/DeliveryReport",
    color: "icon-bg-green",
  },
  {
    icon: <PersonIcon />,
    label: "User Admin",
    to: "/users",
    color: "icon-bg-purple",
    role: "admin",
  },
  {
    icon: <PersonIcon />,
    label: "App Keys",
    to: "/settings/delete-key",
    color: "icon-bg-purple",
    role: "admin",
  },

];

const statConfig = [
  {
    icon: <AssignmentIcon />,
    label: "Total Memos",
    key: "memoCount",
    color: "icon-bg-blue",
  },
  {
    icon: <ListAltIcon />,
    label: "Pending LRs",
    key: "lrPending",
    color: "icon-bg-purple",
  },
  {
    icon: <TodayIcon />,
    label: "Today's Deliveries",
    key: "deliveriesToday",
    color: "icon-bg-orange",
  },
  {
    icon: <ReceiptIcon />,
    label: "Cash Memos",
    key: "cashMemos",
    color: "icon-bg-green",
  },
];

export default function Dashboard({ selectedYear }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const role = getUserRole();

  useEffect(() => {
    if (!selectedYear) return;
    api
      .get(`/dashboard?year=${selectedYear}`)
      .then((res) => setStats(res.data))
      .catch(() => setError("Could not load dashboard."));
  }, [selectedYear]);

  if (error) return <div style={{ color: "red" }}>{error}</div>;
  if (!stats) return <div>Loading...</div>;

  return (
    <Box className="dashboard-root">
      {/* Stats Strip (right-aligned) */}
      <div className="stats-strip">
        <div className="stats-row">
          {statConfig.map((stat) => (
            <div className="stat-pill" key={stat.key}>
              <span className={`stat-icon-bg ${stat.color}`}>{stat.icon}</span>
              <span>
                <span className="card-value">{stats[stat.key]}</span>
                <br />
                <span className="card-label">{stat.label}</span>
              </span>
            </div>
          ))}
          <div className="role-pill">
            <span className="role-label">Your role: </span>
            <span className="role-value">{stats.role}</span>
          </div>
        </div>
      </div>

      {/* Main Glass Dashboard Section */}
      <div className="dashboard-section">
        <Typography className="section-title">Quick Actions</Typography>
        <div className="action-row">
          {actionIcons.map((action) => (
            <Link className="card-link" to={action.to} key={action.label}>
              <div className="glass-action-card">
                <span className={`icon-bg ${action.color}`}>{action.icon}</span>
                <span className="action-label">{action.label}</span>
              </div>
            </Link>
          ))}
        </div>

        <Divider className="glass-divider" />

        <Typography className="section-title" style={{ marginTop: 26 }}>
          Reports & Registers
        </Typography>
        <div className="report-row">
          {reportIcons
            .filter((action) => !action.role || action.role === role)
            .map((action) => (
              <Link className="card-link" to={action.to} key={action.label}>
                <div className="glass-action-card">
                  <span className={`icon-bg ${action.color}`}>
                    {action.icon}
                  </span>
                  <span className="action-label">{action.label}</span>
                </div>
              </Link>
            ))}
        </div>
      </div>
    </Box>
  );
}
