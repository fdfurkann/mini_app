// print_log fonksiyonu (ortak loglama)
async function print_log({ id, uid, usid, msg, pool, chid, traceable_call, call_func }) {
  if (typeof id === 'undefined' && typeof chid === 'undefined') return;
  const now = new Date();
  const pad = n => n < 10 ? '0' + n : n;
  const dt = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  let cleanMsg = (msg || '').toString().replace(/\n/g, ' ').replace(/\r/g, ' ');
  let prefix = '';
  if (uid && usid) {
    prefix = `[c:${chid}|s:${id},u:${uid},us:${usid}]`;
  } else {
    prefix = `[c:${chid}|s:${id}]`;
  }
  const out = `${dt} ${prefix} ${cleanMsg}`;
  console.log(out);
  let callFuncStr = null;
  if (call_func) {
    try {
      callFuncStr = JSON.stringify(call_func);
    } catch (e) {
      callFuncStr = String(call_func);
    }
  } else if (traceable_call) {
    try {
      callFuncStr = JSON.stringify(traceable_call);
    } catch (e) {
      callFuncStr = String(traceable_call);
    }
  }
  // bot_logs tablosuna yaz
  if (pool) {
    try {
      await pool.query(
        "INSERT INTO bot_logs (signals_id, user_id, user_signals_id, channel_id, detail, call_func) VALUES (?, ?, ?, ?, ?, ?)",
        [id || 0, uid || 0, usid || 0, chid || '', msg, '']
      );
    } catch (e) {
      console.error('print_log DB yazma hatası:', e);
    }
  }
}

export { print_log }; 