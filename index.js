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
        return res.send("", 200, corsHeaders);
    }

    const userId = req.headers['x-appwrite-user-id'] || '';

    try {
        if (path === "/createUserProfile" && method === "POST") {
            return res.send(JSON.stringify({ ok: true, message: "Profile initialized" }), 200, {
                ...corsHeaders,
                "Content-Type": "application/json"
            });
        }
        
        if (path === "/requestDeposit" && method === "POST") {
            const body = JSON.parse(req.body || '{}');
            log(`Deposit requested by user ${userId}: Amount = ${body.amount}, Ref = ${body.reference}`);
            return res.send(JSON.stringify({ ok: true, message: "Deposit request received successfully" }), 200, {
                ...corsHeaders,
                "Content-Type": "application/json"
            });
        }

        if (path === "/requestWithdrawal" && method === "POST") {
            const body = JSON.parse(req.body || '{}');
            log(`Withdrawal requested by user ${userId}: Amount = ${body.amount}`);
            return res.send(JSON.stringify({ ok: true, message: "Withdrawal request received successfully" }), 200, {
                ...corsHeaders,
                "Content-Type": "application/json"
            });
        }

        // Admin verification route
        if (path === "/verifyAdmin" && method === "POST") {
            if (userId === ADMIN_ID) {
                return res.send(JSON.stringify({ isAdmin: true }), 200, { ...corsHeaders, "Content-Type": "application/json" });
            }
            return res.send(JSON.stringify({ isAdmin: false }), 200, { ...corsHeaders, "Content-Type": "application/json" });
        }

        return res.send(JSON.stringify({ error: "Route not found" }), 404, {
            ...corsHeaders,
            "Content-Type": "application/json"
        });

    } catch (err) {
        return res.send(JSON.stringify({ error: err.message }), 500, {
            ...corsHeaders,
            "Content-Type": "application/json"
        });
    }
};
