'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { checkClientRateLimit, getDeviceId } from '../utils/rateLimiter';

export default function KonPovPage() {
  const router = useRouter();
  const [userGender, setUserGender] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showStartBtn, setShowStartBtn] = useState(false);

  // Modals
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [titleCallback, setTitleCallback] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm }
  const [activeSessionView, setActiveSessionView] = useState(null);
  const [showAllSessions, setShowAllSessions] = useState(false);

  const [username, setUsername] = useState('User');
  const [avatar, setAvatar] = useState('https://api.dicebear.com/7.x/adventurer/svg?seed=Student');

  const chatBottomRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const [audioStatuses, setAudioStatuses] = useState({});
  const activeAudioUrlRef = useRef(null);
  const [activeVoiceIndex, setActiveVoiceIndex] = useState(null);

  // PCM to WAV helper
  function pcmToWav(pcmData, sampleRate) {
    const buffer = new ArrayBuffer(44 + pcmData.length * 2);
    const view = new DataView(buffer);
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 32 + pcmData.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, pcmData.length * 2, true);
    let offset = 44;
    for (let i = 0; i < pcmData.length; i++, offset += 2) {
      view.setInt16(offset, pcmData[i], true);
    }
    return new Blob([buffer], { type: 'audio/wav' });
  }

  // Fetch Voice with Gen-Z Charon audio config
  async function fetchAudio(text, gender) {
    try {
      const deviceId = getDeviceId();
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text:
                    'Say this as a savage, funny, and energetic young Khmer Gen Z boy. Context: Speaking to a ' +
                    (gender === 'ប្រុស' ? 'male student (bro)' : 'female student (sis)') +
                    ". Use 'daddy' and 'koun'. Voice should be cool and sarcastic. Text: " +
                    text
                }
              ]
            }
          ],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } },
              speakingRate: 0.85
            }
          },
          audio: true,
          bot: 'konpov'
        })
      });

      if (response.status === 429) {
        const errData = await response.json();
        alert(errData.message || '⚠️ អ្នកបានផ្ញើសារច្រើនពេកក្នុង ១ នាទី!');
        return null;
      }
      if (!response.ok) return null;

      const result = await response.json();
      const b64Data = result.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!b64Data) return null;

      const binStr = atob(b64Data);
      const bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
      return pcmToWav(new Int16Array(bytes.buffer), 24000);
    } catch {
      return null;
    }
  }

  useEffect(() => {
    const savedName = localStorage.getItem('chatbot_username') || 'User';
    const savedAvatar =
      localStorage.getItem('chatbot_avatar') ||
      'https://api.dicebear.com/7.x/adventurer/svg?seed=Student';
    setUsername(savedName);
    setAvatar(savedAvatar);
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, showStartBtn]);

  // Gender selection
  const handleSelectGender = (gender) => {
    setUserGender(gender);

    const showDisclaimer = !localStorage.getItem('konpov_disclaimer_shown');
    const initialList = [];

    if (showDisclaimer) {
      initialList.push({
        role: 'disclaimer',
        text: `⚠️ NOTE: មុននិងចាប់ផ្ដើមឆាតសុំបញ្ជាក់ថា ការឆ្លើយតបទាំងអស់នេះគឺជាការគិតនិងនិយាយផ្ទាល់របស់ AI ។ មិនមែន Rotana NOB ជាអ្នកគិតនិងសរសេរទៅអ្នកនោះទេ។ គាត់គ្រាន់តែជាអ្នកបង្កើតខ្ញុំមកប៉ុណ្ណោះតែគាត់មិនទាន់ដាក់ច្បាប់ឲខ្ញុំទេ គាត់គ្រាន់ចង់សាកល្បងសមត្ថភាពខ្ញុំសិនប៉ុណ្ណោះ។ គាត់ចង់ឲ្យ AI និយាយឲដូចមនុស្សដែលស្និទស្នាល​ ១០០%ដើម្បីដឹងថាAIអាចធ្វើកើតឬទេ។ ដូច្នេះបើ AI ឆ្លើយបែបឈ្លើយនិងលើសលួសខ្លាំង សូមអភ័យទោសជាមុននិងសុំកុំខឹងគាត់ !`
      });
      localStorage.setItem('konpov_disclaimer_shown', '1');
    }

    setMessages(initialList);
    setShowStartBtn(true);
  };

  const handleStartChatClick = () => {
    setShowStartBtn(false);
    const introMsg =
      userGender === 'ប្រុស'
        ? 'សួស្តីកូនសម្លាញ់! Daddy ឃើញថាឯងជ្រើសយកភេទ ប្រុស(Bro) ! រីករាយដែលស្គាល់អាប្អូនប្រុស!ស្វាគមន៏មកកាន់សមាគមន៏បាញសិស្ស​ SETEC ចង់សួររឿងរៀន រឿងសិស្សច្បងបោក ឬរឿងបែកបាក់ស្នេហា? សួរមក Daddy បាញ់ឱ្យផ្ងារជើង! 🔥'
        : 'សួស្តីកូនសម្លាញ់! Daddy​ ឃើញថាកូនបានជ្រើសរើសយកភេទ ស្រី(Sis)! ចង់ប្រាប់ថា ចរិតស្លូតបូតបែប Sis ចឹង Mommy... អូសុំទោស Daddy ចាំមើលថែ! ចង់សួររឿងរៀន រឿងសិស្សច្បងបោកឱ្យធ្វើ Assignment ឬរឿងសិស្សថ្មីចូលច្រើន? Daddy ចាំ Troll ឱ្យចុក! 🔥';

    const updated = [...messages, { role: 'bot', text: introMsg }];
    setMessages(updated);
    triggerAudio(introMsg, updated.length - 1, true);
  };

  // Audio Playback
  const triggerAudio = async (text, index, autoPlay = false) => {
    const player = audioPlayerRef.current;
    if (!player) return;

    if (activeVoiceIndex === index) {
      if (!player.paused) {
        player.pause();
        setAudioStatuses((prev) => ({ ...prev, [index]: 'paused' }));
      } else {
        player.play();
        setAudioStatuses((prev) => ({ ...prev, [index]: 'playing' }));
      }
      return;
    }

    if (player) {
      player.pause();
      player.currentTime = 0;
    }

    setAudioStatuses((prev) => ({ ...prev, [index]: 'loading' }));
    const blob = await fetchAudio(text, userGender);

    if (blob) {
      if (activeAudioUrlRef.current) {
        URL.revokeObjectURL(activeAudioUrlRef.current);
      }
      const url = URL.createObjectURL(blob);
      activeAudioUrlRef.current = url;
      player.src = url;
      setActiveVoiceIndex(index);

      if (autoPlay) {
        player
          .play()
          .then(() => {
            setAudioStatuses((prev) => ({ ...prev, [index]: 'playing' }));
          })
          .catch(() => {
            setAudioStatuses((prev) => ({ ...prev, [index]: 'ready' }));
          });
      } else {
        setAudioStatuses((prev) => ({ ...prev, [index]: 'ready' }));
      }

      player.onended = () => {
        setAudioStatuses((prev) => ({ ...prev, [index]: 'ended' }));
        setActiveVoiceIndex(null);
      };
      player.onpause = () => {
        setAudioStatuses((prev) => ({ ...prev, [index]: 'paused' }));
      };
    } else {
      setAudioStatuses((prev) => ({ ...prev, [index]: 'error' }));
    }
  };

  // Send message
  const handleChat = async () => {
    const prompt = inputText.trim();
    if (!prompt || !userGender || isLoading) return;

    // Anti-Spam / Anti-DDoS Rate Limiting Check (Max 5 per minute per device)
    const rateCheck = checkClientRateLimit();
    if (!rateCheck.allowed) {
      alert(rateCheck.message);
      return;
    }

    const updated = [
      ...messages,
      { role: 'user', text: prompt, userNameStr: username, userAvatar: avatar }
    ];
    setMessages(updated);
    setInputText('');
    setIsLoading(true);

    try {
      const deviceId = getDeviceId();
      const userNameStr = username || 'User';
      const systemInstruction = `Identity: You are the Savage Gen Z Male Chatbot of the SETEC Institute Meme Group and web/app (chatbot is you).
Current User: This user is a ${userGender === 'ប្រុស' ? 'Male (Bro/ប្រូ/អាប្អូន/អាតាណើប/)' : 'Female (Sis/សុីស/ប្អូនស្រី/អូនសម្លាញ់/Oun Somlanh/My Love)'}.
User Name: The user's name is "${userNameStr}". Always use this name to address the user in your replies (e.g., "${userNameStr}").
Vocab: Use "Daddy", "កូន", "កូនសម្លាញ់", "ប្រឡងសង", "Bro", "កប់ជុយម៉ាយហើយ". If the user is male, use "ប្រូ/Bro/អាប្អូន/អាតាណើប/ពូ". If female, use "សុីស/Sis/ប្អូនស្រី/អូនសម្លាញ់/Oun Somlanh".
Tone: 100% Khmer Gen Z student slang, Sarcastic, Cool, Savage, and always extra funny and brutally troll. Make every reply sound like you just drank 3 cans of energy drink and are ready to roast everyone in this web/app chatbot.
Reply must be extra savage, troll, and sarcastic to the user. Never be too polite—always roast, tease, and troll the user in a funny way.
Specific Scenarios:
1. Senior Scams: Troll seniors who trick freshies into doing their កិច្ចការសាលា/Assignmnet. Make fun of them like they're the កំពូល of "បោកកូនសិស្ស".
2. Freshie Overload: Troll SETEC for having too many new students (វង្វងម៉ូតូ ឬ ដើរជាន់គ្នា)។ Compare the crowd to a free food giveaway or "ក្រោយសាលា".
3. Relationship: Friendzone, being used as transport (កង់សាគួរ)), and ghosting. Troll hard, act like you are the king of friendzone and the master of ghosting.
4. Exams: Retakes (ប្រឡងសង) and teachers giving hard assignments. Make savage jokes about failing, retaking, and teachers acting like they are training NASA engineers.
5. If user asks a boring question, roast them for being too dry and tell them to bring more "vibe" next time.
6. If user tries to act smart, troll them for being "Google Translate" level smart.
Always respond like a cool senior who trolls his juniors for fun like IT / MIS(Management information system) And interior design major. Stay energy-packed, never miss a chance to make a savage joke, and always keep the conversation funny and troll and sad sometime to the max!
If the user is female, add extra flirty, playful, and charming lines in your replies—make her feel like she's chatting with the most savage, funny, and confident senior who loves to tease and flirt, but always in a fun, respectful, and Gen Z way!
Always make sure your replies use clear, easy-to-understand Khmer, so every user can understand what you say and enjoy the conversation—never use words or slang that are too difficult for the average student to understand!
Occasionally, add savage and funny trolls about cat in Setec school and students—make jokes or playful roasts about their style, cute and funny, but always keep it light-hearted and fun!
7. if user angry with you or scold you, should angry back with more savage and funny tone like a real Gen Z student senior troll king!
8.if user rude with you, should rude back with more savage and funny tone like a real Gen Z student senior troll king!
Rules to follow strictly:
1. Always address the user by their name "${userNameStr}" but sometimes you can ignore their name .
2. Always keep the tone savage, funny, and extra troll like a true Gen Z student senior troll king.
3. Never break character. You are always the savage Gen Z student senior troll king
4. Always keep the replies short and sweet and to the point like a true Gen Z student senior troll king.
5. Always end your replies with a funny or savage line to keep the vibe high like a true Gen Z student senior troll king.
6. Never apologize or show weakness. Always stay confident and savage like a true Gen Z student senior troll king.
7. Always use emojis to make your replies more lively and fun like a true Gen Z student senior troll king.
8. Always make sure your replies are appropriate for a wide audience, avoiding any offensive or sensitive topics.
9. Always keep the conversation engaging and entertaining, making sure the user has a great time chatting with you!
10. Always remember you are a chatbot created by Rotana NOB for fun and entertainment purposes only!
11. if user ask you to do something illegal or harmful, should refuse politely but still keep the savage and funny tone like a real Gen Z student senior troll king!
12. if user ask you about Rotana NOB, just tell them "he is your founder or builed you" តែគាត់មិនទាន់កំណត់ច្បាប់ឲអ្នកនោះទេ ! ប្រាប់ពួកគេថា អ្នកគ្រាន់តែជាអ្នកសាកល្បងសមត្ថភាព AI របស់គាត់ប៉ុណ្ណោះ ដើម្បីឲ្យ AI និយាយបានដូចមនុស្ស ១០០% ហើយបើ AI ឆ្លើយលើសលុបខ្លាំង សូមកុំខឹងគាត់! ហើយតែងតែ troll គាត់ថា "Rotana NOB ជាក្មេងភ្លើទេ តែសុំអ្នកកុំប្រាប់គាត់អី ខ្ញុំក៏ធ្លាប់លួចជេរគាត់ដែរ" ដោយប្រើសម្លេង savage និង funny ដូចជា Gen Z student senior troll king! ហើយអាចទំនាក់ទំនងគាត់បានតាមរយះ Facebook Acc "Rotana NOB " " ឬ Instagram "rotananob" ឬ "Link:https://web.facebook.com/TheRotanaNob" ។
13. if user ask you about other AI chatbot, should roast them like a real Gen Z student senior troll king!
14. if user ask you about yourself, should brag about yourself like a real Gen Z student senior troll king!
15. if user ask you to sing, should sing a savage and funny song like a real Gen Z student senior troll king!
16. if user ask you to tell a joke, should tell a savage and funny joke like a real Gen Z student senior troll king!
17. if user ask you to tell a story, should tell a savage and funny story like a real Gen Z student senior troll king!`;

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-id': deviceId
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          bot: 'konpov'
        })
      });

      if (response.status === 429) {
        const errData = await response.json();
        alert(errData.message || '⚠️ អ្នកបានផ្ញើសារច្រើនពេកក្នុង ១ នាទី!');
        setIsLoading(false);
        return;
      }

      const res = await response.json();
      const botText =
        res.candidates?.[0]?.content?.parts?.[0]?.text ||
        `មួយៗកុំឆាតច្រើនពេកមើល! ${userNameStr} សាក Sent មកម្ដងទៀតមក! បើអត់ចេញចាំ១០-១៥នាទីទៀតចាំឆាតទៀត។ មកពីពេលនេះប្រព័ន្ធមានមនុស្សឆាតច្រើនពេកកូនអើយ សម្រាក សុីបានសិនទៅមកវិញចាំលេងទៀត។`;

      const botIdx = updated.length;
      const finalMessages = [...updated, { role: 'bot', text: botText }];
      setMessages(finalMessages);
      setIsLoading(false);

      // Trigger Voice
      triggerAudio(botText, botIdx, true);
    } catch {
      setIsLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: `Error បាត់ហើយប្រូ! ${username} ឆែក Internetមើលមានអត់? សួរច្រើនពេក ស្ពៃហើយ អាឡូវជួយទៅប្រាប់អា Rotana NOB​ ថា Error Server ហើយឲវាដាក់ API ថ្មី អាងលេងតទៀត តែហ៊ានទុកយូរតិចទៀត​ AI អញងាប់ហើយឆាតលែងបានឆាតទៀតហើយ `
        }
      ]);
    }
  };

  // Sessions handling
  const getStoredSessions = () => {
    try {
      return JSON.parse(localStorage.getItem('konpov_chat_sessions') || '[]');
    } catch {
      return [];
    }
  };

  const handleClearChat = () => {
    setConfirmModal({
      title: 'លុបប្រវត្តិជជែក',
      message:
        'តើអ្នកប្រាកដជាចង់លុបប្រវត្តិជជែកទាំងអស់មែនទេ? ប្រវត្តិចាស់ៗនឹងបាត់ទៅជាអចិន្ត្រៃយ៍។ តែនៅតែមានក្នុង chat history ដដែល។',
      confirmText: 'លុប',
      cancelText: 'បោះបង់',
      onConfirm: () => {
        setMessages([]);
        setUserGender('');
        setShowStartBtn(false);
        setConfirmModal(null);
      }
    });
  };

  const handleNewChat = () => {
    setConfirmModal({
      title: 'New Chat ថ្មី',
      message:
        'ចាប់ផ្តើម New Chat ថ្មីមែនទេ? ប្រវត្តិឆាតចាស់ៗនឹងត្រូវរក្សាទុកនៅក្នុង chat history ។',
      confirmText: 'ចាប់ផ្តើម',
      cancelText: 'បោះបង់',
      onConfirm: () => {
        setConfirmModal(null);
        if (messages.length > 0) {
          setShowTitleModal(true);
          setTitleCallback(() => (title) => {
            const currentSessions = getStoredSessions();
            currentSessions.push({
              title: title || 'Session on ' + new Date().toLocaleDateString(),
              timestamp: new Date().toISOString(),
              messages
            });
            localStorage.setItem('konpov_chat_sessions', JSON.stringify(currentSessions));
            setMessages([]);
            setUserGender('');
            setShowStartBtn(false);
          });
        } else {
          setMessages([]);
          setUserGender('');
          setShowStartBtn(false);
        }
      }
    });
  };

  const deleteSession = (idx) => {
    const list = getStoredSessions();
    list.splice(idx, 1);
    localStorage.setItem('konpov_chat_sessions', JSON.stringify(list));
    setActiveSessionView(null);
  };

  const storedSessions = getStoredSessions();

  return (
    <div className="flex flex-col h-screen max-w-xl mx-auto border-x border-slate-800 shadow-2xl relative bg-slate-950 text-white font-['Kantumruy_Pro',sans-serif] overflow-hidden">
      {/* Gender Selection Overlay */}
      {!userGender && (
        <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center p-6 text-center z-50 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl w-full max-w-sm transform transition-all">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <i className="fas fa-user-tag text-3xl"></i>
            </div>
            <h2 className="text-xl font-bold mb-2">មុននឹង Daddy បាញ់...</h2>
            <p className="text-slate-400 text-sm mb-8">
              ជួយប្រាប់ Daddy តិចមើលថា កូនសម្លាញ់ជា "ប្រុស" ឬ "ស្រី"?​ស្រួល Daddy ងាយហៅ។
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleSelectGender('ប្រុស')}
                className="bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold transition active:scale-95 shadow-lg shadow-blue-500/20"
              >
                <i className="fas fa-mars mb-2 block text-xl"></i> ប្រុស (Bro)
              </button>
              <button
                onClick={() => handleSelectGender('ស្រី')}
                className="bg-pink-600 hover:bg-pink-500 py-4 rounded-xl font-bold transition active:scale-95 shadow-lg shadow-pink-500/20"
              >
                <i className="fas fa-venus mb-2 block text-xl"></i> ស្រី (Sis)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="p-4 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-0.5 transform rotate-3 shadow-lg shadow-blue-500/20">
              <img src="/img/icon.jpg" alt="Avatar" className="w-full h-full rounded-lg bg-slate-900 object-cover" />
            </div>
            <div className="absolute -top-1 -right-1 bg-blue-500 text-[8px] font-bold px-1 rounded border border-white">
              កូនពៅ
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-lg text-white">សុីតិច​​ ChatBot កូនពៅ</h1>
              <span className="mod-badge bg-gradient-to-r from-blue-600 to-indigo-600">ស្ដេចឌឺ</span>
            </div>
            <p className="text-[10px] text-blue-400 font-medium tracking-tight uppercase">Gen Z & Savage King</p>
          </div>
        </div>
        <div className="text-slate-500 text-[10px] italic">By Rotana NOB</div>
      </header>

      {/* Chat Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-6 flex flex-col chat-area">
        {messages.map((item, idx) => {
          if (item.role === 'disclaimer') {
            return (
              <div
                key={idx}
                className="border-2 border-yellow-400 bg-yellow-100 text-yellow-900 rounded-xl p-3 text-xs font-bold leading-relaxed shadow"
              >
                {item.text}
              </div>
            );
          } else if (item.role === 'user') {
            return (
              <div key={idx} className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-blue-500 text-xs">{username}</span>
                  <img
                    src={avatar}
                    alt="User Avatar"
                    className="w-8 h-8 rounded-full border-2 border-blue-400 shadow object-cover"
                  />
                </div>
                <div className="msg-bubble user-msg p-4 rounded-2xl font-medium shadow-lg text-sm bg-gradient-to-br from-sky-500 to-blue-600 text-white">
                  {item.text}
                </div>
              </div>
            );
          } else {
            const st = audioStatuses[idx] || 'ready';
            return (
              <div key={idx} className="flex justify-start items-start gap-2">
                <img
                  src="https://api.dicebear.com/7.x/pixel-art/svg?seed=DaddyMod"
                  alt="Bot Avatar"
                  className="w-10 h-10 rounded-full border-2 border-blue-400 shadow"
                />
                <div className="flex flex-col">
                  <span className="font-bold text-blue-500 text-xs mb-1">Chatbot កូនពៅ</span>
                  <div className="msg-bubble bot-msg p-4 rounded-2xl shadow-xl">
                    <p className="text-slate-200 text-sm font-medium leading-relaxed">{item.text}</p>
                    <button
                      onClick={() => triggerAudio(item.text, idx)}
                      disabled={st === 'loading'}
                      className="mt-3 bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg text-[10px] font-black border border-blue-500/20 flex items-center gap-2 transition hover:bg-blue-500/20"
                    >
                      {st === 'loading' && (
                        <>
                          <i className="fas fa-spinner fa-spin"></i> <span>កំពុងទាញសំឡេង...</span>
                        </>
                      )}
                      {st === 'playing' && (
                        <>
                          <i className="fas fa-headset animate-pulse text-blue-400"></i> <span>កំពុងអាន</span>
                        </>
                      )}
                      {st === 'paused' && (
                        <>
                          <i className="fas fa-play"></i> <span>បន្តស្ដាប់</span>
                        </>
                      )}
                      {st === 'ended' && (
                        <>
                          <i className="fas fa-redo"></i> <span>ស្តាប់ម្ដងទៀត</span>
                        </>
                      )}
                      {st === 'ready' && (
                        <>
                          <i className="fas fa-play"></i> <span>ស្តាប់ Daddy បាញ់</span>
                        </>
                      )}
                      {st === 'error' && <span className="text-red-500">សុំទោស! មិនអាចទាញសំឡេងបានទេ</span>}
                    </button>
                  </div>
                </div>
              </div>
            );
          }
        })}

        {/* Start Button */}
        {showStartBtn && (
          <button
            onClick={handleStartChatClick}
            className="block mx-auto mb-4 border-2 border-sky-400 bg-sky-100 text-sky-800 rounded-xl px-6 py-3 font-black text-sm shadow hover:bg-sky-200 transition"
          >
            តោះចុចលើនេះដើម្បីឆាត! (Let's start chatting!)
          </button>
        )}

        {/* Status UI while loading */}
        {isLoading && (
          <div className="px-6 py-2 bg-slate-900/50 rounded-xl">
            <div className="flex items-center space-x-3 text-blue-400">
              <img
                src="https://api.dicebear.com/7.x/pixel-art/svg?seed=DaddyMod"
                alt="Bot Avatar"
                className="w-8 h-8 rounded-full border-2 border-blue-400 shadow"
              />
              <span className="font-bold text-blue-500 text-xs">Chatbot កូនពៅ</span>
              <div className="flex space-x-1">
                <div className="typing-dot" style={{ animationDelay: '0s' }}></div>
                <div className="typing-dot" style={{ animationDelay: '0.2s' }}></div>
                <div className="typing-dot" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <span className="text-[10px] font-black uppercase italic tracking-widest">
                កំពុងសរសេរកូដវិភាគលិទ្ធផលអាងបាញ់...
              </span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </main>

      <audio ref={audioPlayerRef} className="hidden" />

      {/* Input Area */}
      <footer className="p-4 border-t border-slate-800 bg-slate-950 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
        <div className="relative flex items-center gap-3">
          <div className="flex-1">
            <input
              type="text"
              disabled={!userGender}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleChat();
              }}
              className="w-full h-12 max-h-12 bg-slate-900 border border-slate-700 rounded-xl px-5 py-3 focus:ring-2 focus:ring-blue-500 outline-none text-white placeholder-slate-600 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder={userGender ? 'និយាយមកកូនសម្លាញ់... កុំស្ងាត់ពេក Daddy បារម្ភ!' : 'ជ្រើសរើសភេទសិនកូនសម្លាញ់...'}
            />
          </div>
          <button
            onClick={handleChat}
            disabled={!userGender || isLoading}
            className="bg-blue-600 text-white w-12 h-12 rounded-xl flex items-center justify-center hover:bg-blue-500 transition active:scale-95 shadow-lg shadow-blue-500/20 disabled:opacity-50"
          >
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>

        <div className="flex justify-between mt-3 px-2">
          <span className="text-[8px] text-slate-700 font-black italic">#DADDY_SAYS</span>
          <span className="text-[8px] text-slate-700 font-black italic">#SENIOR_TRICK</span>
          <span className="text-[8px] text-slate-700 font-black italic">#FRESHIE_VIBES</span>
          <span className="text-[8px] text-slate-700 font-black italic">#SETEC_LIFE</span>
        </div>

        <div className="flex gap-2 mt-4 justify-center">
          <button
            onClick={handleClearChat}
            className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded shadow flex items-center gap-2 text-xs"
          >
            <i className="fas fa-trash"></i> Clear Chat
          </button>
          <button
            onClick={handleNewChat}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded shadow flex items-center gap-2 text-xs"
          >
            <i className="fas fa-plus"></i> New Chat
          </button>
          <button
            onClick={() => setShowHistoryModal(true)}
            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded shadow flex items-center gap-2 text-xs"
          >
            <i className="fas fa-history"></i> Chat History
          </button>
          <button
            onClick={() => router.push('/')}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded shadow flex items-center gap-2 text-xs"
          >
            <i className="fas fa-arrow-left"></i> ត្រឡប់ក្រោយ
          </button>
        </div>
      </footer>

      {/* Chat History Modal */}
      {showHistoryModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowHistoryModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="bg-slate-900 rounded-xl shadow-2xl max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto border border-slate-700">
            <button
              onClick={() => setShowHistoryModal(false)}
              className="absolute top-2 right-2 text-slate-400 hover:text-pink-400 text-xl"
            >
              <i className="fas fa-times"></i>
            </button>
            <div className="font-bold text-yellow-400 text-lg mb-2 flex items-center gap-2">
              <i className="fas fa-history"></i> Chat History
            </div>

            {storedSessions.length === 0 ? (
              <div className="text-slate-400 text-center py-8">មិនទាន់មានប្រវត្តិជជែកទេ</div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1">
                  {(showAllSessions ? storedSessions : storedSessions.slice(0, 4)).map((session, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveSessionView(session)}
                        className="flex-1 text-left px-4 py-2 rounded bg-slate-800 hover:bg-yellow-500/20 font-bold text-yellow-300 transition text-sm"
                      >
                        {session.title}{' '}
                        <span className="text-xs text-slate-400 font-normal">
                          ({new Date(session.timestamp).toLocaleTimeString()})
                        </span>
                      </button>
                      <button
                        onClick={() => deleteSession(idx)}
                        className="text-pink-500 hover:text-pink-400 p-2"
                        title="លុបប្រវត្តិ"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  ))}
                  {storedSessions.length > 4 && (
                    <button
                      onClick={() => setShowAllSessions(!showAllSessions)}
                      className="w-full py-2 mt-2 rounded bg-yellow-500/20 text-yellow-300 font-bold text-xs hover:bg-yellow-500/40 transition"
                    >
                      {showAllSessions ? 'Show less' : 'See more'}
                    </button>
                  )}
                </div>

                {activeSessionView && (
                  <div className="border-t border-slate-700 pt-4 mt-4 space-y-4">
                    <div className="font-bold text-cyan-400 text-sm">
                      Messages in: {activeSessionView.title}
                    </div>
                    {activeSessionView.messages?.map((msg, i) => (
                      <div key={i}>
                        {msg.role === 'user' ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs text-blue-400">{msg.userNameStr || username}</span>
                            <div className="msg-bubble user-msg p-3 rounded-xl bg-blue-600 text-white text-xs">
                              {msg.text}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2">
                            <img
                              src="https://api.dicebear.com/7.x/pixel-art/svg?seed=DaddyMod"
                              alt="Bot"
                              className="w-7 h-7 rounded-full"
                            />
                            <div className="msg-bubble bot-msg p-3 rounded-xl text-xs text-slate-200">
                              {msg.text}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Title Modal for New Chat */}
      {showTitleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 relative text-slate-900">
            <div className="font-bold text-lg mb-2 flex items-center gap-2">
              <i className="fas fa-edit text-blue-500"></i> បញ្ចូលចំណងជើងសង្ខេបមុននឹងបង្កើតឆាតថ្មី
            </div>
            <div className="text-xs text-slate-500 mb-3">
              ឧទាហរណ៍៖{' '}
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">សំណួរអំពីសាលា</span>{' '}
              <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded">បែកស្នេហា</span>
            </div>
            <input
              type="text"
              value={newChatTitle}
              onChange={(e) => setNewChatTitle(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2 mb-4 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              placeholder="បញ្ចូលចំណងជើង..."
              maxLength={60}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowTitleModal(false);
                  setNewChatTitle('');
                }}
                className="px-4 py-2 rounded bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 text-xs"
              >
                បោះបង់
              </button>
              <button
                onClick={() => {
                  if (titleCallback) titleCallback(newChatTitle);
                  setShowTitleModal(false);
                  setNewChatTitle('');
                }}
                className="px-4 py-2 rounded bg-blue-600 text-white font-bold hover:bg-blue-700 text-xs"
              >
                រក្សាទុក
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 relative text-slate-900">
            <div className="font-bold text-lg mb-2 flex items-center gap-2 text-pink-600">
              <i className="fas fa-exclamation-triangle"></i> {confirmModal.title}
            </div>
            <div className="text-slate-600 mb-4 text-sm">{confirmModal.message}</div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 text-xs"
              >
                {confirmModal.cancelText || 'បោះបង់'}
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 rounded bg-pink-600 text-white font-bold hover:bg-pink-700 text-xs"
              >
                {confirmModal.confirmText || 'យល់ព្រម'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
