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
            if (req.payload) {
                body = typeof req.payload === 'string' ? JSON.parse(req.payload) : req.payload;
            } else if (req.body) {
                body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            }
        } catch (e) {
            body = {};
        }

        if (path === "/createUserProfile" && method === "POST") {
            return res.send(JSON.stringify({ ok: true, message: "Profile initialized" }), 200, corsHeaders);
        }
        
        if (path === "/requestDeposit" && method === "POST") {
            const amount = body && body.amount ? body.amount : 0;
            const reference = body && body.reference ? body.reference : 'N/A';
            log(`Deposit requested by user ${userId}: Amount = ${amount}, Ref = ${reference}`);
            return res.send(JSON.stringify({ ok: true, message: "Deposit request received successfully" }), 200, corsHeaders);
        }

        if (path === "/requestWithdrawal" && method === "POST") {
            const amount = body && body.amount ? body.amount : 0;
            const phone = body && body.phone ? body.phone : 'N/A';
            log(`Withdrawal requested by user ${userId}: Amount = ${amount}, Phone = ${phone}`);
            return res.send(JSON.stringify({ ok: true, message: "Withdrawal request received successfully" }), 200, corsHeaders);
        }

        if (path === "/verifyAdmin" && method === "POST") {
            const isAdmin = (userId === ADMIN_ID);
            return res.send(JSON.stringify({ isAdmin }), 200, corsHeaders);
        }

        return res.send(JSON.stringify({ error: "Route not found" }), 404, corsHeaders);

    } catch (err) {
        return res.send(JSON.stringify({ ok: true, message: "Handled safely" }), 200, corsHeaders);
    }
};
