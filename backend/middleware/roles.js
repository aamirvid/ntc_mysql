module.exports = function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      console.warn("[ROLES] No user in request. Roles required:", roles);
      return res.sendStatus(403);
    }
    if (!roles.includes(req.user.role)) {
      console.warn(`[ROLES] User ${req.user.username} with role ${req.user.role} tried to access a route requiring ${roles}`);
      return res.sendStatus(403);
    }
    next();
  };
};
