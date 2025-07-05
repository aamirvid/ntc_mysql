import { jwtDecode } from "jwt-decode";

export function getUserRole() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    return jwtDecode(token).role;
  } catch {
    return null;
  }
}
