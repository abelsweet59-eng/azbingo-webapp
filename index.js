export default async ({ req, res, log, error }) => {
    // 1. የጥያቄውን መንገድ (Path) እና ሜቶድ (Method) እንለይ
    const path = req.path || '';
    const method = req.method;

    // CORS Headers (ከፍሮንተንድ ጋር እንዲገናኝ የሚፈቅድ)
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-appwrite-user-id"
    };

    if (method === "OPTIONS") {
        return res.send("", 200, corsHeaders);
    }

    try {
        // 2. የዩዘር ፕሮፋይል መፍጠሪያ ራውት
        if (path === "/createUserProfile" && method === "POST") {
            const userId = req.headers['x-appwrite-user-id'];
            log(`Profile init for user: ${userId}`);
            return res.json({ ok: true, message: "Profile initialized successfully" }, 200, corsHeaders);
        }
        
        // 3. የዲፖዚት (Deposit) ጥያቄ መቀበያ
        if (path === "/requestDeposit" && method === "POST") {
            const userId = req.headers['x-appwrite-user-id'];
            const body = JSON.parse(req.body || '{}');
            log(`Deposit request from ${userId}: Amount = ${body.amount}`);
            return res.json({ ok: true, message: "Deposit request received successfully" }, 200, corsHeaders);
        }

        // 4. የዊዝድሮዋል (Withdrawal) ጥያቄ መቀበያ
        if (path === "/requestWithdrawal" && method === "POST") {
            const userId = req.headers['x-appwrite-user-id'];
            const body = JSON.parse(req.body || '{}');
            log(`Withdrawal request from ${userId}: Amount = ${body.amount}`);
            return res.json({ ok: true, message: "Withdrawal request received successfully" }, 200, corsHeaders);
        }

        return res.json({ error: "Route not found" }, 404, corsHeaders);

    } catch (err) {
        error(err.message);
        return res.json({ error: err.message }, 500, corsHeaders);
    }
};
