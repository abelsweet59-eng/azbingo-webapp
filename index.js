export default async ({ req, res, log, error }) => {
    const path = req.path || '';
    const method = req.method;
    const ADMIN_ID = "371093083";

    if (method === "OPTIONS") {
        return res.send("OK", 200, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-appwrite-user-id"
        });
    }

    const userId = req.headers['x-appwrite-user-id'] || '';

    try {
        if (path === "/createUserProfile" && method === "POST") {
            return res.send(JSON.stringify({ ok: true, message: "Profile initialized" }), 200, {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            });
        }
        
        if (path === "/requestDeposit" && method === "POST") {
            log(`Deposit requested by user ${userId}`);
            return res.send(JSON.stringify({ ok: true, message: "Deposit request received successfully" }), 200, {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            });
        }

        if (path === "/requestWithdrawal" && method === "POST") {
            log(`Withdrawal requested by user ${userId}`);
            return res.send(JSON.stringify({ ok: true, message: "Withdrawal request received successfully" }), 200, {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            });
        }

        if (path === "/verifyAdmin" && method === "POST") {
            const isAdmin = (userId === ADMIN_ID);
            return res.send(JSON.stringify({ isAdmin }), 200, {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            });
        }

        return res.send(JSON.stringify({ error: "Route not found" }), 404, {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json"
        });

    } catch (err) {
        error(`Server Error: ${err.message}`);
        return res.send(JSON.stringify({ error: err.message }), 200, {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json"
        });
    }
};
