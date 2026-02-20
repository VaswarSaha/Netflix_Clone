import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Info, Plus, Check, Search, Bell,
  ChevronDown, ChevronLeft, ChevronRight, X,
  Facebook, Instagram, Twitter, Youtube
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Replace with your API key:
const API_KEY = 'e950e51d5d49e85f7c2f17f01eb23ba3';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/original';
const IMG_SMALL = 'https://image.tmdb.org/t/p/w500';

const LOCAL_UPLOADED_BG = '/mnt/data/856fff5a-28b0-4754-8909-d6b83a742878.png';


// -------------------------------------------------------------
// API caching
// -------------------------------------------------------------
const apiCache = new Map();
async function fetchWithCache(endpoint) {
  const url = `${BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${API_KEY}`;
  if (apiCache.has(url)) return apiCache.get(url);

  const res = await fetch(url);
  if (!res.ok) throw new Error('Network error');

  const data = await res.json();
  apiCache.set(url, data.results || []);
  return data.results || [];
}


// -------------------------------------------------------------
// Utility Hook: Debounce
// -------------------------------------------------------------
function useDebouncedCallback(fn, delay) {
  const timer = useRef(null);
  const callback = useCallback((...args) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);

  useEffect(() => () => clearTimeout(timer.current), []);
  return callback;
}


// -------------------------------------------------------------
// LazyImage
// -------------------------------------------------------------
function LazyImage({ src, alt, className = '', style = {} }) {
  const ref = useRef();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        entries => {
          entries.forEach(e => {
            if (e.isIntersecting) setVisible(true);
          });
        },
        { rootMargin: '200px' }
      );
      io.observe(el);
      return () => io.disconnect();
    } else {
      setVisible(true);
    }
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`} style={style}>
      {visible ? (
        <img
          src={src}
          alt={alt || ''}
          loading="lazy"
          className="w-full h-full object-cover block"
        />
      ) : (
        <div className="w-full h-full bg-neutral-800 animate-pulse" />
      )}
    </div>
  );
}


function formatTitle(key) {
  const map = {
    trending: "Trending Now",
    topRated: "Top Rated",
    netflixOriginals: "Netflix Originals",
    action: "Action Thrillers",
    comedy: "Comedies",
    horror: "Horror Movies",
    romance: "Romantic Movies",
    documentaries: "Documentaries",
    trendingTV: "Trending TV Shows",
    popularTV: "Popular on Netflix",
    topRatedTV: "Top Rated Shows",
    trendingMovies: "Trending Movies",
    popularMovies: "Popular Movies",
    topRatedMovies: "Top Rated Movies",
    upcoming: "Coming Soon",
    korean: "Korean Movies & TV",
    hindi: "Hindi Movies & TV",
  };
  return map[key] || key;
}


// -------------------------------------------------------------
// Main Component
// -------------------------------------------------------------
export default function NetflixCloneOptimized() {

  const LS_MYLIST = 'nc_mylist_v1';
  const LS_REMEMBER = 'nc_remember_v1';

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const remember = localStorage.getItem(LS_REMEMBER) === 'true';
    if (remember) return true;
    return sessionStorage.getItem('netflixLoggedIn') === 'true';
  });

  const [currentPage, setCurrentPage] = useState('home');
  const [featured, setFeatured] = useState(null);
  const [categories, setCategories] = useState({});
  const [myList, setMyList] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_MYLIST)) || []; }
    catch { return []; }
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [scrolled, setScrolled] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [loading, setLoading] = useState(false);

  const [selectedMovie, setSelectedMovie] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const openModal = (movie) => {
    setSelectedMovie(movie);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => setSelectedMovie(null), 300);
  };

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    if (isLoggedIn) loadPage(currentPage);
  }, [isLoggedIn, currentPage]);

  useEffect(() => {
    localStorage.setItem(LS_MYLIST, JSON.stringify(myList));
  }, [myList]);

  const loadPage = useCallback(async (page) => {
    setLoading(true);
    try {
      let categoryData = {};

      if (page === "home") {
        categoryData = {
          trending: await fetchWithCache('/trending/all/week'),
          topRated: await fetchWithCache('/movie/top_rated'),
          netflixOriginals: await fetchWithCache('/discover/tv?with_networks=213'),
          action: await fetchWithCache('/discover/movie?with_genres=28'),
          comedy: await fetchWithCache('/discover/movie?with_genres=35'),
        };
      }
      if (page === 'tvshows') {
        categoryData = {
          trendingTV: await fetchWithCache('/trending/tv/week'),
          popularTV: await fetchWithCache('/tv/popular'),
          topRatedTV: await fetchWithCache('/tv/top_rated'),
        };
      }
      if (page === 'movies') {
        categoryData = {
          trendingMovies: await fetchWithCache('/trending/movie/week'),
          popularMovies: await fetchWithCache('/movie/popular'),
          topRatedMovies: await fetchWithCache('/movie/top_rated'),
        };
      }
      if (page === 'newpopular') {
        categoryData = {
          trending: await fetchWithCache('/trending/all/day'),
          upcoming: await fetchWithCache('/movie/upcoming'),
        };
      }
      if (page === 'languages') {
        categoryData = {
          korean: await fetchWithCache('/discover/movie?with_original_language=ko'),
          hindi: await fetchWithCache('/discover/movie?with_original_language=hi'),
        };
      }

      const normalize = (arr) =>
        arr.map(i => ({
          ...i,
          poster_path: i.poster_path ? `${IMG_SMALL}${i.poster_path}` : null,
          backdrop_path: i.backdrop_path ? `${IMG_BASE}${i.backdrop_path}` : null
        }));

      const normalized = Object.fromEntries(
        Object.entries(categoryData).map(([k, v]) => [k, normalize(v)])
      );

      setCategories(normalized);
      const all = Object.values(normalized).flat();
      setFeatured(all[Math.floor(Math.random() * all.length)] || null);

    } catch (e) {
      console.error("Load error:", e);
    }
    setLoading(false);
  }, []);

  const handleSearch = async (q) => {
    if (!q.trim()) return;
    setLoading(true);
    const res = await fetchWithCache(`/search/multi?query=${encodeURIComponent(q)}`);
    const normalized = res.map(i => ({
      ...i,
      poster_path: i.poster_path ? `${IMG_SMALL}${i.poster_path}` : null,
      backdrop_path: i.backdrop_path ? `${IMG_BASE}${i.backdrop_path}` : null
    }));
    setSearchResults(normalized.filter(i => i.poster_path));
    setCurrentPage('search');
    setLoading(false);
  };

  const debouncedSearch = useDebouncedCallback(handleSearch, 400);

  const toggleMyList = (item) => {
    setMyList(prev => {
      const exists = prev.find(i => i.id === item.id);
      return exists ? prev.filter(i => i.id !== item.id) : [...prev, item];
    });
  };

  const isInMyList = (id) => myList.some(i => i.id === id);

  const handleLogin = (remember) => {
    if (remember) localStorage.setItem(LS_REMEMBER, 'true');
    sessionStorage.setItem('netflixLoggedIn', 'true');
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) return <AuthScreen onLogin={handleLogin} />;

  return (
    <div className="bg-black min-h-screen text-white relative">

      {/* HEADER */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'backdrop-blur-lg bg-black/70' : 'bg-gradient-to-b from-black/80 to-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">

          <div className="flex items-center gap-8">
            <h1
              onClick={() => setCurrentPage('home')}
              className="text-[#E50914] text-3xl font-extrabold cursor-pointer tracking-tight"
            >NETFLIX</h1>

            <nav className="hidden md:flex gap-6 text-sm">
              {[
                { label: 'Home', page: 'home' },
                { label: 'TV Shows', page: 'tvshows' },
                { label: 'Movies', page: 'movies' },
                { label: 'New & Popular', page: 'newpopular' },
                { label: 'My List', page: 'mylist' },
                { label: 'Browse by Languages', page: 'languages' },
              ].map(n => (
                <button
                  key={n.page}
                  onClick={() => setCurrentPage(n.page)}
                  className={`transition ${currentPage === n.page ? 'text-white font-semibold' : 'text-neutral-300 hover:text-white'}`}
                >
                  {n.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Search
              onClick={() => setShowSearchBar(true)}
              className="w-6 h-6 cursor-pointer hover:text-neutral-300 transition"
            />
            <Bell className="hidden md:block w-6 h-6 cursor-pointer hover:text-neutral-300 transition" />

            <div className="relative">
              <div
                onClick={() => setShowProfileMenu(v => !v)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png"
                  className="w-8 h-8 rounded"
                  alt="Profile"
                />
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
              </div>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute right-0 mt-3 w-48 bg-black border border-neutral-700 rounded-lg shadow-xl"
                  >
                    <div className="px-4 py-2 hover:bg-white/10 cursor-pointer text-sm">Account</div>
                    <div className="px-4 py-2 hover:bg-white/10 cursor-pointer text-sm">Settings</div>
                    <div className="border-t border-neutral-700" />
                    <div
                      onClick={() => { sessionStorage.clear(); localStorage.removeItem(LS_REMEMBER); setIsLoggedIn(false); }}
                      className="px-4 py-2 hover:bg-white/10 cursor-pointer text-sm"
                    >
                      Sign Out
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <AnimatePresence>
          {showSearchBar && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-6 py-3 bg-black/95 border-b border-neutral-800 overflow-hidden"
            >
              <div className="max-w-2xl mx-auto flex items-center bg-neutral-900 rounded overflow-hidden border border-neutral-700">
                <Search className="w-5 h-5 text-neutral-400 ml-3" />
                <input
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    debouncedSearch(e.target.value);
                  }}
                  autoFocus
                  placeholder="Titles, people, genres..."
                  className="flex-1 bg-transparent px-3 py-3 outline-none text-sm text-white placeholder-neutral-500"
                />
                <X
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setShowSearchBar(false);
                  }}
                  className="w-5 h-5 text-neutral-400 mr-3 cursor-pointer hover:text-white transition"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* MAIN */}
      <main className="pt-[90px]">

        {loading && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200]">
            <div className="w-16 h-16 border-4 border-neutral-700 border-t-[#E50914] rounded-full animate-spin" />
          </div>
        )}

        {/* HERO — unchanged, original behaviour */}
        {featured && (
          <HeroSection featured={featured} openModal={openModal} />
        )}

        {/* ROWS — cards open modal on hover */}
        <section className="relative -mt-24 space-y-12 px-6 md:px-12 pb-20">
          {Object.entries(categories).map(([key, items]) => (
            <MovieRow
              key={key}
              title={formatTitle(key)}
              items={items}
              onToggleList={toggleMyList}
              isInMyList={isInMyList}
              openModal={openModal}
            />
          ))}
        </section>

        {/* SEARCH RESULTS */}
        {currentPage === 'search' && (
          <section className="px-6 md:px-12 pb-20">
            <h2 className="text-xl md:text-2xl font-semibold mb-8">
              {searchResults.length ? `Results for "${searchQuery}"` : `No results for "${searchQuery}"`}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {searchResults.map(item => (
                <MovieCard
                  key={item.id}
                  item={item}
                  onToggleList={toggleMyList}
                  isInList={isInMyList(item.id)}
                  openModal={openModal}
                />
              ))}
            </div>
          </section>
        )}

        {/* MY LIST */}
        {currentPage === 'mylist' && (
          <section className="px-6 md:px-12 pb-20">
            <h2 className="text-3xl md:text-4xl font-bold mb-10">My List</h2>
            {myList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-full bg-neutral-800 flex items-center justify-center mb-6">
                  <Plus className="w-10 h-10 text-neutral-500" />
                </div>
                <p className="text-neutral-400 text-lg font-medium">Your list is empty</p>
                <p className="text-neutral-600 text-sm mt-2">Add movies and shows to keep track of what you want to watch.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {myList.map(item => (
                  <MovieCard
                    key={item.id}
                    item={item}
                    onToggleList={toggleMyList}
                    isInList={true}
                    openModal={openModal}
                  />
                ))}
              </div>
            )}
          </section>
        )}

      </main>

      {/* MODAL */}
      <MovieModal
        show={showModal}
        movie={selectedMovie}
        closeModal={closeModal}
        toggleMyList={toggleMyList}
        isInMyList={isInMyList}
      />

      {/* FOOTER */}
      <footer className="px-6 md:px-12 py-16 border-t border-neutral-800 bg-black">
        <div className="max-w-5xl mx-auto">

          <div className="flex gap-6 mb-8">
            <a href="#" aria-label="Facebook" className="text-neutral-400 hover:text-white transition">
              <Facebook className="w-5 h-5" />
            </a>
            <a href="#" aria-label="Instagram" className="text-neutral-400 hover:text-white transition">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="#" aria-label="Twitter" className="text-neutral-400 hover:text-white transition">
              <Twitter className="w-5 h-5" />
            </a>
            <a href="#" aria-label="YouTube" className="text-neutral-400 hover:text-white transition">
              <Youtube className="w-5 h-5" />
            </a>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-y-4 gap-x-6 text-neutral-500 text-xs mb-10">
            {[
              "Audio Description", "Help Centre", "Gift Cards", "Media Centre",
              "Investor Relations", "Jobs", "Terms of Use", "Privacy",
              "Legal Notices", "Cookie Preferences", "Corporate Information", "Contact Us",
            ].map(link => (
              <span key={link} className="hover:underline cursor-pointer hover:text-neutral-300 transition">
                {link}
              </span>
            ))}
          </div>

          <button className="border border-neutral-600 text-neutral-400 text-xs px-4 py-2 mb-8 hover:border-neutral-400 hover:text-neutral-200 transition rounded-sm">
            Service Code
          </button>

          <p className="text-neutral-600 text-xs">
            © {new Date().getFullYear()} Netflix Clone. This is a fan-made project for educational purposes only. Not affiliated with Netflix, Inc.
          </p>
        </div>
      </footer>

    </div>
  );
}


// -------------------------------------------------------------
// HERO SECTION — original, unchanged
// -------------------------------------------------------------
function HeroSection({ featured, openModal }) {
  const [hovered, setHovered] = useState(false);

  return (
    <section
      className="relative h-[55vw] max-h-[720px] overflow-hidden cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <img
        src={featured.backdrop_path}
        className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${hovered ? 'scale-105' : 'scale-100'}`}
        alt=""
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

      <AnimatePresence>
        {hovered && (
          <motion.div
            className="absolute inset-0 bg-black/60 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center max-w-2xl px-8 space-y-4">

              <motion.span
                className="inline-block bg-[#E50914] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest"
                initial={{ y: -12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.05 }}
              >
                Featured
              </motion.span>

              <motion.h2
                className="text-4xl md:text-5xl font-extrabold drop-shadow-lg leading-tight"
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                {featured.title || featured.name}
              </motion.h2>

              <motion.div
                className="flex items-center justify-center gap-4 text-sm text-neutral-300 flex-wrap"
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
              >
                <span className="text-green-400 font-bold text-base">
                  {Math.round((featured.vote_average || 0) * 10)}% Match
                </span>
                <span>{(featured.release_date || featured.first_air_date || '').slice(0, 4)}</span>
                <span className="border border-neutral-500 px-2 py-0.5 rounded text-xs">HD</span>
              </motion.div>

              <motion.p
                className="text-neutral-300 text-sm md:text-base leading-relaxed"
                style={{
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {featured.overview || 'No description available.'}
              </motion.p>

              <motion.div
                className="flex justify-center gap-4 pt-2"
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25 }}
              >
                <button className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-md font-semibold hover:bg-neutral-200 transition text-sm">
                  <Play className="w-5 h-5 fill-black" /> Play
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); openModal(featured); }}
                  className="flex items-center gap-2 bg-white/20 text-white px-6 py-3 rounded-md border border-white/30 hover:bg-white/30 transition text-sm"
                >
                  <Info className="w-5 h-5" /> More Info
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!hovered && (
          <motion.div
            className="absolute bottom-[18%] left-1/2 -translate-x-1/2 text-center max-w-3xl px-6 w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <h1 className="text-4xl md:text-6xl font-extrabold drop-shadow-lg leading-tight">
              {featured.title || featured.name}
            </h1>
            <p className="mt-4 text-neutral-300 text-sm md:text-lg">
              {(featured.overview || '').slice(0, 220)}...
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <button className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-md font-semibold hover:bg-neutral-200 transition">
                <Play className="w-5 h-5 fill-black" /> Play
              </button>
              <button
                onClick={() => openModal(featured)}
                className="flex items-center gap-2 bg-white/20 text-white px-6 py-3 rounded-md border border-white/20 hover:bg-white/30 transition"
              >
                <Info className="w-5 h-5" /> More Info
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}


// -------------------------------------------------------------
// HOVERABLE CARD — used inside MovieRow
// Opens modal automatically after 500ms hover (no click needed)
// -------------------------------------------------------------
function HoverCard({ item, onToggleList, isInList, openModal }) {
  const hoverTimer = useRef(null);
  const [hovered, setHovered] = useState(false);

  const handleMouseEnter = () => {
    setHovered(true);
    hoverTimer.current = setTimeout(() => {
      openModal(item);
    }, 500); // 500ms feels instant but avoids accidental triggers
  };

  const handleMouseLeave = () => {
    setHovered(false);
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  return (
    <div
      className="min-w-[150px] md:min-w-[220px] relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Poster image with scale + ring on hover */}
      <div
        className={`w-full h-[210px] md:h-[320px] rounded-lg overflow-hidden cursor-pointer transition-all duration-300 ${
          hovered ? 'scale-105 ring-2 ring-white/70 shadow-2xl shadow-black/60' : 'scale-100'
        }`}
        onClick={() => openModal(item)}
      >
        <LazyImage
          src={item.poster_path || item.backdrop_path}
          alt={item.title || item.name}
        />

        {/* Hover overlay on card image */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              className="absolute inset-0 bg-black/40 flex items-end justify-center pb-4 rounded-lg pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <span className="text-white text-xs font-medium bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
                Loading details…
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Title */}
      <h4
        onClick={() => openModal(item)}
        className={`mt-2 text-sm md:text-base font-semibold truncate cursor-pointer transition ${
          hovered ? 'text-red-400' : 'hover:text-red-400'
        }`}
      >
        {item.title || item.name}
      </h4>

      {/* Add / Remove button */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleList(item); }}
        className="mt-2 bg-white text-black p-2 rounded-full hover:bg-neutral-200 transition"
        title={isInList ? "Remove from My List" : "Add to My List"}
      >
        {isInList ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </button>
    </div>
  );
}


// -------------------------------------------------------------
// MOVIE ROW — uses HoverCard so each card auto-opens on hover
// -------------------------------------------------------------
function MovieRow({ title, items, onToggleList, isInMyList, openModal }) {
  const scrollRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const updateControls = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeft(scrollLeft > 10);
    setShowRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => updateControls(), [items]);

  const scroll = (dir) => {
    const amount = dir === 'left' ? -window.innerWidth * 0.5 : window.innerWidth * 0.5;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(updateControls, 300);
  };

  return (
    <div className="relative group">
      <h3 className="text-xl font-semibold mb-4">{title}</h3>

      {showLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-40 bg-black/50 hover:bg-black/80 w-10 h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition rounded-r"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      <div
        ref={scrollRef}
        onScroll={updateControls}
        className="flex gap-4 overflow-x-auto scroll-smooth no-scrollbar py-2"
      >
        {items.map(item => (
          <HoverCard
            key={item.id}
            item={item}
            onToggleList={onToggleList}
            isInList={isInMyList(item.id)}
            openModal={openModal}
          />
        ))}
      </div>

      {showRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-40 bg-black/50 hover:bg-black/80 w-10 h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition rounded-l"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}


// -------------------------------------------------------------
// GRID MOVIE CARD — used in Search & My List
// Also opens modal on hover (500ms delay)
// -------------------------------------------------------------
function MovieCard({ item, onToggleList, isInList, openModal }) {
  const hoverTimer = useRef(null);
  const [hovered, setHovered] = useState(false);

  const handleMouseEnter = () => {
    setHovered(true);
    hoverTimer.current = setTimeout(() => {
      openModal(item);
    }, 500);
  };

  const handleMouseLeave = () => {
    setHovered(false);
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  return (
    <div
      className="group relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`w-full h-[300px] rounded-lg overflow-hidden cursor-pointer transition-all duration-300 ${
          hovered ? 'scale-105 ring-2 ring-white/70 shadow-2xl shadow-black/60' : 'scale-100'
        }`}
        onClick={() => openModal(item)}
      >
        <LazyImage
          src={item.poster_path || item.backdrop_path}
          alt={item.title || item.name}
        />

        <AnimatePresence>
          {hovered && (
            <motion.div
              className="absolute inset-0 bg-black/40 flex items-end justify-center pb-4 rounded-lg pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <span className="text-white text-xs font-medium bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">
                Loading details…
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <h4
        onClick={() => openModal(item)}
        className={`mt-2 font-semibold text-sm cursor-pointer transition ${
          hovered ? 'text-red-400' : 'hover:text-red-400'
        }`}
      >
        {item.title || item.name}
      </h4>

      <button
        onClick={(e) => { e.stopPropagation(); onToggleList(item); }}
        className="absolute bottom-10 right-2 bg-white p-2 rounded-full shadow hover:bg-neutral-200 transition"
        title={isInList ? "Remove from My List" : "Add to My List"}
      >
        {isInList ? <Check className="text-black w-4 h-4" /> : <Plus className="text-black w-4 h-4" />}
      </button>
    </div>
  );
}


// -------------------------------------------------------------
// MOVIE MODAL
// -------------------------------------------------------------
function MovieModal({ show, movie, closeModal, toggleMyList, isInMyList }) {

  useEffect(() => {
    if (!show) return;
    const handler = (e) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [show, closeModal]);

  useEffect(() => {
    document.body.style.overflow = show ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [show]);

  if (!show || !movie) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[300] flex justify-center items-start overflow-y-auto py-12 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={closeModal}
      >
        <motion.div
          className="bg-[#181818] w-full md:w-[70%] lg:w-[55%] max-w-3xl rounded-xl overflow-hidden shadow-2xl relative"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Banner */}
          <div className="relative h-[250px] md:h-[380px] w-full overflow-hidden">
            <img
              src={movie.backdrop_path || movie.poster_path}
              alt={movie.title || movie.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-transparent" />

            <div className="absolute bottom-6 left-6">
              <h2 className="text-3xl md:text-4xl font-extrabold drop-shadow-lg">
                {movie.title || movie.name}
              </h2>
            </div>

            <button
              onClick={closeModal}
              className="absolute top-4 right-4 bg-black/70 p-2 rounded-full hover:bg-black/90 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Details */}
          <div className="p-6 space-y-5">

            <div className="flex items-center gap-4 flex-wrap text-sm">
              <span className="text-green-400 font-bold text-base">
                {Math.round((movie.vote_average || 0) * 10)}% Match
              </span>
              <span className="text-neutral-400">
                {(movie.release_date || movie.first_air_date || '').slice(0, 4)}
              </span>
              <span className="border border-neutral-600 px-2 py-0.5 rounded text-xs text-neutral-400">HD</span>
              {movie.media_type && (
                <span className="border border-neutral-600 px-2 py-0.5 rounded text-xs text-neutral-400 capitalize">
                  {movie.media_type}
                </span>
              )}
            </div>

            <p className="text-neutral-300 leading-relaxed text-sm md:text-base">
              {movie.overview || "No description available."}
            </p>

            {movie.vote_average > 0 && (
              <div className="flex items-center gap-2 text-xs text-neutral-500">
                <span>⭐ {movie.vote_average?.toFixed(1)} / 10</span>
                {movie.vote_count && <span>({movie.vote_count.toLocaleString()} votes)</span>}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <button className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-md font-semibold hover:bg-neutral-200 transition text-sm">
                <Play className="w-5 h-5 fill-black" /> Play
              </button>

              <button
                onClick={() => toggleMyList(movie)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-md font-semibold border transition text-sm ${
                  isInMyList(movie.id)
                    ? 'bg-white/10 border-white/30 text-white hover:bg-white/20'
                    : 'bg-transparent border-white/30 text-white hover:bg-white/10'
                }`}
              >
                {isInMyList(movie.id)
                  ? <><Check className="w-4 h-4" /> In My List</>
                  : <><Plus className="w-4 h-4" /> My List</>
                }
              </button>
            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


// -------------------------------------------------------------
// AUTH SCREEN
// -------------------------------------------------------------
function AuthScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');

  const submit = () => {
    if (!email || !pass) { setError('Please enter your email and password.'); return; }
    setError('');
    onLogin(remember);
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') submit(); };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white relative">
      <img
        src={LOCAL_UPLOADED_BG}
        className="absolute inset-0 w-full h-full object-cover opacity-50"
        alt=""
      />
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative bg-black/75 backdrop-blur-sm p-10 rounded-xl w-full max-w-md shadow-2xl border border-white/10">
        <h1 className="text-[#E50914] text-3xl font-extrabold mb-2 tracking-tight">NETFLIX</h1>
        <h2 className="text-2xl font-bold mb-6">Sign In</h2>

        {error && (
          <div className="bg-[#E50914]/20 border border-[#E50914]/40 text-sm text-red-300 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <input
            type="email"
            className="w-full px-4 py-3 bg-neutral-800 rounded border border-transparent focus:border-[#E50914] transition text-sm outline-none"
            placeholder="Email or phone number"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <input
            type="password"
            className="w-full px-4 py-3 bg-neutral-800 rounded border border-transparent focus:border-[#E50914] transition text-sm outline-none"
            placeholder="Password"
            value={pass}
            onChange={e => setPass(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="w-full bg-[#E50914] py-3 rounded font-semibold mt-2 hover:bg-[#f6121d] transition"
            onClick={submit}
          >
            Sign In
          </button>
        </div>

        <div className="flex justify-between mt-5 text-sm text-neutral-400">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              className="accent-[#E50914]"
            />
            <span>Remember me</span>
          </label>
          <span className="cursor-pointer hover:underline">Need help?</span>
        </div>

        <div className="mt-8 text-neutral-500 text-sm">
          New to Netflix?{' '}
          <span className="text-white cursor-pointer hover:underline">Sign up now.</span>
        </div>

        <p className="mt-4 text-xs text-neutral-600">
          This page is protected by Google reCAPTCHA to ensure you're not a bot.
        </p>
      </div>
    </div>
  );
}