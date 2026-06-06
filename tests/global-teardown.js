'use strict';

module.exports = async function globalTeardown() {
  const pg = globalThis.__EMBEDDED_PG__;
  if (pg) {
    try {
      await pg.stop();
    } catch (_e) {
      // ignore shutdown noise
    }
  }
};
