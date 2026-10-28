const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

function requireUser(request) {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  return request.auth.uid;
}
async function requireAdmin(request) {
  const uid = requireUser(request);
  const snap = await db.doc(`admins/${uid}`).get();
  if (!snap.exists || snap.data().enabled !== true) {
    throw new HttpsError("permission-denied", "Admin permission required.");
  }
  return uid;
}
function validAmount(amount, minimum = 100) {
  return Number.isInteger(amount) && amount >= minimum && amount <= 1000000;
}

// Create the user wallet exactly once. Bonus is a separate, play-only balance.
exports.createUserProfile = onCall(async (request) => {
  const uid = requireUser(request);
  const ref = db.doc(`users/${uid}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      tx.set(ref, {
        cashBalance: 0,
        playBonus: 20,
        reservedWithdrawal: 0,
        createdAt: FieldValue.serverTimestamp()
      });
    }
  });
  return { ok: true };
});

// Client submits a deposit reference. This DOES NOT credit money.
exports.requestDeposit = onCall(async (request) => {
  const uid = requireUser(request);
  const { amount, reference } = request.data || {};
  if (!validAmount(amount, 100)) throw new HttpsError("invalid-argument", "Minimum deposit is 100 ETB.");
  if (typeof reference !== "string" || reference.trim().length < 4 || reference.length > 100) {
    throw new HttpsError("invalid-argument", "Valid Telebirr reference code required.");
  }
  const refKey = reference.trim().replace(/[^a-zA-Z0-9_-]/g, "").toUpperCase();
  if (!refKey) throw new HttpsError("invalid-argument", "Invalid reference code.");
  const duplicate = await db.collection("depositRequests").where("referenceKey", "==", refKey).limit(1).get();
  if (!duplicate.empty) throw new HttpsError("already-exists", "This payment reference has already been submitted.");
  const doc = await db.collection("depositRequests").add({
    uid, amount, reference: reference.trim(), referenceKey: refKey,
    status: "pending", createdAt: FieldValue.serverTimestamp()
  });
  return { ok: true, requestId: doc.id, status: "pending" };
});

// Admin approves a deposit only after checking Telebirr receipt/payment independently.
exports.reviewDeposit = onCall(async (request) => {
  const adminUid = await requireAdmin(request);
  const { requestId, approve, note = "" } = request.data || {};
  if (typeof requestId !== "string" || typeof approve !== "boolean") {
    throw new HttpsError("invalid-argument", "requestId and approve are required.");
  }
  const reqRef = db.doc(`depositRequests/${requestId}`);
  await db.runTransaction(async (tx) => {
    const reqSnap = await tx.get(reqRef);
    if (!reqSnap.exists) throw new HttpsError("not-found", "Deposit request not found.");
    const req = reqSnap.data();
    if (req.status !== "pending") throw new HttpsError("failed-precondition", "Request already reviewed.");
    tx.update(reqRef, {
      status: approve ? "approved" : "rejected",
      reviewedBy: adminUid, reviewNote: String(note).slice(0, 500),
      reviewedAt: FieldValue.serverTimestamp()
    });
    if (approve) {
      const userRef = db.doc(`users/${req.uid}`);
      tx.update(userRef, { cashBalance: FieldValue.increment(req.amount) });
      tx.set(db.collection("walletLedger").doc(), {
        uid: req.uid, type: "deposit", amount: req.amount, requestId,
        approvedBy: adminUid, createdAt: FieldValue.serverTimestamp()
      });
    }
  });
  return { ok: true };
});

// Reserve only cash funds. Bonus balance cannot be withdrawn.
exports.requestWithdrawal = onCall(async (request) => {
  const uid = requireUser(request);
  const { amount, phone } = request.data || {};
  if (!validAmount(amount, 100)) throw new HttpsError("invalid-argument", "Minimum withdrawal is 100 ETB.");
  if (typeof phone !== "string" || !/^(09|07)\d{8}$/.test(phone.trim())) {
    throw new HttpsError("invalid-argument", "Valid Ethiopian mobile number required.");
  }
  const userRef = db.doc(`users/${uid}`);
  const reqRef = db.collection("withdrawalRequests").doc();
  await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new HttpsError("failed-precondition", "User profile missing.");
    const user = userSnap.data();
    const available = Number(user.cashBalance || 0) - Number(user.reservedWithdrawal || 0);
    if (available < amount) throw new HttpsError("failed-precondition", "Insufficient confirmed cash balance.");
    tx.update(userRef, { reservedWithdrawal: FieldValue.increment(amount) });
    tx.set(reqRef, {
      uid, amount, phone: phone.trim(), status: "pending",
      createdAt: FieldValue.serverTimestamp()
    });
  });
  return { ok: true, requestId: reqRef.id, status: "pending" };
});

// Admin marks withdrawal paid only after manually sending Telebirr payment.
// Rejecting releases the reserved amount.
exports.reviewWithdrawal = onCall(async (request) => {
  const adminUid = await requireAdmin(request);
  const { requestId, approve, note = "" } = request.data || {};
  if (typeof requestId !== "string" || typeof approve !== "boolean") {
    throw new HttpsError("invalid-argument", "requestId and approve are required.");
  }
  const reqRef = db.doc(`withdrawalRequests/${requestId}`);
  await db.runTransaction(async (tx) => {
    const reqSnap = await tx.get(reqRef);
    if (!reqSnap.exists) throw new HttpsError("not-found", "Withdrawal request not found.");
    const req = reqSnap.data();
    if (req.status !== "pending") throw new HttpsError("failed-precondition", "Request already reviewed.");
    const userRef = db.doc(`users/${req.uid}`);
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new HttpsError("failed-precondition", "User profile missing.");
    tx.update(userRef, {
      reservedWithdrawal: FieldValue.increment(-req.amount),
      ...(approve ? { cashBalance: FieldValue.increment(-req.amount) } : {})
    });
    tx.update(reqRef, {
      status: approve ? "paid" : "rejected",
      reviewedBy: adminUid, reviewNote: String(note).slice(0, 500),
      reviewedAt: FieldValue.serverTimestamp()
    });
    if (approve) {
      tx.set(db.collection("walletLedger").doc(), {
        uid: req.uid, type: "withdrawal", amount: -req.amount,
        requestId, approvedBy: adminUid, createdAt: FieldValue.serverTimestamp()
      });
    }
  });
  return { ok: true };
});

// One shared room state. All clients subscribe to gameRooms/main in Firestore.
// Only admin can open/close a round or publish called numbers.
exports.setRoomState = onCall(async (request) => {
  const adminUid = await requireAdmin(request);
  const { status, calledNumbers = [], playersCount = 0, prizePool = 0 } = request.data || {};
  if (!["waiting", "registering", "calling", "finished"].includes(status)) {
    throw new HttpsError("invalid-argument", "Invalid room status.");
  }
  if (!Array.isArray(calledNumbers) || calledNumbers.length > 75 ||
      calledNumbers.some(n => !Number.isInteger(n) || n < 1 || n > 75)) {
    throw new HttpsError("invalid-argument", "Called numbers must be unique bingo numbers from 1 to 75.");
  }
  if (new Set(calledNumbers).size !== calledNumbers.length ||
      !Number.isInteger(playersCount) || playersCount < 0 ||
      !Number.isFinite(prizePool) || prizePool < 0) {
    throw new HttpsError("invalid-argument", "Invalid room statistics.");
  }
  await db.doc("gameRooms/main").set({
    status, calledNumbers, playersCount, prizePool,
    updatedBy: adminUid, updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });
  return { ok: true };
});

// A secure backend is the only authority for role claims. Add admin UIDs in
// Firestore Console at admins/{Firebase Auth UID}, with { enabled: true }.
