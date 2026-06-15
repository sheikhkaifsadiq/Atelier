export const authorizeRoles = (...allowedRoles) => {
    return (req, res, next) => {
      if (!req.user || !req.user.roles) {
        return res.status(403).json({ message: "Access denied" });
      }
  
      const hasRole = req.user.roles.some(role =>
        allowedRoles.includes(role)
      );
  
      if (!hasRole) {
        return res.status(403).json({ message: "Forbidden" });
      }
  
      next();
    };
  };
  