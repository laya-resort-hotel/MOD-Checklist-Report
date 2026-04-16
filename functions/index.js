
const { onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

admin.initializeApp();
const db = admin.firestore();

function buildTempPassword() {
  return `Laya${Math.floor(1000 + Math.random() * 9000)}`;
}

async function verifyAdminRequest(req) {
  const authHeader = String(req.headers.authorization || '');
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    const err = new Error('missing_auth');
    err.status = 401;
    throw err;
  }
  const decoded = await admin.auth().verifyIdToken(match[1]);
  const requesterSnap = await db.collection('users').doc(decoded.uid).get();
  const requester = requesterSnap.exists ? requesterSnap.data() || {} : {};
  if (String(requester.role || '').toLowerCase() !== 'admin') {
    const err = new Error('forbidden');
    err.status = 403;
    throw err;
  }
  return { uid: decoded.uid, profile: requester };
}

exports.issueTemporaryPassword = onRequest({ region: 'us-central1' }, (req, res) => {
  cors(req, res, async () => {
    try {
      if (req.method !== 'POST') {
        res.status(405).json({ ok: false, message: 'method_not_allowed' });
        return;
      }
      const requester = await verifyAdminRequest(req);
      const body = typeof req.body === 'object' && req.body ? req.body : {};
      const targetUid = String(body.targetUid || '').trim();
      if (!targetUid) {
        res.status(400).json({ ok: false, message: 'missing_target_uid' });
        return;
      }
      const targetRef = db.collection('users').doc(targetUid);
      const targetSnap = await targetRef.get();
      if (!targetSnap.exists) {
        res.status(404).json({ ok: false, message: 'user_not_found' });
        return;
      }
      const target = targetSnap.data() || {};
      const tempPassword = buildTempPassword();
      await admin.auth().updateUser(targetUid, { password: tempPassword });
      await targetRef.update({
        password_change_required: true,
        temporary_password_issued_at: admin.firestore.FieldValue.serverTimestamp(),
        temporary_password_issued_by_uid: requester.uid,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      await db.collection('usage_logs').add({
        category: 'account',
        action: 'issue_temporary_password',
        title: 'Issued temporary password',
        text: `${requester.profile.full_name || 'Admin'} issued a temporary password for ${target.full_name || target.employee_id || targetUid}`,
        user_uid: requester.uid,
        user_name: requester.profile.full_name || '',
        ref_no: target.employee_id || '',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      res.json({
        ok: true,
        tempPassword,
        employeeId: target.employee_id || '',
        fullName: target.full_name || '',
      });
    } catch (error) {
      logger.error('issueTemporaryPassword failed', error);
      res.status(error.status || 500).json({ ok: false, message: error.message || 'server_error' });
    }
  });
});
