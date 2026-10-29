export default async ({ req, res, log, error }) => {
    const path = req.path || '';
    const method = req.method;

    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-appwrite-user-id"
    };

    if (method === "OPTIONS") {
        return res.send("", 200, corsHeaders);
    }

    try {
        if (path === "/createUserProfile" && method === "POST") {
            return res.send(JSON.stringify({ ok: true, message: "Profile initialized" }), 200, {
                ...corsHeaders,
                "Content-Type": "application/json"
            });
        }
        
        if (path === "/requestDeposit" && method === "POST") {
            return res.send(JSON.stringify({ ok: true, message: "Deposit request received" }), 200, {
                ...corsHeaders,
                "Content-Type": "application/json"
            });
        }

        if (path === "/requestWithdrawal" && method === "POST") {
            return res.send(JSON.stringify({ ok: true, message: "Withdrawal request received" }), 200, {
                ...corsHeaders,
                "Content-Type": "application/json"
            });
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
