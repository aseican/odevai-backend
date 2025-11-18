const notFound = (req, res, next) => {
  res.status(404);
  res.json({ message: `Route bulunamadı: ${req.originalUrl}` });
};

const errorHandler = (err, req, res, next) => {
  console.error('Hata:', err);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message || 'Sunucu hatası',
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  });
};

module.exports = { notFound, errorHandler };
