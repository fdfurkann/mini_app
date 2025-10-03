import { exec } from 'child_process';

// PHP tarafındaki run_user.php'yi çalıştıran küçük bir wrapper.
// Diğer modüller "./run_user.js" olarak import ettiğinde bu fonksiyon kullanılacak.
export async function run_user(us_id, channel_id = 0) {
  return new Promise((resolve) => {
    try {
      const phpPath = `${process.cwd()}/server/run_user.php`;
      const cmd = `php ${phpPath} ${us_id} ${channel_id}`;
      exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
        if (error) {
          // Hata olsa bile promise resolve ile dönüyoruz, caller kendi logunu tutuyor
          resolve({ success: false, error: error.message, stdout: stdout || '', stderr: stderr || '' });
        } else {
          resolve({ success: true, stdout: stdout || '', stderr: stderr || '' });
        }
      });
    } catch (e) {
      resolve({ success: false, error: e.message });
    }
  });
}
