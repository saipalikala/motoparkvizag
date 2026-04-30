import jwt from "jsonwebtoken";

// In-memory blacklist — survives the process lifetime.
// For multi-instance deployments, move this to Redis.
const revokedTokens = new Map();
const TOKEN_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

setInterval(() => {
  const now = Date.now();
  for (const [token, exp] of revokedTokens) {
    if (now > exp) {
      revokedTokens.delete(token);
    }
  }
}, TOKEN_CLEANUP_INTERVAL);

export const revokeToken = (token) => {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64url').toString()
    );

    const exp = payload.exp
      ? payload.exp * 1000
      : Date.now() + 24 * 60 * 60 * 1000;

    revokedTokens.set(token, exp);
  } catch {
    revokedTokens.set(token, Date.now() + 24 * 60 * 60 * 1000);
  }
};
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];

    if (revokedTokens.has(token) && Date.now() < revokedTokens.get(token)) {
        return res.status(401).json({ message: "Unauthorized: Token revoked" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== "admin") {
            return res.status(403).json({ message: "Forbidden: Admins only" });
        }
        req.admin = decoded;
        req.token = token; // make token available for logout route
        next();
    } catch (err) {
        const msg = err.name === "TokenExpiredError"
            ? "Unauthorized: Token expired"
            : "Unauthorized: Invalid token";
        return res.status(401).json({ message: msg });
    }
};

export default authMiddleware;