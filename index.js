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
        let body = {};
        if (req.payload) {
            try {
                body = typeof req.payload === 'string' ? JSON.parse(req.payload) : req.payload;
            } catch (e) {
                body = {};
            }
        } else if (req.body) {
            try {
                body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            } catch (e) {
                body = {};
            }
        }

        const headers = {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json"
        };

        if (path === "/createUserProfile" && method === "POST") {
            return res.json({ ok: true, message: "Profile initialized" }, 200, headers);
        }
        
        if (path === "/requestDeposit" && method === "POST") {
            log(`Deposit requested by user ${userId}`);
            return res.json({ ok: true, message: "Deposit request received successfully" }, 200, headers);
        }

        if (path === "/requestWithdrawal" && method === "POST") {
            log(`Withdrawal requested by user ${userId}`);
            return res.json({ ok: true, message: "Withdrawal request received successfully" }, 200, headers);
        }

        if (path === "/verifyAdmin" && method === "POST") {
            const isAdmin = (userId === ADMIN_ID);
            return res.json({ isAdmin }, 200, headers);
        }

        return res.json({ error: "Route not found" }, 404, headers);

    } catch (err) {
        error(`Server Error: ${err.message}`);
        return res.json({ error: err.message }, 200, {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json"
        });
    }
};
