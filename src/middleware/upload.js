'use strict';

const multer = require('multer');
const { config } = require('../config');
const { AppError, ValidationError } = require('../errors/AppError');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.MAX_UPLOAD_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!config.allowedMime.includes(file.mimetype)) {
      return cb(
        new ValidationError(
          [{ field: 'file', message: `Unsupported file type: ${file.mimetype}` }],
          'Unsupported file type'
        )
      );
    }
    return cb(null, true);
  },
});

/** Wrap multer.single so its errors become our AppError envelope. */
function uploadSingle(field) {
  const handler = upload.single(field);
  return (req, res, next) =>
    handler(req, res, (err) => {
      if (!err) return next();
      if (err instanceof AppError) return next(err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError(413, 'FILE_TOO_LARGE', 'File exceeds the maximum allowed size'));
      }
      return next(err);
    });
}

module.exports = { uploadSingle };
