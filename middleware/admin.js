module.exports = function admin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Bu işlem için admin yetkisi gerekli" });
  }
  next();
};
