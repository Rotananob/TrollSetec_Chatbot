'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('https://api.dicebear.com/7.x/adventurer/svg?seed=Student');
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const savedName = localStorage.getItem('chatbot_username');
    const savedAvatar = localStorage.getItem('chatbot_avatar');
    if (savedName) setUsername(savedName);
    if (savedAvatar) setAvatar(savedAvatar);
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const result = evt.target.result;
        setAvatar(result);
        localStorage.setItem('chatbot_avatar', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    localStorage.setItem('chatbot_username', username);
    localStorage.setItem('chatbot_avatar', avatar);
    setIsSubmitted(true);
  };

  const handleBackToForm = () => {
    setIsSubmitted(false);
  };

  const handleSelectBot = (path) => {
    localStorage.setItem('chatbot_username', username);
    localStorage.setItem('chatbot_avatar', avatar);
    router.push(path);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-100 to-indigo-100 font-['Kantumruy_Pro',sans-serif]">
      {/* Site Logo Top Left */}
      <Link href="/" className="site-logo" title="SETEC Chat">
        <div className="logo-glow"></div>
        <img src="/img/logo.jpg" alt="SETEC Logo" />
      </Link>

      {/* Site Logo Bottom Right */}
      <Link
        href="/"
        className="site-logo"
        style={{ right: '24px', bottom: '24px', top: 'auto', left: 'auto', width: '90px', height: '90px' }}
        title="SETEC Chat Bottom Right"
      >
        <div className="logo-glow"></div>
        <img src="/img/logo1.png" alt="SETEC Logo Bottom Right" />
      </Link>

      {/* Main Popup Modal */}
      <div className="fixed inset-0 popup-bg flex items-center justify-center z-20 p-4">
        <div className="popup-card bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center relative max-h-[95vh] overflow-y-auto">
          <br />
          <h2 className="text-3xl angkor text-indigo-700 mb-2">ស្វាគមន៍មកកាន់ SETEC Chatbot</h2>

          {!isSubmitted ? (
            <>
              <form onSubmit={handleSubmit} className="mb-6">
                <div className="flex flex-col items-center gap-3">
                  <label htmlFor="avatar-input" className="avatar-upload cursor-pointer flex flex-col items-center">
                    <img id="avatar-preview" src={avatar} className="avatar-preview mb-1" alt="Avatar Preview" />
                    <span className="text-xs text-indigo-400">ដាក់/ប្ដូរ រូបភាព</span>
                    <input
                      type="file"
                      id="avatar-input"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                  </label>
                  <input
                    id="username-input"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-2 px-4 py-2 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-400 outline-none text-slate-700 text-center font-bold bg-indigo-50"
                    placeholder="បញ្ចូលឈ្មោះអ្នក..."
                    maxLength={24}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="mt-4 w-full py-2 rounded-xl bg-gradient-to-r from-indigo-400 to-pink-400 text-white font-extrabold text-lg shadow hover:from-pink-400 hover:to-indigo-400 transition"
                >
                  បន្ត
                </button>
              </form>

              {/* Other Websites Section */}
              <div id="other-websites-section" className="flex flex-col items-center mt-2 mb-4">
                <div className="w-full max-w-xs bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl shadow p-3 flex flex-col items-center">
                  <span className="text-blue-700 font-bold text-[10px] mb-1 flex items-center gap-1 whitespace-nowrap">
                    <i className="fas fa-globe-asia text-[12px]"></i> Our Other Websites
                  </span>
                  <div className="grid grid-cols-2 gap-1 w-full min-w-0">
                    <a
                      href="https://www.s-tech-store.tech"
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-col items-center px-1 py-1 rounded bg-white hover:bg-indigo-100 border border-indigo-100 text-indigo-700 text-[10px] font-semibold transition min-w-0 w-full break-words"
                    >
                      <i className="fas fa-store text-indigo-500 text-sm mb-0.5"></i>
                      <span className="truncate">S-Tech Store</span>
                    </a>
                    <a
                      href="https://clinic-systems.vercel.app"
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-col items-center px-1 py-1 rounded bg-white hover:bg-emerald-100 border border-emerald-100 text-emerald-700 text-[10px] font-semibold transition min-w-0 w-full break-words"
                    >
                      <i className="fas fa-clinic-medical text-emerald-500 text-sm mb-0.5"></i>
                      <span className="truncate">Clinic System</span>
                    </a>
                    <a
                      href="https://nri-studio.vercel.app"
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-col items-center px-1 py-1 rounded bg-white hover:bg-blue-100 border border-blue-100 text-blue-700 text-[10px] font-semibold transition min-w-0 w-full break-words"
                    >
                      <i className="fas fa-laptop-code text-blue-500 text-sm mb-0.5"></i>
                      <span className="truncate">NRI Studio (IDE)</span>
                    </a>
                    <a
                      href="https://phum-angkor-3d.vercel.app"
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-col items-center px-1 py-1 rounded bg-white hover:bg-amber-100 border border-amber-100 text-amber-700 text-[10px] font-semibold transition min-w-0 w-full break-words"
                    >
                      <i className="fas fa-monument text-amber-500 text-sm mb-0.5"></i>
                      <span className="truncate">Phum Angkor 3D</span>
                    </a>
                    <a
                      href="https://bacii-cal.web.app/"
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-col items-center px-1 py-1 rounded bg-white hover:bg-green-100 border border-green-100 text-green-700 text-[10px] font-semibold transition min-w-0 w-full break-words"
                    >
                      <i className="fas fa-graduation-cap text-green-500 text-sm mb-0.5"></i>
                      <span className="truncate">Web&App គណនាបាក់ឌុប</span>
                    </a>
                    <a
                      href="https://play.google.com/store/apps/developer?id=youngapp"
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-col items-center px-1 py-1 rounded bg-white hover:bg-red-100 border border-red-100 text-red-700 text-[10px] font-semibold transition min-w-0 w-full break-words"
                    >
                      <i className="fas fa-cash-register text-red-500 text-sm mb-0.5"></i>
                      <span className="truncate">YOUNG POS</span>
                    </a>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="angkor text-xl text-indigo-600 mb-4">
                ស្វាគមន៍ <span className="text-pink-500">{username}</span>!{' '}
                <i className="fas fa-user-check text-green-500"></i>
              </div>

              <div id="bot-select-section">
                <p className="text-slate-500 mb-4">ជ្រើសរើស Chatbot ដែលអ្នកចង់សាកល្បង៖</p>
                <div className="grid grid-cols-1 gap-4">
                  <div
                    onClick={() => handleSelectBot('/KonBong')}
                    className="flex items-center gap-3 p-4 rounded-xl border border-cyan-300 bg-cyan-50 hover:bg-cyan-100 transition shadow group cursor-pointer"
                  >
                    <img
                      src="https://api.dicebear.com/7.x/bottts/svg?seed=SETECbot"
                      className="w-10 h-10 rounded-full border-2 border-pink-300"
                      alt="SETEC Bot"
                    />
                    <div className="text-left flex-1">
                      <div className="font-bold text-cyan-700 group-hover:text-cyan-900">
                        សុីតិច Chatbot កូនច្បង
                      </div>
                      <div className="text-xs text-slate-500">
                        ចរិកស្លូត មិនឈ្លើយ ចេះគោរព User សំណេះសំណាល សិស្ស SECTEC, Meme, IT, Interior
                      </div>
                    </div>
                    <i className="fas fa-arrow-right text-cyan-400"></i>
                  </div>

                  <div
                    onClick={() => handleSelectBot('/KonPov')}
                    className="flex items-center gap-3 p-4 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 transition shadow group cursor-pointer"
                  >
                    <img
                      src="https://api.dicebear.com/7.x/pixel-art/svg?seed=DaddyMod"
                      className="w-10 h-10 rounded-full border-2 border-blue-400"
                      alt="GenZ Bot"
                    />
                    <div className="text-left flex-1">
                      <div className="font-bold text-blue-700 group-hover:text-blue-900">
                        សុីតិច Chatbot កូនពៅ (GenZ)
                      </div>
                      <div className="text-xs text-slate-500">
                        ចរិកមហាឈ្លើយ តែហ៊ានជេរវា វាជេរវិញ ។ និយាយកំបុតៗបែប Gen Z, Savage, Troll, សិស្សថ្មី
                      </div>
                    </div>
                    <i className="fas fa-arrow-right text-blue-400"></i>
                  </div>
                </div>
              </div>
              <br />
              <button
                onClick={handleBackToForm}
                className="mx-auto mb-4 px-5 py-2 bg-gradient-to-r from-pink-400 via-indigo-400 to-cyan-400 text-white text-base font-extrabold rounded-full shadow-lg flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:from-cyan-400 hover:to-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-300"
              >
                <i className="fas fa-arrow-left animate-bounce mr-1"></i> ត្រឡប់ក្រោយ
              </button>
            </>
          )}

          <div className="mt-6 text-xs text-slate-400">Developed by Rotana NOB • 2025</div>
          <div className="flex flex-col items-center mt-2">
            <span className="text-xs text-slate-400 mb-1">Contact :</span>
            <div className="flex gap-3 justify-center">
              <a
                href="https://web.facebook.com/TheRotanaNob"
                target="_blank"
                rel="noreferrer"
                title="Facebook"
                className="text-blue-600 hover:text-blue-800 text-lg"
              >
                <i className="fab fa-facebook-square"></i>
              </a>
              <a
                href="https://github.com/Rotananob"
                target="_blank"
                rel="noreferrer"
                title="GitHub"
                className="text-gray-800 hover:text-black text-lg"
              >
                <i className="fab fa-github"></i>
              </a>
              <a
                href="https://t.me/NobRotana"
                target="_blank"
                rel="noreferrer"
                title="Telegram"
                className="text-cyan-500 hover:text-cyan-700 text-lg"
              >
                <i className="fab fa-telegram"></i>
              </a>
            </div>
          </div>
          <div className="flex gap-2 justify-center mb-2 mt-2">
            <img
              src="/img/DevPic.JPG"
              alt="Developer 1"
              className="w-8 h-8 rounded-full border-2 border-indigo-300 bg-white object-cover"
              title="Developer Photo 1"
            />
            <img
              src="/img/DevPic1.JPG"
              alt="Developer 2"
              className="w-8 h-8 rounded-full border-2 border-pink-300 bg-white object-cover"
              title="Developer Photo 2"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
