import phttp from './phttp.js';
import { print_log } from './print_log.js';
import { bildirim_ekle } from './utils.js';
import pool from './db.js';

async function checkTelegramMembership(api, user_id, us, s_id, ch_id) {
    if (!api.bot_room) {
        return true; // No channel configured, skip check
    }

    try {
        const botToken = process.env.BOT_TOKEN;
        if (!botToken) {
            print_log({ id: s_id, uid: user_id, usid: us.id, chid: ch_id, msg: "BOT_TOKEN environment variable not set. Skipping Telegram membership check.", pool });
            return true; // Skip check if bot token is not configured
        }

        const channelId = api.bot_room.toString().startsWith('-100') ? api.bot_room : `-100${api.bot_room}`;
        const { bodyString } = await phttp.request(`https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${channelId}&user_id=${user_id}`);
        const json = JSON.parse(bodyString);

        if (!json.ok || !["member", "creator", "administrator"].includes(json.result.status)) {
            const eventMsg = `User is not a member of the required Telegram channel (${channelId}). The operation could not be opened.`;
            print_log({ id: s_id, uid: user_id, usid: us.id, chid: ch_id, msg: eventMsg, pool });
            await pool.query("UPDATE user_signals SET status=3, event=? WHERE id=?", [eventMsg, us.id]);
            await bildirim_ekle(user_id, eventMsg);
            return false; // Membership check failed
        }

        return true; // Membership check successful
    } catch (e) {
        const errorMsg = `An error occurred during the Telegram membership check: ${e.response?.data?.description || e.message}\nStack: ${e.stack || ''}\nCode: ${e.code || ''}\nResponse: ${JSON.stringify(e.response?.data || {})}`;
        print_log({ id: s_id, uid: user_id, usid: us.id, chid: api.bot_room, msg: errorMsg, pool });
        await pool.query("UPDATE user_signals SET status=3, event=? WHERE id=?", [errorMsg, us.id]);
        await bildirim_ekle(user_id, errorMsg);
        return false; // Error occurred
    }
}

export { checkTelegramMembership };
