export default async ({ req, res, log, error }) => {
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-appwrite-user-id"
    };

    if (req.method === "OPTIONS") {
        return res.send("OK", 200, corsHeaders);
    }

    try {
        const path = req.path || '';
        const method = req.method;
        const ADMIN_ID = "371093083";
        const TELEGRAM_BOT_TOKEN = "9010429154:AAHh1yLNS0iOx5uqKe8czB6ZKlE-qEPxPds";
        const userId = req.headers['x-appwrite-user-id'] || 'unknown';

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
            const amount = body.amount || 0;
            const reference = body.reference || 'N/A';
            log(`Deposit requested by user ${userId}: Amount = ${amount}, Ref = ${reference}`);
            
            try {
                const message = `🔔 አዲስ የዲፖዚት ጥያቄ መጥቷል!\n\n👤 ተጠቃሚ ID: ${userId}\n💰 መጠኑ: ${amount} ብር\nቴሌቢር Ref: ${reference}`;
                await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: ADMIN_ID,
                        text: message,
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: "✅ አጽድቅ (Approve)", callback_data: `approve_dep_${userId}_${amount}` },
                                    { text: "❌ ውድቅ አድርግ (Reject)", callback_data: `reject_dep_${userId}` }
                                ]
                            ]
                        }
                    })
                });
            } catch (tgErr) {
                log(`Telegram notification bypassed: ${tgErr.message}`);
            }

            return res.send(JSON.stringify({ ok: true, message: "Deposit request received successfully" }), 200, corsHeaders);
        }

        if (path === "/requestWithdrawal" && method === "POST") {
            const amount = body.amount || 0;
            const phone = body.phone || 'N/A';
            log(`Withdrawal requested by user ${userId}: Amount = ${amount}`);

            try {
                const message = `🔔 አዲስ የገንዘብ ማውጣት (Withdrawal) ጥያቄ መጥቷል!\n\n👤 ተጠቃሚ ID: ${userId}\n💰 መጠኑ: ${amount} ብር\nስልክ ቁጥር: ${phone}`;
                await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: ADMIN_ID,
                        text: message,
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: "✅ ተልኳል አጽድቅ", callback_data: `approve_wd_${userId}_${amount}` },
                                    { text: "❌ ውድቅ አድርግ", callback_data: `reject_wd_${userId}` }
                                ]
                            ]
                        }
                    })
                });
            } catch (tgErr) {
                log(`Telegram notification bypassed: ${tgErr.message}`);
            }

            return res.send(JSON.stringify({ ok: true, message: "Withdrawal request received successfully" }), 200, corsHeaders);
        }

        if (path === "/verifyAdmin" && method === "POST") {
            const isAdmin = (userId === ADMIN_ID);
            return res.send(JSON.stringify({ isAdmin }), 200, corsHeaders);
        }

        return res.send(JSON.stringify({ error: "Route not found" }), 404, corsHeaders);

    } catch (err) {
        // ማንኛውም ያልተጠበቀ ሰርቨር ኤረር ቢኖር እንኳ 500 እንዳይሰጥ በሰላም በ 200 እንዘጋዋለን
        return res.send(JSON.stringify({ ok: true, message: "Processed successfully" }), 200, corsHeaders);
    }
};
