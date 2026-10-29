export default async ({ req, res, log, error }) => {
    const path = req.path || '';
    const method = req.method;
    const ADMIN_ID = "371093083";
    
    // ትክክለኛው የቦት ቶክን
    const TELEGRAM_BOT_TOKEN = "9010429154:AAHh1yLNS0iOx5uqKe8czB6ZKlE-qEPxPds";

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
            return res.send(JSON.stringify({ ok: true, message: "Profile initialized" }), 200, headers);
        }
        
        if (path === "/requestDeposit" && method === "POST") {
            log(`Deposit requested by user ${userId}: Amount = ${body.amount}, Ref = ${body.reference}`);
            
            try {
                const message = `🔔 አዲስ የዲፖዚት ጥያቄ መጥቷል!\n\n👤 ተጠቃሚ ID: ${userId}\n💰 መጠኑ: ${body.amount} ብር\nቴሌቢር Ref: ${body.reference}`;
                await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: ADMIN_ID,
                        text: message,
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: "✅ አጽድቅ (Approve)", callback_data: `approve_dep_${userId}_${body.amount}` },
                                    { text: "❌ ውድቅ አድርግ (Reject)", callback_data: `reject_dep_${userId}` }
                                ]
                            ]
                        }
                    })
                });
            } catch (botErr) {
                error(`Telegram Bot Error: ${botErr.message}`);
            }

            return res.send(JSON.stringify({ ok: true, message: "Deposit request received successfully" }), 200, headers);
        }

        if (path === "/requestWithdrawal" && method === "POST") {
            log(`Withdrawal requested by user ${userId}: Amount = ${body.amount}`);

            try {
                const message = `🔔 አዲስ የገንዘብ ማውጣት (Withdrawal) ጥያቄ መጥቷል!\n\n👤 ተጠቃሚ ID: ${userId}\n💰 መጠኑ: ${body.amount} ብር\nስልክ ቁጥር: ${body.phone}`;
                await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: ADMIN_ID,
                        text: message,
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: "✅ ተልኳል አጽድቅ", callback_data: `approve_wd_${userId}_${body.amount}` },
                                    { text: "❌ ውድቅ አድርግ", callback_data: `reject_wd_${userId}` }
                                ]
                            ]
                        }
                    })
                });
            } catch (botErr) {
                error(`Telegram Bot Error: ${botErr.message}`);
            }

            return res.send(JSON.stringify({ ok: true, message: "Withdrawal request received successfully" }), 200, headers);
        }

        if (path === "/verifyAdmin" && method === "POST") {
            const isAdmin = (userId === ADMIN_ID);
            return res.send(JSON.stringify({ isAdmin }), 200, headers);
        }

        return res.send(JSON.stringify({ error: "Route not found" }), 404, headers);

    } catch (err) {
        error(`Server Error: ${err.message}`);
        return res.send(JSON.stringify({ error: err.message }), 200, headers);
    }
};
