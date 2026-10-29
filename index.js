export default async ({ req, res, log, error }) => {
    const path = req.path || '';
    const method = req.method;
    const ADMIN_ID = "371093083";
    const TELEGRAM_BOT_TOKEN = "9010429154:AAHh1yLNS0iOx5uqKe8czB6ZKlE-qEPxPds";

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

        if (path === "/createUserProfile" && method === "POST") {
            return res.json({ ok: true, message: "Profile initialized" }, 200, corsHeaders);
        }
        
        if (path === "/requestDeposit" && method === "POST") {
            log(`Deposit requested by user ${userId}: Amount = ${body.amount}, Ref = ${body.reference}`);
            
            try {
                const message = `🔔 አዲስ የዲፖዚት ጥያቄ መጥቷል!\n\n👤 ተጠቃሚ ID: ${userId}\n💰 መጠኑ: ${body.amount || 0} ብር\nቴሌቢር Ref: ${body.reference || 'N/A'}`;
                
                const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: ADMIN_ID,
                        text: message,
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: "✅ አጽድቅ (Approve)", callback_data: `approve_dep_${userId}_${body.amount || 0}` },
                                    { text: "❌ ውድቅ አድርግ (Reject)", callback_data: `reject_dep_${userId}` }
                                ]
                            ]
                        }
                    })
                });
                
                if (!tgRes.ok) {
                    const errText = await tgRes.text();
                    error(`Telegram API error: ${errText}`);
                }
            } catch (tgErr) {
                error(`Telegram fetch exception: ${tgErr.message}`);
            }

            return res.json({ ok: true, message: "Deposit request received successfully" }, 200, corsHeaders);
        }

        if (path === "/requestWithdrawal" && method === "POST") {
            log(`Withdrawal requested by user ${userId}: Amount = ${body.amount}`);

            try {
                const message = `🔔 አዲስ የገንዘብ ማውጣት (Withdrawal) ጥያቄ መጥቷል!\n\n👤 ተጠቃሚ ID: ${userId}\n💰 መጠኑ: ${body.amount || 0} ብር\nስልክ ቁጥር: ${body.phone || 'N/A'}`;
                
                const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: ADMIN_ID,
                        text: message,
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: "✅ ተልኳል አጽድቅ", callback_data: `approve_wd_${userId}_${body.amount || 0}` },
                                    { text: "❌ ውድቅ አድርግ", callback_data: `reject_wd_${userId}` }
                                ]
                            ]
                        }
                    })
                });

                if (!tgRes.ok) {
                    const errText = await tgRes.text();
                    error(`Telegram API error: ${errText}`);
                }
            } catch (tgErr) {
                error(`Telegram fetch exception: ${tgErr.message}`);
            }

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
