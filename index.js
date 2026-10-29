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
        // Safe body parser that handles both String and Object request bodies
        let body = {};
        if (req.body) {
            if (typeof req.body === 'object') {
                body = req.body;
            } else if (typeof req.body === 'string') {
                try {
                    body = JSON.parse(req.body);
                } catch (e) {
                    body = {};
                }
            }
        }

        if (path === "/createUserProfile" && method === "POST") {
            return res.send("Profile initialized successfully", 200, corsHeaders);
        }
        
        if (path === "/requestDeposit" && method === "POST") {
            log(`Deposit requested by user ${userId}: Amount = ${body.amount}, Ref = ${body.reference}`);
            return res.send("Deposit request received successfully", 200, corsHeaders);
        }

        if (path === "/requestWithdrawal" && method === "POST") {
            log(`Withdrawal requested by user ${userId}: Amount = ${body.amount}`);
            return res.send("Withdrawal request received successfully", 200, corsHeaders);
        }

        if (path === "/verifyAdmin" && method === "POST") {
            const isAdmin = (userId === ADMIN_ID);
            return res.send(JSON.stringify({ isAdmin }), 200, {
                ...corsHeaders,
                "Content-Type": "application/json"
            });
        }

        return res.send("Route not found", 404, corsHeaders);

    } catch (err) {
        error(`Server Error: ${err.message}`);
        return res.send("Server Error: " + err.message, 500, corsHeaders);
    }
};
