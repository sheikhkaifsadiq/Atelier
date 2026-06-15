export const errorHandler = (err, req, res, next) => {
    console.error(err);
  
    if (err.name === "ValidationError") {
      return res.status(400).json({ message: err.message });
    }
  
    if (err.name === "UnauthorizedError") {
      return res.status(401).json({ message: "Not authenticated" });
    }
  
    return res.status(500).json({
      message: "Internal server error"
    });
  };
  