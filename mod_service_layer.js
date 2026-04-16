// MOD Checklist Report - Firestore service layer (starter)
// Firebase Web v9+ modular style
// Replace imports/paths to fit your project structure.

import {
  collection,
  doc,
  increment,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';

/**
 * EXPECTED USER PROFILE SHAPE
 * {
 *   uid: string,
 *   full_name: string,
 *   role: 'admin' | 'mod' | 'dept_user' | 'viewer',
 *   department: 'MOD' | 'ENG' | 'HK' | 'FO' | 'FB' | 'SEC' | 'HR' | 'RSV' | 'SALES' | 'REC' | 'KIT' | 'ADMIN'
 * }
 */

export function buildIssueNo(nextNumber, date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const seq = String(nextNumber).padStart(4, '0');
  return `ISS-${y}${m}${d}-${seq}`;
}

export function buildChecklistRunNo(nextNumber, date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const seq = String(nextNumber).padStart(4, '0');
  return `CHK-${y}${m}${d}-${seq}`;
}

export function isValidTransition(fromStatus, toStatus) {
  if (fromStatus === toStatus) return true;
  const map = {
    open: ['in_progress', 'waiting', 'closed'],
    in_progress: ['open', 'waiting', 'closed'],
    waiting: ['open', 'in_progress', 'closed'],
    closed: ['open'],
  };
  return (map[fromStatus] || []).includes(toStatus);
}

export function assertCanWorkIssueInApp(userProfile, issue) {
  const ok =
    userProfile?.role === 'admin' ||
    userProfile?.role === 'mod' ||
    (userProfile?.role === 'dept_user' &&
      issue?.assigned_department === userProfile?.department);

  if (!ok) {
    throw new Error('permission_denied');
  }
}

export function normalizePhoto(photo) {
  return {
    url: photo?.url || '',
    thumb_url: photo?.thumb_url || '',
    storage_path: photo?.storage_path || '',
  };
}

export async function createIssue({
  db,
  auth,
  getMyUserProfile,
  sourceType = 'manual',
  title,
  description,
  issueType,
  priority,
  assignedDepartment,
  locationText,
  beforePhotos = [],
  sourceChecklistRunId = '',
  sourceChecklistAnswerId = '',
}) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('not_signed_in');

  const userProfile = await getMyUserProfile(uid);

  await runTransaction(db, async (tx) => {
    const counterRef = doc(db, 'counters', 'issue_counter');
    const counterSnap = await tx.get(counterRef);

    if (!counterSnap.exists()) {
      throw new Error('issue_counter_not_found');
    }

    const nextNumber = (counterSnap.data().last_number || 0) + 1;
    const issueNo = buildIssueNo(nextNumber);
    const issueRef = doc(collection(db, 'issues'));
    const activityRef = doc(collection(db, `issues/${issueRef.id}/activity`));
    const now = serverTimestamp();
    const normalizedBeforePhotos = beforePhotos.map(normalizePhoto);

    const issueDoc = {
      issue_no: issueNo,
      source_type: sourceType,
      source_checklist_run_id: sourceChecklistRunId || '',
      source_checklist_answer_id: sourceChecklistAnswerId || '',

      title,
      description,
      issue_type: issueType,

      priority,
      status: 'open',

      assigned_department: assignedDepartment,
      assigned_to_uid: '',
      assigned_to_name: '',

      location_text: locationText || '',
      building: '',
      floor: '',
      room_no: '',

      reported_by_uid: uid,
      reported_by_name: userProfile.full_name,
      reported_by_department: userProfile.department,

      cover_photo_url: normalizedBeforePhotos[0]?.url || '',
      cover_thumb_url: normalizedBeforePhotos[0]?.thumb_url || '',
      before_photos: normalizedBeforePhotos,
      after_photos: [],

      comment_count: 0,
      activity_count: 1,
      last_comment_at: null,
      last_activity_at: now,

      closed_at: null,
      closed_by_uid: '',
      closed_by_name: '',

      created_at: now,
      updated_at: now,
    };

    tx.update(counterRef, { last_number: nextNumber });
    tx.set(issueRef, issueDoc);

    tx.set(activityRef, {
      action: sourceType === 'checklist' ? 'created_from_checklist' : 'created',
      note: '',
      by_uid: uid,
      by_name: userProfile.full_name,
      by_department: userProfile.department,
      created_at: now,
    });
  });
}

export async function createIssueFromChecklistFail({
  db,
  auth,
  getMyUserProfile,
  runId,
  answerId,
  assignedDepartment,
  priority,
  customTitle = '',
  customDescription = '',
}) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('not_signed_in');

  const userProfile = await getMyUserProfile(uid);

  await runTransaction(db, async (tx) => {
    const runRef = doc(db, 'checklist_runs', runId);
    const answerRef = doc(db, `checklist_runs/${runId}/answers/${answerId}`);
    const counterRef = doc(db, 'counters', 'issue_counter');

    const runSnap = await tx.get(runRef);
    const answerSnap = await tx.get(answerRef);
    const counterSnap = await tx.get(counterRef);

    if (!runSnap.exists()) throw new Error('checklist_run_not_found');
    if (!answerSnap.exists()) throw new Error('checklist_answer_not_found');
    if (!counterSnap.exists()) throw new Error('issue_counter_not_found');

    const run = runSnap.data();
    const answer = answerSnap.data();

    if (run.status !== 'submitted') {
      throw new Error('run_not_submitted');
    }

    if (answer.response !== 'fail') {
      throw new Error('only_fail_item_can_create_issue');
    }

    if (answer.issue_created === true || answer.linked_issue_id) {
      throw new Error('issue_already_created_for_this_item');
    }

    const nextNumber = (counterSnap.data().last_number || 0) + 1;
    const issueNo = buildIssueNo(nextNumber);
    const issueRef = doc(collection(db, 'issues'));
    const activityRef = doc(collection(db, `issues/${issueRef.id}/activity`));
    const now = serverTimestamp();
    const answerPhotos = Array.isArray(answer.photos) ? answer.photos.map(normalizePhoto) : [];

    const issueDoc = {
      issue_no: issueNo,
      source_type: 'checklist',
      source_checklist_run_id: runId,
      source_checklist_answer_id: answerId,

      title: customTitle || answer.item_text,
      description:
        customDescription ||
        answer.note ||
        `Created from checklist fail: ${answer.item_text}`,
      issue_type: 'other',

      priority,
      status: 'open',

      assigned_department: assignedDepartment,
      assigned_to_uid: '',
      assigned_to_name: '',

      location_text: run.location_text || '',
      building: '',
      floor: '',
      room_no: '',

      reported_by_uid: uid,
      reported_by_name: userProfile.full_name,
      reported_by_department: userProfile.department,

      cover_photo_url: answerPhotos[0]?.url || '',
      cover_thumb_url: answerPhotos[0]?.thumb_url || '',
      before_photos: answerPhotos,
      after_photos: [],

      comment_count: 0,
      activity_count: 1,
      last_comment_at: null,
      last_activity_at: now,

      closed_at: null,
      closed_by_uid: '',
      closed_by_name: '',

      created_at: now,
      updated_at: now,
    };

    tx.update(counterRef, { last_number: nextNumber });
    tx.set(issueRef, issueDoc);

    tx.update(answerRef, {
      issue_created: true,
      linked_issue_id: issueRef.id,
      answered_at: now,
      answered_by_uid: uid,
      answered_by_name: userProfile.full_name,
    });

    tx.update(runRef, {
      issue_count: increment(1),
      updated_at: now,
    });

    tx.set(activityRef, {
      action: 'created_from_checklist',
      note: `Created from checklist run ${run.run_no || runId}`,
      by_uid: uid,
      by_name: userProfile.full_name,
      by_department: userProfile.department,
      created_at: now,
    });
  });
}

export async function changeIssueStatus({
  db,
  auth,
  getMyUserProfile,
  issueId,
  toStatus,
  note = '',
  requireAfterPhotoForClose = false,
}) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('not_signed_in');

  const userProfile = await getMyUserProfile(uid);

  await runTransaction(db, async (tx) => {
    const issueRef = doc(db, 'issues', issueId);
    const issueSnap = await tx.get(issueRef);

    if (!issueSnap.exists()) throw new Error('issue_not_found');

    const issue = issueSnap.data();
    assertCanWorkIssueInApp(userProfile, issue);

    const fromStatus = issue.status;

    if (!isValidTransition(fromStatus, toStatus)) {
      throw new Error(`invalid_transition_${fromStatus}_to_${toStatus}`);
    }

    if (toStatus === 'closed' && requireAfterPhotoForClose) {
      if (!Array.isArray(issue.after_photos) || issue.after_photos.length === 0) {
        throw new Error('after_photo_required_before_close');
      }
    }

    const activityRef = doc(collection(db, `issues/${issueId}/activity`));
    const now = serverTimestamp();

    const patch = {
      status: toStatus,
      updated_at: now,
      last_activity_at: now,
    };

    if (toStatus === 'open') {
      patch.closed_at = null;
      patch.closed_by_uid = '';
      patch.closed_by_name = '';
    }

    if (toStatus === 'closed') {
      patch.closed_at = now;
      patch.closed_by_uid = uid;
      patch.closed_by_name = userProfile.full_name;
    }

    tx.update(issueRef, patch);

    tx.set(activityRef, {
      action: toStatus === 'closed' ? 'closed' : (fromStatus === 'closed' && toStatus === 'open' ? 'reopened' : 'status_changed'),
      from_status: fromStatus,
      to_status: toStatus,
      note,
      by_uid: uid,
      by_name: userProfile.full_name,
      by_department: userProfile.department,
      created_at: now,
    });
  });
}

export async function closeIssue(args) {
  return changeIssueStatus({ ...args, toStatus: 'closed' });
}

export async function reopenIssue(args) {
  return changeIssueStatus({ ...args, toStatus: 'open' });
}

export async function addIssueComment({
  db,
  auth,
  getMyUserProfile,
  issueId,
  message,
  mentions = [],
  photos = [],
}) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('not_signed_in');

  const userProfile = await getMyUserProfile(uid);

  await runTransaction(db, async (tx) => {
    const issueRef = doc(db, 'issues', issueId);
    const issueSnap = await tx.get(issueRef);

    if (!issueSnap.exists()) throw new Error('issue_not_found');

    const issue = issueSnap.data();
    assertCanWorkIssueInApp(userProfile, issue);

    const commentRef = doc(collection(db, `issues/${issueId}/comments`));
    const activityRef = doc(collection(db, `issues/${issueId}/activity`));
    const now = serverTimestamp();

    tx.set(commentRef, {
      type: 'user',
      message,
      by_uid: uid,
      by_name: userProfile.full_name,
      by_role: userProfile.role,
      by_department: userProfile.department,
      mentions,
      photos: photos.map(normalizePhoto),
      created_at: now,
    });

    tx.set(activityRef, {
      action: 'comment_added',
      note: message,
      by_uid: uid,
      by_name: userProfile.full_name,
      by_department: userProfile.department,
      created_at: now,
    });

    tx.update(issueRef, {
      comment_count: increment(1),
      activity_count: increment(1),
      last_comment_at: now,
      last_activity_at: now,
      updated_at: now,
    });
  });
}

export function subscribeBoardForAdminOrMod({ db, onData, onError, pageSize = 30 }) {
  const q = query(
    collection(db, 'issues'),
    where('status', 'in', ['open', 'in_progress', 'waiting']),
    orderBy('created_at', 'desc'),
    limit(pageSize)
  );
  return onSnapshot(q, onData, onError);
}

export function subscribeBoardForDepartment({ db, department, onData, onError, pageSize = 30 }) {
  const q = query(
    collection(db, 'issues'),
    where('assigned_department', '==', department),
    where('status', 'in', ['open', 'in_progress', 'waiting']),
    orderBy('created_at', 'desc'),
    limit(pageSize)
  );
  return onSnapshot(q, onData, onError);
}
