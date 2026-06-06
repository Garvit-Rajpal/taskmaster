'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { config } = require('../config');

/**
 * Minimal local-filesystem storage provider. The rest of the app depends only
 * on this interface (save/read/remove), so swapping in S3/GCS later is a
 * one-file change.
 */
const ROOT = path.resolve(config.UPLOAD_DIR);

function ensureRoot() {
  fs.mkdirSync(ROOT, { recursive: true });
}

/** Persist a buffer; returns an opaque storageKey used to retrieve it later. */
function save(buffer, originalName) {
  ensureRoot();
  const ext = path.extname(originalName || '').slice(0, 20);
  const key = `${crypto.randomUUID()}${ext}`;
  fs.writeFileSync(path.join(ROOT, key), buffer);
  return key;
}

function absolutePath(key) {
  return path.join(ROOT, key);
}

function exists(key) {
  return fs.existsSync(absolutePath(key));
}

function read(key) {
  return fs.readFileSync(absolutePath(key));
}

function remove(key) {
  try {
    fs.unlinkSync(absolutePath(key));
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}

module.exports = { save, read, remove, exists, absolutePath, ROOT };
