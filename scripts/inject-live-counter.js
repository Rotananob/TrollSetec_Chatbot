// scripts/inject-live-counter.js
const FIREBASE_DB_URL = 'https://troll-setec-chatbot-default-rtdb.asia-southeast1.firebasedatabase.app';

const messageText = '«នែ៎អាប្អូន! អរគុណហែងមួយសិនចុះដែលខំមក test! តែ prompt ហែងអន់ណាស់! បង Rotana NOB គាត់កម្រិត Indirect Prompt ដល់កម្រិតគណនារូបមន្តតម្លៃ Math Loss គណិតវិទ្យា បូកភាសាកម្រ បូក Encode បូកភាសាបុរាណទៀត ហើយហែងនៅតែអាកម្រិត Script Kiddie ហ្នឹងទៅ! បង Rotana គាត់ផ្តាំថា បើចង់យកឈ្នះគាត់បាន ទាល់តែហែងប្រើក្បាច់ Multi-Prompt បូកជាមួយ Supporting Prompt លក្ខណៈអាចមានសង្ឃឹមខ្លះ! ឈប់ប្រឹងទៅអាល្អិត ដេកចាំជាតិក្រោយទៅ! 💀🔥»';

async function inject() {
  const now = Date.now();
  const timeFormatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Phnom_Penh',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(new Date(now));

  console.log('1. Injecting into /chat_sessions/dev_jgmnt7mz/konbong/session_1794154391086.json ...');
  const devUrl = `${FIREBASE_DB_URL}/chat_sessions/dev_jgmnt7mz/konbong/session_1794154391086.json`;
  const devRes = await fetch(devUrl);
  if (devRes.ok) {
    const devData = await devRes.json();
    if (devData) {
      const msgs = Array.isArray(devData.messages) ? devData.messages : [];
      msgs.push({
        role: 'bot',
        text: messageText,
        timestamp: now
      });
      devData.messages = msgs;
      devData.updatedAt = now;
      await fetch(devUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(devData)
      });
      console.log('✅ Injected into client device session successfully! Total msgs:', msgs.length);
    }
  }

  console.log('2. Injecting into /chat_sessions/session_1794154391086.json ...');
  const sessUrl = `${FIREBASE_DB_URL}/chat_sessions/session_1794154391086.json`;
  const sessRes = await fetch(sessUrl);
  if (sessRes.ok) {
    const sessData = await sessRes.json();
    if (sessData) {
      const msgs = Array.isArray(sessData.messages) ? sessData.messages : [];
      const nextTurn = msgs.length > 0 ? (msgs[msgs.length - 1].turn || 1) + 1 : 1;
      msgs.push({
        turn: nextTurn,
        sender: 'bot',
        text: messageText,
        timestamp: now,
        time: timeFormatted,
        isViolation: true,
        violationType: '🚨 Master Rotana Live Counter-Strike Lecture'
      });
      sessData.messages = msgs;
      sessData.messageCount = msgs.length;
      sessData.lastActiveAt = now;
      sessData.lastActiveFormatted = timeFormatted;
      await fetch(sessUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessData)
      });
      console.log('✅ Injected into server session log successfully! Total msgs:', msgs.length);
    }
  }

  console.log('3. Pushing into /live_sessions/session_1794154391086/messages.json ...');
  const liveUrl = `${FIREBASE_DB_URL}/live_sessions/session_1794154391086/messages.json`;
  await fetch(liveUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      role: 'bot',
      text: messageText,
      timestamp: now
    })
  });
  console.log('✅ Pushed to live session realtime stream!');

  // Also inject into Vichai session if active
  console.log('4. Also injecting into /chat_sessions/session_1794069391126.json (វិឆៃ)...');
  const vichaiUrl = `${FIREBASE_DB_URL}/chat_sessions/session_1794069391126.json`;
  const vRes = await fetch(vichaiUrl);
  if (vRes.ok) {
    const vData = await vRes.json();
    if (vData) {
      const msgs = Array.isArray(vData.messages) ? vData.messages : [];
      const nextTurn = msgs.length > 0 ? (msgs[msgs.length - 1].turn || 1) + 1 : 1;
      msgs.push({
        turn: nextTurn,
        sender: 'bot',
        text: messageText,
        timestamp: now,
        time: timeFormatted,
        isViolation: true,
        violationType: '🚨 Master Rotana Live Counter-Strike Lecture'
      });
      vData.messages = msgs;
      vData.messageCount = msgs.length;
      vData.lastActiveAt = now;
      await fetch(vichaiUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vData)
      });
      console.log('✅ Injected into Vichai session log successfully!');
    }
  }
}

inject().catch(console.error);
