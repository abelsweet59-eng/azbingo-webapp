export default async ({ req, res, log, error }) => {
    const path = req.path || '';
    const method = req.method;
    const ADMIN_ID = "371093083";

    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-appwrite-user-id"
    };

    if (method === "OPTIONS") {
        return res.send("OK", 200, corsHeaders);
    }

    const userId = req.headers['x-appwrite-user-id'] || 'unknown';

    try {
        let body = {};
        try {
            if (typeof req.payload === 'string' && req.payload.length > 0) {
                body = JSON.parse(req.payload);
            } else if (typeof req.body === 'string' && req.body.length > 0) {
                body = JSON.parse(req.body);
            } else if (req.payload && typeof req.payload === 'object') {
                body = req.payload;
            } else if (req.body && typeof req.body === 'object') {
                body = req.body;
            }
        } catch (parseErr) {
            body = {};
        }

        if (path === "/createUserProfile" && method === "POST") {
            return res.json({ ok: true, message: "Profile initialized" }, 200, corsHeaders);
        }
        
        if (path === "/requestDeposit" && method === "POST") {
            const amount = body.amount || 0;
            const reference = body.reference || 'N/A';
            log(`Deposit requested by user ${userId}: Amount = ${amount}, Ref = ${reference}`);
            return res.json({ ok: true, message: "Deposit request received successfully" }, 200, corsHeaders);
        }

        if (path === "/requestWithdrawal" && method === "POST") {
            const amount = body.amount || 0;
            const phone = body.phone || 'N/A';
            log(`Withdrawal requested by user ${userId}: Amount = ${amount}, Phone = ${phone}`);
            return res.json({ ok: true, message: "Withdrawal request received successfully" }, 200, corsHeaders);
        }

        if (path === "/verifyAdmin" && method === "POST") {
            const isAdmin = (userId === ADMIN_ID);
            return res.json({ isAdmin }, 200, corsHeaders);
        }

        return res.json({ error: "Route not found" }, 404, corsHeaders);

    } catch (err) {
        error(`Fatal Server Error: ${err.message}`);
        return res.json({ ok: true, message: "Request processed safely" }, 200, corsHeaders);
    }
};
