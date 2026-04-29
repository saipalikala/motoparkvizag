import jwt from "jsonwebtoken";

// In-memory blacklist — survives the process lifetime.
// For multi-instance deployments, move this to Redis.
const revokedTokens = new Set();

export const revokeToken = (token) => revokedTokens.add(token);

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized: No token provided" });
    }

    const token = authHeader.split(" ")[1];

    if (revokedTokens.has(token)) {
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