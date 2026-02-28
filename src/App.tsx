import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Search, Settings, Users, MessageSquare, UserPlus, 
  Trash2, Pin, Smile, Image as ImageIcon, Gamepad2, 
  LogOut, Shield, Info, Check, Plus, X, Heart, ThumbsUp, 
  Laugh, Ghost, Terminal, Smartphone, Moon, Palette
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
type Theme = 'matrix' | 'ios26' | 'dark';

interface User {
  id: string;
  username: string;
  emoji: string;
  status: string;
}

interface Message {
  id: string;
  from: string;
  to?: string;
  groupId?: string;
  text: string;
  image?: string;
  type: 'text' | 'image' | 'sticker';
  timestamp: number;
  reactions: Record<string, string>;
  pinned: boolean;
}

interface Group {
  id: string;
  name: string;
  creatorId: string;
  isPrivate: boolean;
  code?: string;
  emoji: string;
  members: string[];
}

interface Sticker {
  id: string;
  userId: string;
  url: string;
}

// --- Constants ---
const VERSION = "1.0.4-beta";
const CHANGELOG = [
  "v1.0.4: Добавлены стикеры и мини-игры",
  "v1.0.3: Реализованы реакции и удаление сообщений",
  "v1.0.2: Добавлены приватные группы по коду",
  "v1.0.1: Интеграция тем (Матрица по умолчанию)",
  "v1.0.0: Базовый функционал чата и авторизации"
];

const JOKES = [
  "Почему программисты не любят природу? Слишком много багов.",
  "Заходит бесконечное количество математиков в бар...",
  "В мире есть 10 типов людей: те, кто понимает двоичный код, и те, кто нет.",
  "Robochat: Мы читаем ваши мысли (но только если они в JSON)."
];

const EMOJIS = ["🤖", "🐱", "🐶", "🦊", "🐻", "🐼", "🦁", "🐯", "🐸", "🐙", "🦄", "🌈", "🔥", "💎", "🚀", "🛸"];
const REACTIONS = ["❤️", "👍", "🔥", "😂", "😮", "😢", "😡"];

export default function App() {
  // --- State ---
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('robochat_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('robochat_theme') as Theme) || 'matrix');
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts' | 'groups' | 'settings'>('chats');
  const [activeChat, setActiveChat] = useState<{ id: string; type: 'user' | 'group' } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  
  // Auth state
  const [isRegistering, setIsRegistering] = useState(false);
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authEmoji, setAuthEmoji] = useState('🤖');

  // Modals
  const [showGroupCreate, setShowGroupCreate] = useState(false);
  const [showJoinCode, setShowJoinCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [showGame, setShowGame] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showStickers, setShowStickers] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('robochat_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (user) {
      const interval = setInterval(fetchData, 2000);
      fetchData();
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeChat]);

  const fetchData = async () => {
    try {
      const [msgRes, userRes, groupRes, stickerRes] = await Promise.all([
        fetch('/api/messages'),
        fetch('/api/users'),
        fetch('/api/groups'),
        fetch('/api/stickers')
      ]);
      setMessages(await msgRes.json());
      setUsers(await userRes.json());
      setGroups(await groupRes.json());
      setStickers(await stickerRes.json());
    } catch (e) {
      console.error("Fetch error", e);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // --- Actions ---
  const handleLogin = async () => {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: authUsername, password: authPassword })
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data);
      localStorage.setItem('robochat_user', JSON.stringify(data));
    } else {
      alert("Ошибка входа");
    }
  };

  const handleRegister = async () => {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: authUsername, password: authPassword, emoji: authEmoji })
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data);
      localStorage.setItem('robochat_user', JSON.stringify(data));
    } else {
      alert("Ошибка регистрации");
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('robochat_user');
  };

  const sendMessage = async (type: 'text' | 'image' | 'sticker' = 'text', content?: string) => {
    if (!activeChat || (!inputText && type === 'text')) return;
    
    const body: any = {
      from: user?.id,
      text: type === 'text' ? inputText : '',
      type
    };

    if (type === 'image' || type === 'sticker') body.image = content;
    if (activeChat.type === 'user') body.to = activeChat.id;
    else body.groupId = activeChat.id;

    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    setInputText('');
    fetchData();
  };

  const deleteMessage = async (id: string) => {
    await fetch('/api/messages/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: id })
    });
    setSelectedMessages([]);
    fetchData();
  };

  const reactToMessage = async (messageId: string, reaction: string) => {
    await fetch('/api/messages/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, userId: user?.id, reaction })
    });
    setSelectedMessages([]);
    fetchData();
  };

  const pinMessage = async (messageId: string, pinned: boolean) => {
    await fetch('/api/messages/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId, pinned })
    });
    fetchData();
  };

  const createGroup = async (name: string, isPrivate: boolean, code: string, emoji: string) => {
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, creatorId: user?.id, isPrivate, code, emoji })
    });
    if (res.ok) {
      setShowGroupCreate(false);
      fetchData();
    }
  };

  const joinGroup = async (groupId: string, code?: string) => {
    const res = await fetch('/api/groups/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, userId: user?.id, code })
    });
    if (res.ok) {
      setShowJoinCode(null);
      setJoinCode('');
      fetchData();
    } else {
      alert("Неверный код или ошибка");
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    const res = await fetch('/api/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user?.id, ...updates })
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data);
      localStorage.setItem('robochat_user', JSON.stringify(data));
    }
  };

  const deleteAccount = async () => {
    if (confirm("Вы уверены? Это удалит ваш аккаунт навсегда.")) {
      await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      });
      handleLogout();
    }
  };

  // --- Helpers ---
  const getChatList = () => {
    const chatIds = new Set<string>();
    const list: any[] = [];

    // All groups I'm a member of
    groups.forEach(g => {
      if (g.members.includes(user?.id || '')) {
        list.push({ ...g, type: 'group' });
        chatIds.add(g.id);
      }
    });

    // All users I've messaged or who messaged me
    messages.forEach(m => {
      if (m.groupId) return;
      const otherId = m.from === user?.id ? m.to : m.from;
      if (otherId && !chatIds.has(otherId)) {
        const otherUser = users.find(u => u.id === otherId);
        if (otherUser) {
          list.push({ ...otherUser, type: 'user' });
          chatIds.add(otherId);
        }
      }
    });

    return list.filter(item => 
      (item.name || item.username).toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const getActiveMessages = () => {
    if (!activeChat) return [];
    if (activeChat.type === 'group') {
      return messages.filter(m => m.groupId === activeChat.id);
    } else {
      return messages.filter(m => 
        (m.from === user?.id && m.to === activeChat.id) || 
        (m.from === activeChat.id && m.to === user?.id)
      );
    }
  };

  const toggleMessageSelection = (id: string) => {
    setSelectedMessages(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // --- Theme Styles ---
  const themeClasses = {
    matrix: "bg-black text-green-500 font-mono border-green-900",
    ios26: "bg-white/70 backdrop-blur-xl text-slate-900 border-white/20",
    dark: "bg-slate-900 text-slate-100 border-slate-800"
  };

  const accentClasses = {
    matrix: "bg-green-900/30 border-green-500 text-green-400",
    ios26: "bg-blue-500/10 border-blue-500/20 text-blue-600",
    dark: "bg-indigo-500/20 border-indigo-500/30 text-indigo-400"
  };

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${themeClasses[theme]}`}>
        <div className={`w-full max-w-md p-8 rounded-3xl border-2 shadow-2xl ${theme === 'ios26' ? 'bg-white/80' : 'bg-black/40'}`}>
          <div className="text-center mb-8">
            <motion.div 
              animate={{ rotate: [0, 10, -10, 0] }} 
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-6xl mb-4"
            >
              {authEmoji}
            </motion.div>
            <h1 className="text-4xl font-bold mb-2">Robochat</h1>
            <p className="opacity-60">Будущее общения уже здесь</p>
          </div>

          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="Имя пользователя" 
              className={`w-full p-4 rounded-2xl border outline-none ${theme === 'matrix' ? 'bg-black border-green-500' : 'bg-white/50 border-slate-200'}`}
              value={authUsername}
              onChange={e => setAuthUsername(e.target.value)}
            />
            <input 
              type="password" 
              placeholder="Пароль" 
              className={`w-full p-4 rounded-2xl border outline-none ${theme === 'matrix' ? 'bg-black border-green-500' : 'bg-white/50 border-slate-200'}`}
              value={authPassword}
              onChange={e => setAuthPassword(e.target.value)}
            />
            
            {isRegistering && (
              <div className="flex flex-wrap gap-2 justify-center p-2">
                {EMOJIS.map(e => (
                  <button 
                    key={e} 
                    onClick={() => setAuthEmoji(e)}
                    className={`text-2xl p-2 rounded-xl hover:bg-white/20 ${authEmoji === e ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}

            <button 
              onClick={isRegistering ? handleRegister : handleLogin}
              className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
            >
              {isRegistering ? "Создать аккаунт" : "Войти"}
            </button>

            <button 
              onClick={() => setIsRegistering(!isRegistering)}
              className="w-full text-sm opacity-60 hover:opacity-100"
            >
              {isRegistering ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Регистрация"}
            </button>

            <button 
              onClick={() => setShowRecovery(true)}
              className="w-full text-xs opacity-40 hover:opacity-80"
            >
              Забыли пароль?
            </button>
          </div>

          <div className="mt-8 text-center text-xs opacity-30 italic">
            "{JOKES[Math.floor(Math.random() * JOKES.length)]}"
          </div>
        </div>

        {showRecovery && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 p-8 rounded-3xl max-w-sm w-full text-white">
              <h2 className="text-2xl font-bold mb-4">Восстановление</h2>
              <p className="mb-6 opacity-60">Функция в разработке. Попробуйте вспомнить пароль или создайте новый аккаунт.</p>
              <button onClick={() => setShowRecovery(false)} className="w-full py-3 bg-blue-600 rounded-xl">Понятно</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`h-screen flex overflow-hidden ${themeClasses[theme]} ${theme === 'matrix' ? 'matrix-bg' : ''}`}>
      {/* Sidebar */}
      <div className={`w-80 flex flex-col border-r ${theme === 'ios26' ? 'bg-white/30' : 'bg-black/20'}`}>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{user.emoji}</span>
            <div>
              <h2 className="font-bold leading-tight">{user.username}</h2>
              <p className="text-[10px] opacity-50 truncate max-w-[120px]">{user.status}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 hover:bg-red-500/20 rounded-full text-red-500">
            <LogOut size={18} />
          </button>
        </div>

        <div className="px-4 mb-4">
          <div className={`flex items-center gap-2 p-2 rounded-xl border ${theme === 'matrix' ? 'border-green-500' : 'border-slate-200 bg-white/40'}`}>
            <Search size={16} className="opacity-40" />
            <input 
              type="text" 
              placeholder="Поиск..." 
              className="bg-transparent outline-none w-full text-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-around border-b border-white/10 pb-2">
          <button onClick={() => setActiveTab('chats')} className={`p-2 rounded-xl ${activeTab === 'chats' ? 'bg-blue-500/20 text-blue-500' : 'opacity-40'}`}>
            <MessageSquare size={20} />
          </button>
          <button onClick={() => setActiveTab('contacts')} className={`p-2 rounded-xl ${activeTab === 'contacts' ? 'bg-blue-500/20 text-blue-500' : 'opacity-40'}`}>
            <UserPlus size={20} />
          </button>
          <button onClick={() => setActiveTab('groups')} className={`p-2 rounded-xl ${activeTab === 'groups' ? 'bg-blue-500/20 text-blue-500' : 'opacity-40'}`}>
            <Users size={20} />
          </button>
          <button onClick={() => setActiveTab('settings')} className={`p-2 rounded-xl ${activeTab === 'settings' ? 'bg-blue-500/20 text-blue-500' : 'opacity-40'}`}>
            <Settings size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'chats' && (
            <div className="p-2 space-y-1">
              {getChatList().map(chat => (
                <button 
                  key={chat.id} 
                  onClick={() => setActiveChat({ id: chat.id, type: chat.type })}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${activeChat?.id === chat.id ? 'bg-blue-500 text-white' : 'hover:bg-white/10'}`}
                >
                  <span className="text-2xl">{chat.emoji}</span>
                  <div className="text-left flex-1 min-w-0">
                    <h3 className="font-medium truncate">{chat.name || chat.username}</h3>
                    <p className={`text-xs truncate ${activeChat?.id === chat.id ? 'text-white/70' : 'opacity-50'}`}>
                      {chat.type === 'group' ? 'Группа' : chat.status}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'contacts' && (
            <div className="p-2 space-y-1">
              <p className="text-[10px] uppercase opacity-40 px-3 mb-2">Все пользователи</p>
              {users.filter(u => u.id !== user.id).map(u => (
                <button 
                  key={u.id} 
                  onClick={() => { setActiveChat({ id: u.id, type: 'user' }); setActiveTab('chats'); }}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 transition-all"
                >
                  <span className="text-2xl">{u.emoji}</span>
                  <div className="text-left">
                    <h3 className="font-medium">{u.username}</h3>
                    <p className="text-xs opacity-50">{u.status}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'groups' && (
            <div className="p-2 space-y-4">
              <button 
                onClick={() => setShowGroupCreate(true)}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-blue-600 text-white font-bold"
              >
                <Plus size={18} /> Создать группу
              </button>
              
              <div>
                <p className="text-[10px] uppercase opacity-40 px-3 mb-2">Публичные группы</p>
                {groups.filter(g => !g.isPrivate && !g.members.includes(user.id)).map(g => (
                  <div key={g.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/10">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{g.emoji}</span>
                      <h3 className="font-medium">{g.name}</h3>
                    </div>
                    <button onClick={() => joinGroup(g.id)} className="text-blue-500 text-sm font-bold">Вступить</button>
                  </div>
                ))}
              </div>

              <div>
                <p className="text-[10px] uppercase opacity-40 px-3 mb-2">Приватные группы</p>
                {groups.filter(g => g.isPrivate && !g.members.includes(user.id)).map(g => (
                  <div key={g.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/10">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{g.emoji}</span>
                      <h3 className="font-medium">{g.name}</h3>
                    </div>
                    <button onClick={() => setShowJoinCode(g.id)} className="text-amber-500 text-sm font-bold">Код</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="p-4 space-y-6">
              <div>
                <p className="text-[10px] uppercase opacity-40 mb-3">Профиль</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm opacity-60">Эмодзи:</span>
                    <div className="flex flex-wrap gap-1">
                      {EMOJIS.map(e => (
                        <button key={e} onClick={() => updateProfile({ emoji: e })} className={`p-1 rounded ${user.emoji === e ? 'bg-blue-500' : 'hover:bg-white/10'}`}>{e}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm opacity-60">Свой эмодзи:</span>
                    <input 
                      type="text" 
                      maxLength={2}
                      className="w-12 bg-white/10 p-1 rounded text-center outline-none"
                      placeholder="🤖"
                      onBlur={e => e.target.value && updateProfile({ emoji: e.target.value })}
                    />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Статус" 
                    className="w-full bg-white/10 p-2 rounded-lg text-sm outline-none"
                    defaultValue={user.status}
                    onBlur={e => updateProfile({ status: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase opacity-40 mb-3">Тема оформления</p>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setTheme('matrix')} className={`p-2 rounded-xl border flex flex-col items-center gap-1 ${theme === 'matrix' ? 'border-green-500 bg-green-500/10' : 'border-white/10'}`}>
                    <Terminal size={16} /> <span className="text-[10px]">Matrix</span>
                  </button>
                  <button onClick={() => setTheme('ios26')} className={`p-2 rounded-xl border flex flex-col items-center gap-1 ${theme === 'ios26' ? 'border-blue-500 bg-blue-500/10' : 'border-white/10'}`}>
                    <Smartphone size={16} /> <span className="text-[10px]">iOS 26</span>
                  </button>
                  <button onClick={() => setTheme('dark')} className={`p-2 rounded-xl border flex flex-col items-center gap-1 ${theme === 'dark' ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10'}`}>
                    <Moon size={16} /> <span className="text-[10px]">Dark</span>
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase opacity-40 mb-3">Стикеры</p>
                <div className="grid grid-cols-4 gap-2">
                  {EMOJIS.slice(0, 8).map(e => (
                    <button 
                      key={e} 
                      onClick={async () => {
                        await fetch('/api/stickers', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ userId: user.id, stickerUrl: e })
                        });
                        fetchData();
                      }}
                      className="text-2xl p-2 bg-white/5 rounded-xl hover:bg-white/20"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase opacity-40 mb-3">О приложении</p>
                <div className="bg-white/5 p-3 rounded-2xl text-[10px] space-y-2">
                  <p>Версия: {VERSION}</p>
                  <div className="space-y-1">
                    {CHANGELOG.map(log => <p key={log} className="opacity-60">{log}</p>)}
                  </div>
                </div>
              </div>

              <button onClick={() => setShowGame(true)} className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-purple-600 text-white font-bold">
                <Gamepad2 size={18} /> Мини-игры
              </button>

              <button onClick={deleteAccount} className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl bg-red-600/20 text-red-500 font-bold hover:bg-red-600 hover:text-white transition-all">
                <Trash2 size={18} /> Удалить аккаунт
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col relative">
        {activeChat ? (
          <>
            {/* Header */}
            <div className={`p-4 border-b flex items-center justify-between ${theme === 'ios26' ? 'bg-white/40' : 'bg-black/20'}`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">
                  {activeChat.type === 'group' 
                    ? groups.find(g => g.id === activeChat.id)?.emoji 
                    : users.find(u => u.id === activeChat.id)?.emoji}
                </span>
                <div>
                  <h2 className="font-bold">
                    {activeChat.type === 'group' 
                      ? groups.find(g => g.id === activeChat.id)?.name 
                      : users.find(u => u.id === activeChat.id)?.username}
                  </h2>
                  <p className="text-xs opacity-50">
                    {activeChat.type === 'group' ? 'Групповой чат' : 'Личные сообщения'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedMessages.length > 0 && (
                  <div className="flex items-center gap-2 mr-4">
                    <button onClick={() => selectedMessages.forEach(deleteMessage)} className="p-2 bg-red-500 text-white rounded-full"><Trash2 size={16} /></button>
                    <button onClick={() => setSelectedMessages([])} className="p-2 bg-slate-500 text-white rounded-full"><X size={16} /></button>
                  </div>
                )}
                <button className="p-2 hover:bg-white/10 rounded-full opacity-40"><Info size={20} /></button>
              </div>
            </div>

            {/* Pinned Messages */}
            {getActiveMessages().filter(m => m.pinned).length > 0 && (
              <div className="bg-blue-500/10 p-2 px-4 border-b border-blue-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <Pin size={12} className="text-blue-500" />
                  <span className="opacity-60 truncate max-w-md">
                    {getActiveMessages().filter(m => m.pinned).pop()?.text}
                  </span>
                </div>
                <button className="text-[10px] text-blue-500 font-bold">Смотреть</button>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {getActiveMessages().map(msg => {
                const isMe = msg.from === user.id;
                const sender = users.find(u => u.id === msg.from);
                const isSelected = selectedMessages.includes(msg.id);

                return (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    onDoubleClick={() => toggleMessageSelection(msg.id)}
                  >
                    <div className="flex items-end gap-2 max-w-[80%] group relative">
                      {!isMe && <span className="text-xl mb-1">{sender?.emoji}</span>}
                      
                      <div className="relative">
                        <div className={`p-3 rounded-2xl shadow-sm relative ${
                          isMe 
                            ? (theme === 'matrix' ? 'bg-green-500 text-black' : 'bg-blue-600 text-white') 
                            : (theme === 'matrix' ? 'bg-green-900/20 text-green-400 border border-green-500/30' : 'bg-white/10')
                        } ${isSelected ? 'ring-2 ring-amber-500' : ''}`}>
                          {msg.type === 'text' && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
                          {msg.type === 'sticker' && <span className="text-6xl">{msg.image}</span>}
                          {msg.type === 'image' && <img src={msg.image} className="rounded-lg max-w-xs" referrerPolicy="no-referrer" />}
                          
                          <div className={`text-[9px] mt-1 opacity-40 flex justify-end gap-1 items-center`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isMe && <Check size={10} />}
                          </div>

                          {/* Reactions Display */}
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div className="absolute -bottom-2 -right-2 flex gap-1">
                              {Array.from(new Set(Object.values(msg.reactions))).map(r => (
                                <span key={r} className="bg-white/20 backdrop-blur-md rounded-full px-1 text-[10px] shadow-sm">{r}</span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Selection Indicator */}
                        {isSelected && (
                          <div className="absolute -left-8 top-1/2 -translate-y-1/2 text-amber-500">
                            <Check size={20} />
                          </div>
                        )}

                        {/* Quick Actions (Hover) */}
                        <div className="absolute top-0 -right-12 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-1">
                          <button onClick={() => pinMessage(msg.id, !msg.pinned)} className="p-1 bg-white/10 rounded hover:bg-white/20"><Pin size={12} /></button>
                          <button onClick={() => deleteMessage(msg.id)} className="p-1 bg-red-500/20 text-red-500 rounded hover:bg-red-500 hover:text-white"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    </div>

                    {/* Reactions Picker (on selected) */}
                    {isSelected && (
                      <motion.div 
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="mt-2 flex gap-1 bg-white/10 p-1 rounded-full backdrop-blur-md"
                      >
                        {REACTIONS.map(r => (
                          <button key={r} onClick={() => reactToMessage(msg.id, r)} className="hover:scale-125 transition-transform p-1">{r}</button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className={`p-4 border-t ${theme === 'ios26' ? 'bg-white/40' : 'bg-black/20'}`}>
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e: any) => {
                        const file = e.target.files[0];
                        const reader = new FileReader();
                        reader.onload = () => sendMessage('image', reader.result as string);
                        reader.readAsDataURL(file);
                      };
                      input.click();
                    }}
                    className="p-2 hover:bg-white/10 rounded-full opacity-60"
                  >
                    <ImageIcon size={20} />
                  </button>
                  <button 
                    onClick={() => setShowStickers(!showStickers)}
                    className={`p-2 rounded-full transition-colors ${showStickers ? 'bg-blue-500 text-white' : 'hover:bg-white/10 opacity-60'}`}
                  >
                    <Smile size={20} />
                  </button>
                </div>

                {showStickers && (
                  <div className="absolute bottom-20 left-4 p-4 bg-slate-800 border border-white/10 rounded-2xl shadow-2xl z-40 grid grid-cols-4 gap-2">
                    {stickers.length > 0 ? stickers.map(s => (
                      <button key={s.id} onClick={() => { sendMessage('sticker', s.url); setShowStickers(false); }} className="text-4xl hover:scale-110 transition-transform">{s.url}</button>
                    )) : <p className="text-xs opacity-40 col-span-4">Нет стикеров. Добавьте их в настройках!</p>}
                  </div>
                )}
                <div className={`flex-1 flex items-center gap-2 p-2 px-4 rounded-2xl border ${theme === 'matrix' ? 'border-green-500' : 'border-slate-200 bg-white/40'}`}>
                  <input 
                    type="text" 
                    placeholder="Напишите сообщение..." 
                    className="bg-transparent outline-none w-full text-sm"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  />
                </div>
                <button 
                  onClick={() => sendMessage()}
                  className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center opacity-40">
            <Ghost size={80} strokeWidth={1} className="mb-4" />
            <h2 className="text-2xl font-bold">Выберите чат</h2>
            <p className="max-w-xs">Выберите контакт или группу слева, чтобы начать общение в Robochat.</p>
            <div className="mt-8 p-4 border border-dashed rounded-2xl max-w-sm">
              <p className="text-xs italic">"{JOKES[Math.floor(Math.random() * JOKES.length)]}"</p>
            </div>
          </div>
        )}

        {/* Modals */}
        <AnimatePresence>
          {showGroupCreate && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            >
              <div className="bg-slate-800 p-8 rounded-3xl max-w-md w-full text-white shadow-2xl border border-white/10">
                <h2 className="text-2xl font-bold mb-6">Создание группы</h2>
                <div className="space-y-4">
                  <input id="group-name" type="text" placeholder="Название группы" className="w-full p-4 bg-white/10 rounded-2xl outline-none" />
                  <div className="flex items-center gap-2">
                    <input id="group-private" type="checkbox" className="w-5 h-5" />
                    <label htmlFor="group-private">Приватная группа</label>
                  </div>
                  <input id="group-code" type="text" placeholder="Код доступа (для приватных)" className="w-full p-4 bg-white/10 rounded-2xl outline-none" />
                  <div className="flex justify-end gap-3 mt-8">
                    <button onClick={() => setShowGroupCreate(false)} className="px-6 py-3 rounded-xl hover:bg-white/10">Отмена</button>
                    <button 
                      onClick={() => {
                        const name = (document.getElementById('group-name') as HTMLInputElement).value;
                        const isPrivate = (document.getElementById('group-private') as HTMLInputElement).checked;
                        const code = (document.getElementById('group-code') as HTMLInputElement).value;
                        createGroup(name, isPrivate, code, "👥");
                      }}
                      className="px-6 py-3 bg-blue-600 rounded-xl font-bold"
                    >
                      Создать
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {showJoinCode && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            >
              <div className="bg-slate-800 p-8 rounded-3xl max-w-sm w-full text-white">
                <h2 className="text-xl font-bold mb-4">Введите код доступа</h2>
                <input 
                  type="text" 
                  placeholder="Код" 
                  className="w-full p-4 bg-white/10 rounded-2xl outline-none mb-6"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value)}
                />
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowJoinCode(null)} className="px-4 py-2 opacity-60">Отмена</button>
                  <button onClick={() => joinGroup(showJoinCode, joinCode)} className="px-6 py-2 bg-blue-600 rounded-xl font-bold">Войти</button>
                </div>
              </div>
            </motion.div>
          )}

          {showGame && (
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="fixed inset-0 bg-black/90 flex flex-col z-50"
            >
              <div className="p-4 flex items-center justify-between border-b border-white/10">
                <h2 className="text-2xl font-bold text-white">Мини-игры Robochat</h2>
                <button onClick={() => setShowGame(false)} className="p-2 bg-white/10 rounded-full text-white"><X /></button>
              </div>
              <div className="flex-1 flex items-center justify-center text-white p-8">
                <div className="text-center space-y-6">
                  <Gamepad2 size={100} className="mx-auto opacity-20" />
                  <h3 className="text-3xl font-bold">Крестики-Нолики</h3>
                  <p className="opacity-60">Выберите противника из списка контактов, чтобы начать игру.</p>
                  <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                    {[1,2,3,4,5,6,7,8,9].map(i => (
                      <div key={i} className="aspect-square bg-white/10 rounded-2xl flex items-center justify-center text-4xl font-bold cursor-pointer hover:bg-white/20">
                        {i === 1 ? 'X' : i === 5 ? 'O' : ''}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .matrix-bg {
          background-image: linear-gradient(rgba(0, 50, 0, 0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(0, 50, 0, 0.1) 1px, transparent 1px);
          background-size: 20px 20px;
        }
        ::-webkit-scrollbar {
          width: 4px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(128, 128, 128, 0.2);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(128, 128, 128, 0.4);
        }
      `}</style>
    </div>
  );
}
