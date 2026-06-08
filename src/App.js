import React, { useState, useEffect, useRef, useReducer, memo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { usePlan } from './usePlan';

// ═══════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════

const TMDB = {
  KEY: 'a2dd920096ca95e20db0a39289fb9448',
  BASE: 'https://api.themoviedb.org/3',
  IMG: 'https://image.tmdb.org/t/p',
};

const img = (path, size = 'w500') =>
  path ? `${TMDB.IMG}/${size}${path}` : 'https://via.placeholder.com/500x750/0f172a/334155?text=No+Poster';

const apiCache = new Map();
const tmdb = async (endpoint, params = {}) => {
  const url = new URL(`${TMDB.BASE}${endpoint}`);
  url.searchParams.set('api_key', TMDB.KEY);
  Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
  const key = url.toString();
  if (apiCache.has(key)) return apiCache.get(key);
  const res = await fetch(key);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  const data = await res.json();
  apiCache.set(key, data);
  return data;
};

// ═══════════════════════════════════════════════
//  WATCHLIST
// ═══════════════════════════════════════════════

const wlKey = 'moodwatch_wl';
const loadWL = () => { try { return JSON.parse(localStorage.getItem(wlKey)) || []; } catch { return []; } };
const saveWL = (l) => { try { localStorage.setItem(wlKey, JSON.stringify(l)); } catch {} };

// ═══════════════════════════════════════════════
//  LOGO SVG
// ═══════════════════════════════════════════════

const Logo = ({ size = 36 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="lg1" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1"/><stop offset="1" stopColor="#8B5CF6"/>
      </linearGradient>
      <linearGradient id="lg2" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F59E0B"/><stop offset="1" stopColor="#EF4444"/>
      </linearGradient>
    </defs>
    <circle cx="50" cy="50" r="46" fill="url(#lg1)"/>
    <circle cx="50" cy="50" r="14" fill="white" fillOpacity="0.15"/>
    <circle cx="50" cy="50" r="8" fill="white" fillOpacity="0.9"/>
    {[0,60,120,180,240,300].map((deg,i) => (
      <circle key={i}
        cx={50 + 33 * Math.cos(deg * Math.PI / 180)}
        cy={50 + 33 * Math.sin(deg * Math.PI / 180)}
        r="5.5" fill="white" fillOpacity="0.3"/>
    ))}
    <polygon points="44,42 44,58 60,50" fill="url(#lg2)"/>
    <path d="M20 72 Q30 62 40 72 Q50 82 60 72 Q70 62 80 72" stroke="white" strokeWidth="3" strokeLinecap="round" fill="none" strokeOpacity="0.6"/>
  </svg>
);

// ═══════════════════════════════════════════════
//  MOODS
// ═══════════════════════════════════════════════

const MOODS = [
  { id: 'happy',     emoji: '😄', label: 'Happy',     genre: 35,    grad: 'from-amber-400 to-yellow-300',   desc: 'Light & joyful films' },
  { id: 'sad',       emoji: '😢', label: 'Sad',       genre: 18,    grad: 'from-blue-500 to-indigo-400',    desc: 'Emotional & moving' },
  { id: 'angry',     emoji: '😤', label: 'Angry',     genre: 28,    grad: 'from-red-500 to-orange-400',     desc: 'High-octane action' },
  { id: 'romantic',  emoji: '🥰', label: 'Romantic',  genre: 10749, grad: 'from-pink-500 to-rose-400',      desc: 'Love & romance' },
  { id: 'scared',    emoji: '😱', label: 'Scared',    genre: 27,    grad: 'from-violet-600 to-purple-500',  desc: 'Horror & thrills' },
  { id: 'bored',     emoji: '😑', label: 'Bored',     genre: 12,    grad: 'from-emerald-500 to-teal-400',   desc: 'Epic adventures' },
  { id: 'curious',   emoji: '🤔', label: 'Curious',   genre: 878,   grad: 'from-cyan-500 to-sky-400',       desc: 'Mind-bending sci-fi' },
  { id: 'nostalgic', emoji: '🌅', label: 'Nostalgic', genre: 36,    grad: 'from-orange-500 to-amber-400',   desc: 'Classic & historical' },
];

// ═══════════════════════════════════════════════
//  CHATBOT ENGINE
// ═══════════════════════════════════════════════

const INTENTS = [
  { name: 'greeting',  test: /\b(hi|hello|hey|good morning|good evening|bonjour|salut|bonsoir|مرحبا|أهلا|السلام)\b/i, handler: (_, __, c) => ({ type: 'text', reply: ["Hello! 👋 Welcome to MoodWatch. Tell me how you're feeling and I'll find the perfect film! 🎬", "Hey there! 🌟 What's your mood today? I'll match it with the perfect movie.", "Good to see you! 🎬 Describe how you feel and I'll take care of the rest."][c%3] }) },
  { name: 'thanks',    test: /\b(thanks|thank you|merci|شكرا|جزاك)\b/i, handler: () => ({ type: 'text', reply: "You're very welcome! 🙏 Enjoy your movie night! Come back anytime. 🍿" }) },
  { name: 'help',      test: /\b(help|how|what can|aide|comment|مساعدة|ماذا)\b/i, handler: () => ({ type: 'text', reply: "I recommend movies based on your mood! 🎯\n\nJust tell me:\n• How you feel — 'I'm sad', 'I'm excited'\n• What genre — 'I want action', 'something romantic'\n• Or write in Arabic or French!\n\nI'll fetch real movies instantly. 🍿" }) },
  { name: 'more',      test: /\b(more|another|show more|encore|d'autres|أكثر|غير|أخرى)\b/i, handler: (_, last, c) => ({ type: 'movies', reply: ["Here are more great picks! 🎬", "Fresh picks incoming! 🍿", "Let me dig deeper for you! 🔍"][c%3], genre: last }) },
  { name: 'best',      test: /\b(which|best|better|top|recommend|lequel|meilleur|أفضل|أيهم)\b/i, handler: () => ({ type: 'text', reply: "I'd go with the first one — highest rating! ⭐\n\nClick any poster to see the full details, trailer, and cast." }) },
  { name: 'sad',       test: /\b(sad|upset|cry|depress|heartbreak|lonely|down|unhappy|triste|déprimé|حزين|مكتئب|وحيد)\b/i, genre: 18,    replies: ["I'm sorry to hear that 💙 These films will speak to your heart:", "A powerful movie is sometimes the best comfort 🤍 Here are some moving picks:", "These films will remind you you're not alone 🌧️"] },
  { name: 'happy',     test: /\b(happy|great|amazing|excited|joyful|wonderful|fantastic|heureux|content|سعيد|فرحان|رائع)\b/i, genre: 35,    replies: ["Love that energy! 🎉 Let's keep the good vibes going:", "Amazing! ✨ Films that match your great mood:", "Let's ride that wave! 🌟 Feel-good movies incoming:"] },
  { name: 'bored',     test: /\b(bored|boring|nothing|dull|empty|ennui|ennuyé|ممل|فارغ)\b/i, genre: 12,    replies: ["Let's fix that boredom! 🌍 Epic adventures await:", "Boredom ends NOW! ⚡ These films will captivate you:", "I've got the perfect cure! 🚀 Thrilling picks:"] },
  { name: 'stressed',  test: /\b(stress|anxious|anxiety|overwhelm|nervous|worried|exhausted|tired|stressé|قلق|متوتر|مرهق)\b/i, genre: 35,    replies: ["Take a deep breath 😌 These light films will help:", "You deserve some comfort cinema 🛋️ Soothing picks:", "Relax mode: ON 🌿 Let these films ease your mind:"] },
  { name: 'angry',     test: /\b(angry|mad|furious|rage|frustrated|annoyed|énervé|colère|غاضب|زعلان)\b/i, genre: 28,    replies: ["Channel that energy! 💥 Intense films incoming:", "Let it all out! 🔥 High-octane action films:", "These films will match your intensity perfectly! 👊"] },
  { name: 'romantic',  test: /\b(love|romantic|romance|crush|relationship|date|couple|amour|romantique|حب|رومانسي|عاشق)\b/i, genre: 10749, replies: ["Feeling the love? 🥰 Beautiful romance films:", "Love is in the air! 💕 Heart-fluttering picks:", "Perfect for a romantic evening! 🌹 Best love stories:"] },
  { name: 'scared',    test: /\b(scared|horror|scary|creepy|dark|ghost|spooky|horreur|effrayant|خوف|رعب|مخيف)\b/i, genre: 27,    replies: ["Brave enough? 😱 Edge-of-your-seat films:", "Dare to watch? 👻 Most gripping horror picks:", "Sleep is overrated! 😏 Genuinely terrifying films:"] },
  { name: 'funny',     test: /\b(funny|laugh|comedy|humor|hilarious|comédie|drôle|مضحك|ضحك)\b/i, genre: 35,    replies: ["Get ready to laugh! 😂 Funniest films around:", "Comedy time! 🤣 These will have you in stitches:", "Laughter is the best medicine! 😄 Brilliant comedies:"] },
  { name: 'action',    test: /\b(action|fight|war|battle|hero|superhero|explosion|combat|guerre|أكشن|حرب|بطل)\b/i, genre: 28,    replies: ["Action time! 💥 Adrenaline-packed films:", "Ready for some thrills? 🎬 Best action picks:", "Let's go! 🚨 These will blow your mind:"] },
  { name: 'scifi',     test: /\b(sci.fi|science fiction|space|future|robot|alien|cosmos|galaxy|خيال علمي|فضاء|مستقبل)\b/i, genre: 878,   replies: ["To the stars! 🚀 Mind-expanding sci-fi films:", "Ready to explore the cosmos? 🌌 Mind-bending picks:", "Beyond imagination! ✨ Best science fiction films:"] },
  { name: 'animation', test: /\b(animation|cartoon|anime|kids|family|pixar|disney|animé|رسوم|أطفال)\b/i, genre: 16,    replies: ["Magical worlds await! 🎨 Wonderful animated films:", "Animation at its finest! 🌈 Pure magic picks:", "Young at heart? 💫 Delightful animations:"] },
  { name: 'mystery',   test: /\b(mystery|detective|crime|suspense|investigation|thriller|mystère|غموض|جريمة)\b/i, genre: 9648,  replies: ["A mystery lover! 🔍 Films that keep you guessing:", "Can you solve it? 🕵️ Best crime & mystery picks:", "The plot thickens! 🎭 Unexpected twists await:"] },
  { name: 'fantasy',   test: /\b(fantasy|magic|wizard|dragon|kingdom|myth|fantaisie|magie|سحر|خيال|مملكة)\b/i, genre: 14,    replies: ["Into a magical realm! ✨ Extraordinary fantasy films:", "Welcome to another world! 🧙 Transporting picks:", "Magic awaits! 🔮 Finest fantasy films:"] },
];

const analyzeMessage = (text, lastGenre, count) => {
  for (const intent of INTENTS) {
    if (!intent.test.test(text)) continue;
    if (intent.handler) return intent.handler(text, lastGenre, count);
    return { type: 'movies', reply: intent.replies[count % 3], genre: intent.genre };
  }
  if (/\b(weekend|holiday|vacation|relax|chill|soirée|وقت فراغ|عطلة|راحة)\b/i.test(text))
    return { type: 'movies', reply: "Perfect for a relaxing evening! 🌙 Great picks:", genre: 35 };
  return {
    type: 'movies',
    reply: ["🎬 Here are some top-rated films you might love!", "Great taste! 🍿 Excellent picks for you:", "Let me suggest some highly-rated films! ⭐"][count % 3],
    genre: lastGenre || 18,
  };
};

// ═══════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════

const INIT = {
  view: 'home', history: [], watchlist: loadWL(),
  searchQuery: '', searchResults: [], selectedId: null,
  chatMessages: [{
    id: 0, sender: 'bot', movies: [],
    text: "Hello! 👋 Welcome to MoodWatch.\n\nI'm your personal movie guide. Tell me how you're feeling and I'll instantly find the perfect films.\n\nYou can write in English, Arabic, or French! 🎬",
  }],
};

function reducer(state, action) {
  switch (action.type) {
    case 'NAV':    return { ...state, view: action.view, history: [...state.history, state.view] };
    case 'BACK': { const h=[...state.history]; return { ...state, view: h.pop()||'home', history: h }; }
    case 'OPEN':   return { ...state, selectedId: action.id, view: 'detail', history: [...state.history, state.view] };
    case 'SEARCH': return { ...state, searchQuery: action.q, view: action.q ? 'search' : 'home' };
    case 'SRQ':    return { ...state, searchResults: action.r };
    case 'TWL': {
      const exists = state.watchlist.some(m => m.id === action.movie.id);
      const wl = exists ? state.watchlist.filter(m=>m.id!==action.movie.id) : [action.movie,...state.watchlist];
      saveWL(wl); return { ...state, watchlist: wl };
    }
    case 'MSG': return { ...state, chatMessages: [...state.chatMessages, action.msg] };
    default: return state;
  }
}

// ═══════════════════════════════════════════════
//  COMPONENTS
// ═══════════════════════════════════════════════

const StarRating = ({ rating }) => (
  <span className="text-amber-400 font-bold text-xs">⭐ {rating?.toFixed(1)}</span>
);

const MovieCard = memo(({ movie, onClick, inWL, onWL }) => (
  <div className="group relative cursor-pointer" onClick={onClick}>
    <div className="relative overflow-hidden rounded-2xl bg-slate-800 border border-white/5 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-2xl group-hover:shadow-black/50">
      <img src={img(movie.poster_path,'w300')} alt={movie.title}
        className="w-full aspect-[2/3] object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy"/>
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
        <p className="text-white font-bold text-xs leading-tight line-clamp-2 mb-1">{movie.title}</p>
        <StarRating rating={movie.vote_average}/>
      </div>
      <div className="absolute top-2 right-2 bg-black/70 backdrop-blur rounded-lg px-1.5 py-0.5 text-amber-400 text-[10px] font-black">
        ⭐{movie.vote_average?.toFixed(1)}
      </div>
      {onWL && (
        <button onClick={e=>{e.stopPropagation();onWL(movie);}}
          className={`absolute top-2 left-2 w-7 h-7 rounded-lg flex items-center justify-center text-xs backdrop-blur transition-all ${inWL?'bg-rose-500 text-white':'bg-black/50 text-white/70 hover:bg-rose-500/80 hover:text-white'}`}>
          {inWL?'❤️':'🤍'}
        </button>
      )}
    </div>
    <p className="mt-1.5 text-slate-400 text-[11px] font-medium text-center line-clamp-1 group-hover:text-white transition-colors px-1">{movie.title}</p>
  </div>
));

const Skeleton = ({ count=6 }) => (
  <>{Array(count).fill(0).map((_,i)=>(
    <div key={i} className="animate-pulse">
      <div className="aspect-[2/3] rounded-2xl bg-slate-800/80"/>
      <div className="mt-2 h-2.5 bg-slate-800 rounded w-3/4 mx-auto"/>
    </div>
  ))}</>
);

const SectionTitle = ({ children }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="w-1 h-6 rounded-full bg-gradient-to-b from-violet-400 to-indigo-600"/>
    <h3 className="text-xl font-black text-white tracking-tight">{children}</h3>
  </div>
);

// ── SPOTLIGHT ─────────────────────────────────

function Spotlight({ movies, dispatch }) {
  const [idx, setIdx] = useState(0);
  const movie = movies[idx];

  useEffect(() => {
    if (!movies.length) return;
    const t = setInterval(() => setIdx(i => (i+1) % Math.min(movies.length,5)), 5000);
    return () => clearInterval(t);
  }, [movies]);

  if (!movie) return <div className="h-[520px] rounded-3xl bg-slate-900 animate-pulse"/>;

  return (
    <div className="relative h-[280px] sm:h-[420px] md:h-[520px] rounded-3xl overflow-hidden group cursor-pointer" onClick={()=>dispatch({type:'OPEN',id:movie.id})}>
      <img key={movie.id} src={img(movie.backdrop_path,'w1280')} alt={movie.title}
        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"/>
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent"/>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"/>
      <div className="absolute inset-0 flex flex-col justify-end p-8 md:p-14">
        <div className="max-w-2xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="bg-violet-600/80 backdrop-blur border border-violet-500/40 text-violet-200 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">🔥 Spotlight</span>
            <span className="text-amber-400 font-black text-sm">⭐ {movie.vote_average?.toFixed(1)}</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight drop-shadow-2xl">{movie.title}</h2>
          <p className="text-slate-300 text-sm leading-relaxed line-clamp-2 max-w-lg">{movie.overview}</p>
          <button className="bg-white text-slate-900 px-7 py-3 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all active:scale-95 shadow-2xl">
            ▶ View Details
          </button>
        </div>
      </div>
      <div className="absolute bottom-6 right-8 flex gap-2">
        {movies.slice(0,5).map((_,i)=>(
          <button key={i} onClick={e=>{e.stopPropagation();setIdx(i);}}
            className={`transition-all rounded-full ${i===idx?'w-6 h-2 bg-white':'w-2 h-2 bg-white/40 hover:bg-white/70'}`}/>
        ))}
      </div>
    </div>
  );
}

// ── HOME ──────────────────────────────────────

function HomeView({ state, dispatch }) {
  const [data, setData] = useState({ trending:[], topRated:[], upcoming:[] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      tmdb('/trending/movie/week'),
      tmdb('/movie/top_rated'),
      tmdb('/movie/upcoming'),
    ]).then(([t,tr,u]) => {
      setData({ trending:t.results.slice(0,12), topRated:tr.results.slice(0,12), upcoming:u.results.slice(0,12) });
      setLoading(false);
    }).catch(()=>setLoading(false));
  }, []);

  return (
    <div className="space-y-14">
      <Spotlight movies={data.trending} dispatch={dispatch}/>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon:'🎭', title:'Mood Picker', desc:'Select how you feel, get instant recommendations.', view:'picker', grad:'from-violet-600/20 to-indigo-600/20', border:'border-violet-500/20' },
          { icon:'💬', title:'AI Movie Chat', desc:"Chat naturally and I'll find the perfect film for you.", view:'chat', grad:'from-blue-600/20 to-cyan-600/20', border:'border-blue-500/20' },
          { icon:'❤️', title:'My Watchlist', desc:`${state.watchlist.length} film${state.watchlist.length!==1?'s':''} saved. Never forget what to watch.`, view:'watchlist', grad:'from-rose-600/20 to-pink-600/20', border:'border-rose-500/20' },
        ].map(card=>(
          <button key={card.view} onClick={()=>dispatch({type:'NAV',view:card.view})}
            className={`p-6 rounded-2xl border ${card.border} bg-gradient-to-br ${card.grad} text-left hover:scale-[1.02] transition-all active:scale-100 group`}>
            <div className="text-3xl mb-3">{card.icon}</div>
            <h3 className="text-white font-black text-lg mb-2">{card.title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{card.desc}</p>
          </button>
        ))}
      </div>
      {[
        { title:'🔥 Trending This Week', movies:data.trending },
        { title:'🏆 All-Time Top Rated', movies:data.topRated },
        { title:'🎬 Coming Soon',        movies:data.upcoming },
      ].map(s=>(
        <section key={s.title}>
          <SectionTitle>{s.title}</SectionTitle>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {loading ? <Skeleton count={6}/> : s.movies.map(m=>(
              <MovieCard key={m.id} movie={m}
                onClick={()=>dispatch({type:'OPEN',id:m.id})}
                inWL={state.watchlist.some(w=>w.id===m.id)}
                onWL={movie=>dispatch({type:'TWL',movie})}/>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ── MOOD PICKER ───────────────────────────────

function PickerView({ state, dispatch }) {
  const [selected, setSelected] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState('vote_average.desc');
  const [minR, setMinR] = useState(7);

  const pick = useCallback(async (mood) => {
    setSelected(mood); setLoading(true);
    try {
      const d = await tmdb('/discover/movie', { with_genres:mood.genre, sort_by:sort, 'vote_average.gte':minR, 'vote_count.gte':300 });
      setMovies(d.results.slice(0,18));
    } catch(e){console.error(e);}
    setLoading(false);
  }, [sort, minR]);

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-4xl font-black text-white tracking-tight">How are you feeling?</h2>
        <p className="text-slate-500 mt-2">Pick your mood and we'll find the perfect films.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {MOODS.map(mood=>(
          <button key={mood.id} onClick={()=>pick(mood)}
            className={`relative p-6 rounded-2xl border text-left transition-all duration-200 active:scale-95 overflow-hidden ${selected?.id===mood.id?'border-white/20 shadow-2xl scale-[1.02]':'border-white/5 bg-slate-800/60 hover:border-white/10'}`}>
            {selected?.id===mood.id && <div className={`absolute inset-0 bg-gradient-to-br ${mood.grad} opacity-20`}/>}
            <div className="relative z-10">
              <div className="text-4xl mb-3">{mood.emoji}</div>
              <div className="font-black text-white text-sm">{mood.label}</div>
              <div className="text-slate-500 text-xs mt-1">{mood.desc}</div>
            </div>
          </button>
        ))}
      </div>
      {selected && (
        <>
          <div className="flex flex-wrap gap-3 items-center p-5 bg-slate-800/50 rounded-2xl border border-white/5">
            <span className="text-slate-400 text-sm font-bold">Filters:</span>
            <select value={sort} onChange={e=>setSort(e.target.value)}
              className="bg-slate-700/80 border border-white/10 text-white text-sm px-4 py-2.5 rounded-xl outline-none">
              <option value="vote_average.desc">⭐ Top Rated</option>
              <option value="popularity.desc">🔥 Most Popular</option>
              <option value="release_date.desc">🆕 Newest</option>
            </select>
            <select value={minR} onChange={e=>setMinR(e.target.value)}
              className="bg-slate-700/80 border border-white/10 text-white text-sm px-4 py-2.5 rounded-xl outline-none">
              <option value={0}>All Ratings</option>
              <option value={6}>6.0+</option>
              <option value={7}>7.0+</option>
              <option value={8}>8.0+</option>
            </select>
            <button onClick={()=>pick(selected)}
              className="bg-violet-600 hover:bg-violet-500 text-white text-sm px-5 py-2.5 rounded-xl font-bold transition-all active:scale-95">
              Apply
            </button>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">{selected.emoji}</span>
              <h3 className="text-2xl font-black text-white">{selected.label} Picks</h3>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {loading ? <Skeleton count={12}/> : movies.map(m=>(
                <MovieCard key={m.id} movie={m}
                  onClick={()=>dispatch({type:'OPEN',id:m.id})}
                  inWL={state.watchlist.some(w=>w.id===m.id)}
                  onWL={movie=>dispatch({type:'TWL',movie})}/>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── CHAT ──────────────────────────────────────

function ChatView({ state, dispatch, isPro, canChat, incrementChat }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);
  const [lastGenre, setLastGenre] = useState(18);
  const [limitReached, setLimitReached] = useState(false);
  const endRef = useRef(null);

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:'smooth'}); }, [state.chatMessages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;

    const allowed = await canChat();
    if (!allowed) { setLimitReached(true); return; }

    const text = input.trim();
    setInput('');
    setLimitReached(false);
    dispatch({ type:'MSG', msg:{id:Date.now(), sender:'user', text, movies:[]} });
    setLoading(true);
    await incrementChat();
    await new Promise(r=>setTimeout(r,700));
    const result = analyzeMessage(text, lastGenre, count);
    setCount(c=>c+1);
    let movies = [];
    if (result.type==='movies') {
      setLastGenre(result.genre);
      try {
        const d = await tmdb('/discover/movie', { with_genres:result.genre, sort_by:'vote_average.desc', 'vote_count.gte':400, page:Math.floor(Math.random()*3)+1 });
        movies = d.results.slice(0,4);
      } catch(e){console.error(e);}
    }
    dispatch({ type:'MSG', msg:{id:Date.now()+1, sender:'bot', text:result.reply, movies} });
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] min-h-[520px] max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-4xl font-black text-white tracking-tight">💬 Movie Chat</h2>
        <p className="text-slate-500 text-sm mt-1.5">Describe your mood — in English, Arabic, or French.</p>
      </div>
      <div className="flex-1 overflow-y-auto space-y-5 pr-1 mb-4">
        {state.chatMessages.map(msg=>(
          <div key={msg.id} className={`flex flex-col gap-3 ${msg.sender==='user'?'items-end':'items-start'}`}>
            <div className={`max-w-sm px-5 py-3.5 rounded-2xl text-sm font-medium leading-relaxed whitespace-pre-line ${msg.sender==='user'?'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-br-none':'bg-slate-800/90 border border-white/5 text-slate-100 rounded-bl-none'}`}>
              {msg.sender==='bot' && (
                <div className="flex items-center gap-1.5 mb-2">
                  <Logo size={14}/>
                  <span className="text-violet-400 font-black text-[10px] uppercase tracking-widest">MoodWatch</span>
                </div>
              )}
              {msg.text}
            </div>
            {msg.movies?.length>0 && (
              <div className="grid grid-cols-4 gap-2.5 max-w-sm w-full">
                {msg.movies.map(m=>(
                  <div key={m.id} onClick={()=>dispatch({type:'OPEN',id:m.id})} className="cursor-pointer group">
                    <div className="relative overflow-hidden rounded-xl border border-white/10 aspect-[2/3]">
                      <img src={img(m.poster_path,'w200')} alt={m.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"/>
                    </div>
                    <p className="text-amber-400 text-[9px] text-center mt-1 font-bold">⭐{m.vote_average?.toFixed(1)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-start">
            <div className="bg-slate-800/90 border border-white/5 px-5 py-3.5 rounded-2xl rounded-bl-none">
              <div className="flex items-center gap-1.5 mb-2"><Logo size={14}/><span className="text-violet-400 font-black text-[10px] uppercase tracking-widest">MoodWatch</span></div>
              <div className="flex gap-1.5 items-center">
                {[0,150,300].map(d=><div key={d} className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay:`${d}ms`}}/>)}
              </div>
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>

      <div className="flex gap-2 flex-wrap mb-3">
        {["I'm feeling sad 😢","I want action 💥","Something romantic 🥰","Scare me! 😱","I'm bored 😑","Make me laugh 😂"].map(s=>(
          <button key={s} onClick={()=>setInput(s)} className="bg-slate-800/80 hover:bg-slate-700 border border-white/5 text-slate-400 hover:text-white text-xs px-3 py-1.5 rounded-full transition-all">{s}</button>
        ))}
      </div>

      {limitReached && (
        <div className="mb-3 p-4 bg-violet-900/30 border border-violet-500/30 rounded-2xl flex items-center justify-between gap-3">
          <div>
            <p className="text-violet-300 font-black text-sm">💬 Daily limit reached (5 messages)</p>
            <p className="text-slate-400 text-xs mt-0.5">Upgrade to Pro for unlimited chat 🚀</p>
          </div>
          <button className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white px-4 py-2 rounded-xl font-black text-xs whitespace-nowrap">
            Upgrade ✨
          </button>
        </div>
      )}

      <div className="flex gap-3">
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
          placeholder="How are you feeling? (English, Arabic, or French)"
          disabled={limitReached}
          className="flex-1 bg-slate-800/80 border border-white/5 text-white placeholder:text-slate-600 rounded-2xl px-5 py-3.5 text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all disabled:opacity-40"/>
        <button onClick={send} disabled={!input.trim()||loading||limitReached}
          className="bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-30 text-white px-6 py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95">
          Send
        </button>
      </div>
    </div>
  );
}

// ── DETAIL ────────────────────────────────────

function DetailView({ id, state, dispatch }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    if(!id) return;
    window.scrollTo(0,0); setLoading(true);
    Promise.all([
      tmdb(`/movie/${id}`,{language:'en-US'}),
      tmdb(`/movie/${id}/credits`),
      tmdb(`/movie/${id}/similar`),
      tmdb(`/movie/${id}/videos`),
    ]).then(([movie,credits,similar,videos])=>{
      setData({movie, cast:credits.cast.slice(0,10), similar:similar.results.slice(0,12), videos:videos.results});
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[id]);

  if (loading) return <div className="animate-pulse space-y-6 pt-4"><div className="h-8 w-20 bg-slate-800 rounded-xl"/><div className="h-[360px] bg-slate-800 rounded-3xl"/></div>;
  if (!data) return <div className="py-20 text-center text-slate-500">Failed to load.</div>;

  const {movie,cast,similar,videos} = data;
  const trailer = videos.find(v=>v.type==='Trailer'&&v.site==='YouTube');
  const inWL = state.watchlist.some(m=>m.id===movie.id);
  const runtime = movie.runtime ? `${Math.floor(movie.runtime/60)}h ${movie.runtime%60}m` : 'N/A';

  return (
    <div className="space-y-10 pb-20">
      <button onClick={()=>dispatch({type:'BACK'})} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm font-bold">← Back</button>
      {movie.backdrop_path && (
        <div className="relative h-64 md:h-80 rounded-3xl overflow-hidden border border-white/5">
          <img src={img(movie.backdrop_path,'w1280')} alt="" className="w-full h-full object-cover brightness-40"/>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent"/>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-10">
        <div className="space-y-4">
          <img src={img(movie.poster_path,'w500')} alt={movie.title} className="w-full rounded-2xl shadow-2xl border border-white/5"/>
          <button onClick={()=>dispatch({type:'TWL',movie})}
            className={`w-full py-3 rounded-2xl font-black text-sm transition-all active:scale-95 ${inWL?'bg-rose-600 hover:bg-rose-500':'bg-slate-800 hover:bg-slate-700 border border-white/5'} text-white`}>
            {inWL?'❤️ In Watchlist':'🤍 Add to Watchlist'}
          </button>
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-white/5 space-y-3 text-sm">
            {[['Rating',<StarRating rating={movie.vote_average}/>],['Year',movie.release_date?.slice(0,4)],['Runtime',runtime],movie.budget>0&&['Budget',`$${(movie.budget/1e6).toFixed(0)}M`]].filter(Boolean).map(([k,v])=>(
              <div key={k} className="flex justify-between items-center"><span className="text-slate-500">{k}</span><span className="text-white font-bold">{v}</span></div>
            ))}
          </div>
        </div>
        <div className="space-y-8">
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              {movie.genres?.map(g=><span key={g.id} className="bg-violet-900/40 text-violet-300 border border-violet-700/30 px-3 py-1 rounded-full text-xs font-bold">{g.name}</span>)}
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">{movie.title}</h1>
            {movie.tagline && <p className="text-slate-500 text-base italic mt-2">"{movie.tagline}"</p>}
          </div>
          <div><h3 className="text-white font-black mb-2">Overview</h3><p className="text-slate-400 leading-relaxed text-sm">{movie.overview}</p></div>
          {trailer && (
            <div>
              <h3 className="text-white font-black mb-3">🎬 Official Trailer</h3>
              <div className="aspect-video rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
                <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${trailer.key}`} title="Trailer" frameBorder="0" allowFullScreen/>
              </div>
            </div>
          )}
          {cast.length>0 && (
            <div>
              <h3 className="text-white font-black mb-4">Cast</h3>
              <div className="grid grid-cols-5 gap-3">
                {cast.map(c=>(
                  <div key={c.id} className="text-center group">
                    <div className="aspect-square rounded-xl overflow-hidden border border-white/5 mb-1.5 bg-slate-800">
                      <img src={img(c.profile_path,'w185')} alt={c.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform"/>
                    </div>
                    <p className="text-white text-[10px] font-bold truncate">{c.name}</p>
                    <p className="text-slate-600 text-[9px] truncate">{c.character}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {similar.length>0 && (
            <div>
              <h3 className="text-white font-black mb-4">Similar Films</h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {similar.map(m=>(
                  <MovieCard key={m.id} movie={m}
                    onClick={()=>dispatch({type:'OPEN',id:m.id})}
                    inWL={state.watchlist.some(w=>w.id===m.id)}
                    onWL={movie=>dispatch({type:'TWL',movie})}/>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── WATCHLIST ─────────────────────────────────

function WatchlistView({ state, dispatch }) {
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tight">❤️ My Watchlist</h2>
          <p className="text-slate-500 mt-1">{state.watchlist.length} film{state.watchlist.length!==1?'s':''} saved</p>
        </div>
        {state.watchlist.length>0 && (
          <button onClick={()=>{saveWL([]);window.location.reload();}} className="text-slate-600 hover:text-rose-400 text-sm transition-colors font-medium">Clear all</button>
        )}
      </div>
      {state.watchlist.length===0 ? (
        <div className="py-32 text-center space-y-6">
          <div className="text-8xl opacity-20">🎬</div>
          <h3 className="text-2xl font-black text-slate-600">Your watchlist is empty</h3>
          <p className="text-slate-600 text-sm">Browse films and tap 🤍 to save them here.</p>
          <button onClick={()=>dispatch({type:'NAV',view:'picker'})}
            className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-sm transition-all active:scale-95">
            Discover Films
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
          {state.watchlist.map(m=>(
            <MovieCard key={m.id} movie={m}
              onClick={()=>dispatch({type:'OPEN',id:m.id})}
              inWL={true}
              onWL={movie=>dispatch({type:'TWL',movie})}/>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SEARCH ────────────────────────────────────

function SearchView({ state, dispatch }) {
  const [loading, setLoading] = useState(false);
  useEffect(()=>{
    if(!state.searchQuery) return;
    setLoading(true);
    const t = setTimeout(async()=>{
      try { const d=await tmdb('/search/movie',{query:state.searchQuery,page:1}); dispatch({type:'SRQ',r:d.results}); }
      catch(e){console.error(e);}
      setLoading(false);
    },500);
    return ()=>clearTimeout(t);
  },[state.searchQuery,dispatch]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-black text-white">Results for <span className="text-violet-400">"{state.searchQuery}"</span></h2>
        <p className="text-slate-600 mt-1 text-sm">{state.searchResults.length} films found</p>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
        {loading ? <Skeleton count={12}/> : state.searchResults.map(m=>(
          <MovieCard key={m.id} movie={m}
            onClick={()=>dispatch({type:'OPEN',id:m.id})}
            inWL={state.watchlist.some(w=>w.id===m.id)}
            onWL={movie=>dispatch({type:'TWL',movie})}/>
        ))}
      </div>
    </div>
  );
}

// ── AUTH PAGE ─────────────────────────────────

function AuthPage() {
  const { loginGoogle, loginEmail, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) return setError('Please fill all fields');
    if (mode==='register' && !name) return setError('Please enter your name');
    setLoading(true); setError('');
    try {
      if (mode==='login') await loginEmail(email, password);
      else await register(name, email, password);
    } catch(e) {
      setError(e.message.includes('invalid')||e.message.includes('wrong-password') ? 'Invalid email or password' : e.message.includes('exists') ? 'Email already in use' : 'Something went wrong');
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError(''); setLoading(true);
    try { await loginGoogle(); }
    catch(e) { setError('Google sign-in failed. Try again.'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-violet-900/10 rounded-full blur-[120px]"/>
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-indigo-900/10 rounded-full blur-[120px]"/>
      </div>
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center space-y-3">
          <div className="flex justify-center"><Logo size={64}/></div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">MoodWatch</h1>
          <p className="text-slate-500 text-sm">Your personal cinema guide</p>
        </div>
        <div className="bg-slate-900/80 border border-white/5 rounded-3xl p-8 shadow-2xl backdrop-blur space-y-6">
          <div className="flex bg-slate-800/60 rounded-2xl p-1">
            {['login','register'].map(m=>(
              <button key={m} onClick={()=>{setMode(m);setError('');}}
                className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${mode===m?'bg-violet-600 text-white shadow-lg':'text-slate-500 hover:text-white'}`}>
                {m==='login'?'Sign In':'Create Account'}
              </button>
            ))}
          </div>
          <button onClick={handleGoogle} disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 shadow-lg">
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.2l6.8-6.8C35.8 2.4 30.2 0 24 0 14.7 0 6.7 5.4 2.7 13.3l7.9 6.1C12.5 13 17.8 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.1 7-17.1z"/>
              <path fill="#FBBC05" d="M10.6 28.6A14.8 14.8 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A23.9 23.9 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l8-6.1z"/>
              <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.6-5.9c-2 1.4-4.6 2.2-7.6 2.2-6.2 0-11.5-4.2-13.4-9.8l-8 6.1C6.7 42.6 14.7 48 24 48z"/>
            </svg>
            Continue with Google
          </button>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-800"/>
            <span className="text-slate-600 text-xs font-bold">OR</span>
            <div className="flex-1 h-px bg-slate-800"/>
          </div>
          <div className="space-y-3">
            {mode==='register' && (
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name"
                className="w-full bg-slate-800/60 border border-white/5 text-white placeholder:text-slate-600 rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all"/>
            )}
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Email address"
              className="w-full bg-slate-800/60 border border-white/5 text-white placeholder:text-slate-600 rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all"/>
            <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="Password"
              onKeyDown={e=>e.key==='Enter'&&handleSubmit()}
              className="w-full bg-slate-800/60 border border-white/5 text-white placeholder:text-slate-600 rounded-2xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-violet-500 transition-all"/>
          </div>
          {error && <div className="bg-red-900/30 border border-red-500/30 text-red-400 text-xs font-medium px-4 py-3 rounded-xl">⚠️ {error}</div>}
          <button onClick={handleSubmit} disabled={loading}
            className="w-full bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-violet-900/30">
            {loading ? '...' : mode==='login' ? 'Sign In' : 'Create Account'}
          </button>
        </div>
        <p className="text-center text-slate-600 text-xs">By continuing, you agree to our Terms of Service</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
//  APP SHELL
// ═══════════════════════════════════════════════


const NAV = [
  {view:'home',      label:'Home',      icon:'🏠'},
  {view:'picker',    label:'Mood',      icon:'🎭'},
  {view:'chat',      label:'Chat',      icon:'💬'},
  {view:'watchlist', label:'Watchlist', icon:'❤️'},
  {view:'account',   label:'Account',   icon:'👤'},
];

// ── ACCOUNT VIEW ──────────────────────────────

function AccountView({ user, plan, isPro, logout, dispatch }) {
  const planLabel = plan?.plan === 'trial' ? '🎁 Pro Trial' : plan?.plan === 'pro' ? '💎 Pro' : '🆓 Free';
  const planColor = plan?.plan === 'free' ? 'text-slate-400' : 'text-violet-400';

  const trialHoursLeft = () => {
    if (plan?.plan !== 'trial') return null;
    const diff = new Date(plan.trialEnd) - new Date();
    const hours = Math.max(0, Math.floor(diff / 1000 / 60 / 60));
    const mins = Math.max(0, Math.floor((diff / 1000 / 60) % 60));
    return `${hours}h ${mins}m`;
  };

  const chatLeft = () => {
    if (isPro()) return 'Unlimited';
    const today = new Date().toDateString();
    const used = plan?.chatDate === today ? plan?.chatCount || 0 : 0;
    return `${Math.max(0, 5 - used)} / 5 today`;
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-20">
      <div>
        <h2 className="text-4xl font-black text-white tracking-tight">👤 My Account</h2>
        <p className="text-slate-500 mt-1">Manage your plan and preferences.</p>
      </div>

      <div className="bg-slate-900/80 border border-white/5 rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-2xl font-black text-white">
            {user?.displayName?.[0] || user?.email?.[0] || '?'}
          </div>
          <div>
            <p className="text-white font-black text-lg">{user?.displayName || 'User'}</p>
            <p className="text-slate-500 text-sm">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900/80 border border-white/5 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Current Plan</p>
            <p className={`text-2xl font-black ${planColor}`}>{planLabel}</p>
            {plan?.plan === 'trial' && (
              <p className="text-amber-400 text-xs mt-1">⏱ {trialHoursLeft()} remaining</p>
            )}
          </div>
          {!isPro() && (
            <button className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white px-5 py-2.5 rounded-2xl font-black text-sm">
              Upgrade ✨
            </button>
          )}
        </div>
        <div className="space-y-3 pt-2 border-t border-white/5">
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">💬 Chat messages</span>
            <span className={`text-sm font-bold ${isPro() ? 'text-emerald-400' : 'text-white'}`}>{chatLeft()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">❤️ Watchlist</span>
            <span className={`text-sm font-bold ${isPro() ? 'text-emerald-400' : 'text-white'}`}>
              {isPro() ? 'Unlimited' : `${plan?.watchlistCount || 0} / 10`}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400 text-sm">🎭 Mood Picker</span>
            <span className="text-sm font-bold text-emerald-400">Unlimited</span>
          </div>
        </div>
      </div>

      {!isPro() && (
        <div className="bg-gradient-to-br from-violet-900/40 to-indigo-900/40 border border-violet-500/20 rounded-3xl p-6 space-y-4">
          <h3 className="text-white font-black text-lg">Upgrade to Pro 💎</h3>
          <div className="space-y-2.5">
            {['✅ Unlimited AI Chat messages','✅ Unlimited Watchlist','✅ Ad-free experience','✅ Referral System — earn money','✅ Priority support'].map(f => (
              <p key={f} className="text-slate-300 text-sm">{f}</p>
            ))}
          </div>
          <button className="w-full bg-gradient-to-br from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95">
            Get Pro — $4.99/month
          </button>
          <p className="text-slate-600 text-xs text-center">Cancel anytime. No hidden fees.</p>
        </div>
      )}

      <button onClick={logout}
        className="w-full bg-slate-800/60 hover:bg-red-900/30 border border-white/5 hover:border-red-500/20 text-slate-400 hover:text-red-400 py-3.5 rounded-2xl font-bold text-sm transition-all">
        Sign Out
      </button>
    </div>
  );
}

export default function App() {
  const { user, logout } = useAuth();
  const { plan, isPro, canChat, incrementChat, canAddWatchlist, incrementWatchlist } = usePlan(user);
  const [state, dispatch] = useReducer(reducer, INIT);
  const [scrolled, setScrolled] = useState(false);

  useEffect(()=>{
    const f=()=>setScrolled(window.scrollY>20);
    window.addEventListener('scroll',f);
    return ()=>window.removeEventListener('scroll',f);
  },[]);

  if (!user) return <AuthPage/>;

  const renderView = () => {
    switch(state.view) {
      case 'home':      return <HomeView state={state} dispatch={dispatch}/>;
      case 'picker':    return <PickerView state={state} dispatch={dispatch}/>;
      case 'chat':      return <ChatView state={state} dispatch={dispatch} isPro={isPro} canChat={canChat} incrementChat={incrementChat}/>;
      case 'watchlist': return <WatchlistView state={state} dispatch={dispatch} canAddWatchlist={canAddWatchlist} incrementWatchlist={incrementWatchlist}/>;
      case 'search':    return <SearchView state={state} dispatch={dispatch}/>;
      case 'detail':    return <DetailView id={state.selectedId} state={state} dispatch={dispatch}/>;
      case 'account':   return <AccountView user={user} plan={plan} isPro={isPro} logout={logout} dispatch={dispatch}/>;
      default:          return <HomeView state={state} dispatch={dispatch}/>;
    }
  };

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100">
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-violet-900/10 rounded-full blur-[120px]"/>
        <div className="absolute top-1/2 -right-40 w-[400px] h-[400px] bg-indigo-900/10 rounded-full blur-[120px]"/>
      </div>

      <header className={`sticky top-0 z-50 transition-all duration-500 ${scrolled?'bg-[#080c14]/95 backdrop-blur-2xl border-b border-white/5 shadow-2xl shadow-black/50':''}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-5">
          <button onClick={()=>dispatch({type:'NAV',view:'home'})} className="flex items-center gap-2 shrink-0 group">
            <div className="group-hover:scale-110 transition-transform duration-200"><Logo size={34}/></div>
            <div className="leading-tight">
              <span className="text-base font-black tracking-tight bg-gradient-to-r from-violet-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent">MoodWatch</span>
              <div className="text-[8px] text-slate-600 font-bold uppercase tracking-widest -mt-0.5 hidden sm:block">Your Cinema Guide</div>
            </div>
          </button>

          <div className="flex-1 max-w-md relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 text-sm pointer-events-none">🔍</span>
            <input type="text" value={state.searchQuery} onChange={e=>dispatch({type:'SEARCH',q:e.target.value})}
              placeholder="Search any film..."
              className="w-full bg-slate-800/50 border border-white/5 rounded-xl pl-9 pr-9 py-2.5 text-sm placeholder:text-slate-600 text-white outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"/>
            {state.searchQuery && (
              <button onClick={()=>dispatch({type:'SEARCH',q:''})} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white text-xs transition-colors">✕</button>
            )}
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.filter(n=>n.view!=='account').map(n=>(
              <button key={n.view} onClick={()=>dispatch({type:'NAV',view:n.view})}
                className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${state.view===n.view?'bg-violet-600/20 text-violet-300 border border-violet-500/20':'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                <span>{n.icon}</span>
                <span>{n.label}</span>
                {n.view==='watchlist' && state.watchlist.length>0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {state.watchlist.length>9?'9+':state.watchlist.length}
                  </span>
                )}
              </button>
            ))}
            <div className="flex items-center gap-2 ml-2 pl-3 border-l border-white/10">
              <button onClick={()=>dispatch({type:'NAV',view:'account'})}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${state.view==='account'?'bg-violet-600/20 text-violet-300 border border-violet-500/20':'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                👤 {user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Account'}
              </button>
            </div>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 pb-32 md:pb-12">
        {renderView()}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#080c14]/98 backdrop-blur-2xl border-t border-white/5">
        <div className="flex">
          {NAV.map(n=>(
            <button key={n.view} onClick={()=>dispatch({type:'NAV',view:n.view})}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-all relative ${state.view===n.view?'text-violet-400':'text-slate-600'}`}>
              <span className={`text-xl transition-transform ${state.view===n.view?'scale-110':''}`}>{n.icon}</span>
              <span className="text-[9px] font-black uppercase tracking-wider">{n.label}</span>
              {state.view===n.view && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-violet-400"/>}
              {n.view==='watchlist' && state.watchlist.length>0 && (
                <span className="absolute top-2 right-1/4 bg-rose-500 text-[8px] font-black text-white w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {state.watchlist.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}