import {
    registerUser,
    loginUser
  } from "../services/auth.service.js";
  import {
    verifyRefreshToken,
    revokeRefreshToken,
    generateAccessToken
  } from "../services/token.service.js";
  
  export const signup = async (req, res, next) => {
    try {
      await registerUser(req.body);
      res.status(201).json({ message: "User registered successfully" });
    } catch (err) {
      next(err);
    }
  };
  
  export const login = async (req, res, next) => {
    try {
      const data = await loginUser(req.body);
      res.json(data);
    } catch (err) {
      res.status(401).json({ message: err.message });
    }
  };
  
  export const refresh = async (req, res, next) => {
    try {
      const { refreshToken } = req.body;
      const stored = await verifyRefreshToken(refreshToken);
  
      if (!stored) {
        return res.status(403).json({ message: "Invalid refresh token" });
      }
  
      await revokeRefreshToken(refreshToken);
  
      const accessToken = generateAccessToken({
        id: stored.user_id,
        roles: []
      });
  
      res.json({ accessToken });
    } catch (err) {
      next(err);
    }
  };
  
  export const logout = async (req, res) => {
    const { refreshToken } = req.body;
    await revokeRefreshToken(refreshToken);
    res.json({ message: "Logged out successfully" });
  };
  