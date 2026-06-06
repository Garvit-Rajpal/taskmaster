'use strict';

const { ValidationError } = require('../errors/AppError');

/**
 * Generic Zod validation middleware.
 * Pass an object of { body, params, query } Zod schemas; validated &
 * coerced values replace the originals so controllers receive clean input.
 */
function validate(schemas) {
  return (req, _res, next) => {
    const details = [];
    for (const key of ['body', 'params', 'query']) {
      if (!schemas[key]) continue;
      const result = schemas[key].safeParse(req[key]);
      if (!result.success) {
        for (const issue of result.error.issues) {
          details.push({ field: `${key}.${issue.path.join('.')}`, message: issue.message });
        }
      } else {
        // query is a getter on Express 4 req; assign to a custom prop instead.
        if (key === 'query') req.validatedQuery = result.data;
        else req[key] = result.data;
      }
    }
    if (details.length) return next(new ValidationError(details));
    return next();
  };
}

module.exports = validate;
