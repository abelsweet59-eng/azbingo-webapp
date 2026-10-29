import { Client, Databases, Users } from 'node-appwrite';
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Firebase Admin initialization with explicit Project ID
initializeApp({
  projectId: "az-bingo"
});
const db = getFirestore();

// 1. ዩዘሩ መግባቱን ማረጋገጫ (Auth Verification)
function requireUser(req) {
  const userHeader = req.headers['x-appwrite-user-id'];
  if (!userHeader) {
    throw new Error("Unauthorized: Sign in first.");
  }
  return userHeader;
}

// 2. አድሚን መሆኑን ማረጋገጫ
async function requireAdmin(req) {
  const uid = requireUser(req);
  const snap = await db.doc(`admins/${uid}`).get();
  if (!snap.exists || snap.data().enabled !== true) {
    throw new Error("Forbidden: Admin permission required.");
  }
  return uid;
}

function validAmount(amount, minimum = 100) {
  return Number.isInteger(amount) && amount >= minimum && amount <= 1000000;
}

// 3. ዋናው የአፕራይት ፋንክሽን መግቢያ (Entry Point)
export default async ({ req, res, log, error }) => {
  const path = req.path || '/';
  const data = req.body || {};

  try {
    // ----------------------------------------------------
    // createUserProfile
    // ----------------------------------------------------
    if (path === '/createUserProfile' || req.headers['x-action'] === 'createUserProfile') {
      const uid = requireUser(req);
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
      return res.json({ ok: true });
    }

    // ----------------------------------------------------
    // requestDeposit
    // ----------------------------------------------------
    if (path === '/requestDeposit' || req.headers['x-action'] === 'requestDeposit') {
      const uid = requireUser(req);
      const { amount, reference } = data;
      
      if (!validAmount(amount, 100)) return res.json({ ok: false, error: "Minimum deposit is 100 ETB." }, 400);
      if (typeof reference !== "string" || reference.trim().length < 4 || reference.length > 100) {
        return res.json({ ok: false, error: "Valid Telebirr reference code required." }, 400);
      }
      
      const refKey = reference.trim().replace(/[^a-zA-Z0-9_-]/g, "").toUpperCase();
      const duplicate = await db.collection("depositRequests").where("referenceKey", "==", refKey).limit(1).get();
      if (!duplicate.empty) return res.json({ ok: false, error: "This payment reference has already been submitted." }, 400);
      
      const doc = await db.collection("depositRequests").add({
        uid, amount, reference: reference.trim(), referenceKey: refKey,
        status: "pending", createdAt: FieldValue.serverTimestamp()
      });
      return res.json({ ok: true, requestId: doc.id, status: "pending" });
    }

    // ----------------------------------------------------
    // reviewDeposit (Admin)
    // ----------------------------------------------------
    if (path === '/reviewDeposit' || req.headers['x-action'] === 'reviewDeposit') {
      const adminUid = await requireAdmin(req);
      const { requestId, approve, note = "" } = data;
      
      const reqRef = db.doc(`depositRequests/${requestId}`);
      await db.runTransaction(async (tx) => {
        const reqSnap = await tx.get(reqRef);
        if (!reqSnap.exists) throw new Error("Deposit request not found.");
        const depositReq = reqSnap.data();
        if (depositReq.status !== "pending") throw new Error("Request already reviewed.");
        
        tx.update(reqRef, {
          status: approve ? "approved" : "rejected",
          reviewedBy: adminUid, reviewNote: String(note).slice(0, 500),
          reviewedAt: FieldValue.serverTimestamp()
        });
        
        if (approve) {
          const userRef = db.doc(`users/${depositReq.uid}`);
          tx.update(userRef, { cashBalance: FieldValue.increment(depositReq.amount) });
          tx.set(db.collection("walletLedger").doc(), {
            uid: depositReq.uid, type: "deposit", amount: depositReq.amount, requestId,
            approvedBy: adminUid, createdAt: FieldValue.serverTimestamp()
          });
        }
      });
      return res.json({ ok: true });
    }

    // ----------------------------------------------------
    // requestWithdrawal
    // ----------------------------------------------------
    if (path === '/requestWithdrawal' || req.headers['x-action'] === 'requestWithdrawal') {
      const uid = requireUser(req);
      const { amount, phone } = data;
      
      if (!validAmount(amount, 100)) return res.json({ ok: false, error: "Minimum withdrawal is 100 ETB." }, 400);
      if (typeof phone !== "string" || !/^(09|07)\d{8}$/.test(phone.trim())) {
        return res.json({ ok: false, error: "Valid Ethiopian mobile number required." }, 400);
      }
      
      const userRef = db.doc(`users/${uid}`);
      const reqRef = db.collection("withdrawalRequests").doc();
      
      await db.runTransaction(async (tx) => {
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists) throw new Error("User profile missing.");
        const user = userSnap.data();
        const available = Number(user.cashBalance || 0) - Number(user.reservedWithdrawal || 0);
        if (available < amount) throw new Error("Insufficient confirmed cash balance.");
        
        tx.update(userRef, { reservedWithdrawal: FieldValue.increment(amount) });
        tx.set(reqRef, {
          uid, amount, phone: phone.trim(), status: "pending",
          createdAt: FieldValue.serverTimestamp()
        });
      });
      return res.json({ ok: true, requestId: reqRef.id, status: "pending" });
    }

    // ----------------------------------------------------
    // reviewWithdrawal (Admin)
    // ----------------------------------------------------
    if (path === '/reviewWithdrawal' || req.headers['x-action'] === 'reviewWithdrawal') {
      const adminUid = await requireAdmin(req);
      const { requestId, approve, note = "" } = data;
      
      const reqRef = db.doc(`withdrawalRequests/${requestId}`);
      await db.runTransaction(async (tx) => {
        const reqSnap = await tx.get(reqRef);
        if (!reqSnap.exists) throw new Error("Withdrawal request not found.");
        const withdrawalReq = reqSnap.data();
        if (withdrawalReq.status !== "pending") throw new Error("Request already reviewed.");
        
        const userRef = db.doc(`users/${withdrawalReq.uid}`);
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists) throw new Error("User profile missing.");
        
        tx.update(userRef, {
          reservedWithdrawal: FieldValue.increment(-withdrawalReq.amount),
          ...(approve ? { cashBalance: FieldValue.increment(-withdrawalReq.amount) } : {})
        });
        tx.update(reqRef, {
          status: approve ? "paid" : "rejected",
          reviewedBy: adminUid, reviewNote: String(note).slice(0, 500),
          reviewedAt: FieldValue.serverTimestamp()
        });
        
        if (approve) {
          tx.set(db.collection("walletLedger").doc(), {
            uid: withdrawalReq.uid, type: "withdrawal", amount: -withdrawalReq.amount,
            requestId, approvedBy: adminUid, createdAt: FieldValue.serverTimestamp()
          });
        }
      });
      return res.json({ ok: true });
    }

    // ----------------------------------------------------
    // setRoomState (Admin)
    // ----------------------------------------------------
    if (path === '/setRoomState' || req.headers['x-action'] === 'setRoomState') {
      const adminUid = await requireAdmin(req);
      const { status, calledNumbers = [], playersCount = 0, prizePool = 0 } = data;
      
      if (!["waiting", "registering", "calling", "finished"].includes(status)) {
        return res.json({ ok: false, error: "Invalid room status." }, 400);
      }
      
      await db.doc("gameRooms/main").set({
        status, calledNumbers, playersCount, prizePool,
        updatedBy: adminUid, updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
      
      return res.json({ ok: true });
    }

    return res.json({ error: "Endpoint not found" }, 404);

  } catch (err) {
    error(err.message);
    return res.json({ ok: false, error: err.message }, 500);
  }
};
