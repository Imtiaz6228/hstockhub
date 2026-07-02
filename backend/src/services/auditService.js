const { AuditLog } = require('../models');

async function audit(req, action, metadata = {}) {
  try {
    await AuditLog.create({
      actor: req.user?._id,
      action,
      entityType: metadata.entityType,
      entityId: metadata.entityId,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      metadata
    });
  } catch (_) {
    // Audit logging must never break the user-facing request.
  }
}

module.exports = { audit };