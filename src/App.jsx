
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Info, Plus, Check, Search, Bell,
  ChevronDown, ChevronLeft, ChevronRight, X
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

  // STORAGE KEYS
  const LS_MYLIST = 'nc_mylist_v1';
  const LS_REMEMBER = 'nc_remember_v1';

  // STATES
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

  // MODAL STATE
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


  // Smooth scroll header
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);


  // Load categories on page change
  useEffect(() => {
    if (isLoggedIn) loadPage(currentPage);
  }, [isLoggedIn, currentPage]);


  // Fetch category data
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

      // Normalize images to full URLs
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


  // Search
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


  // Toggle My List
  const toggleMyList = (item) => {
    setMyList(prev => {
      const exists = prev.find(i => i.id === item.id);
      return exists
        ? prev.filter(i => i.id !== item.id)
        : [...prev, item];
    });
  };

  const isInMyList = (id) => myList.some(i => i.id === id);


  // Login
  const handleLogin = (remember) => {
    if (remember) localStorage.setItem(LS_REMEMBER, 'true');
    sessionStorage.setItem('netflixLoggedIn', 'true');
    setIsLoggedIn(true);
  };


  if (!isLoggedIn) return <AuthScreen onLogin={handleLogin} />;


  // =============================================================
  // RENDER
  // =============================================================
  return (
    <div className="bg-black min-h-screen text-white relative">
      {/* HEADER */}
      <header className={`fixed top-0 w-full z-50 transition-all ${scrolled ? 'backdrop-blur-lg bg-black/70' : 'bg-gradient-to-b from-black/80 to-transparent'}`}>

        <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">

          {/* LOGO + NAV */}
          <div className="flex items-center gap-8">
            <h1
              onClick={() => setCurrentPage('home')}
              className="text-[#E50914] text-3xl font-extrabold cursor-pointer"
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
                  className={`transition ${currentPage === n.page ? 'text-white font-semibold' : 'text-neutral-300'}`}
                >
                  {n.label}
                </button>
              ))}
            </nav>
          </div>

          {/* SEARCH + PROFILE */}
          <div className="flex items-center gap-4">
            <Search
              onClick={() => setShowSearchBar(true)}
              className="w-6 h-6 cursor-pointer hover:text-neutral-300 transition"
            />

            <Bell className="hidden md:block w-6 h-6 cursor-pointer" />

            {/* PROFILE */}
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
                <ChevronDown className={`w-4 h-4 transition ${showProfileMenu ? 'rotate-180' : ''}`} />
              </div>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute right-0 mt-3 w-48 bg-black border border-neutral-700 rounded-lg shadow-xl"
                  >
                    <div className="px-4 py-2 hover:bg-white/10 cursor-pointer">Account</div>
                    <div className="px-4 py-2 hover:bg-white/10 cursor-pointer">Settings</div>
                    <div className="border-t border-neutral-700" />
                    <div
                      onClick={() => { sessionStorage.clear(); localStorage.removeItem(LS_REMEMBER); setIsLoggedIn(false); }}
                      className="px-4 py-2 hover:bg-white/10 cursor-pointer"
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
        {showSearchBar && (
          <div className="px-6 py-3 bg-black/95 border-b border-neutral-800">
            <div className="max-w-2xl mx-auto flex items-center bg-neutral-900 rounded overflow-hidden">
              <Search className="w-6 h-6 text-white ml-3" />
              <input
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value);
                  debouncedSearch(e.target.value);
                }}
                autoFocus
                placeholder="Titles, people, genres..."
                className="flex-1 bg-transparent px-3 py-3 outline-none text-sm text-white"
              />
              <X
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowSearchBar(false);
                }}
                className="w-6 h-6 text-white mr-3 cursor-pointer"
              />
            </div>
          </div>
        )}
      </header>



      {/* MAIN CONTENT */}
      <main className="pt-[90px]">

        {/* LOADING */}
        {loading && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200]">
            <div className="w-16 h-16 border-4 border-neutral-700 border-t-[#E50914] rounded-full animate-spin" />
          </div>
        )}


        {/* HERO */}
        {featured && (
          <HeroSection featured={featured} />
        )}


        {/* ROWS */}
        <section className="relative -mt-24 space-y-12 px-6 md:px-12 pb-20">

          {Object.entries(categories).map(([key, items]) => (
            <MovieRow
              key={key}
              title={formatTitle(key)}
              items={items}
              onToggleList={toggleMyList}
              isInMyList={isInMyList}
              openModal={openModal}      // <── ADD THIS
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
                  openModal={openModal}      // <── ADD THIS
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
              <p className="text-neutral-400">You have no items in your list.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {myList.map(item => (
                  <MovieCard
                    key={item.id}
                    item={item}
                    onToggleList={toggleMyList}
                    isInList={true}
                    openModal={openModal}      // <── ADD THIS
                  />
                ))}
              </div>
            )}
          </section>
        )}

      </main>



      {/* MOVIE DETAILS MODAL */}
      <MovieModal
        show={showModal}
        movie={selectedMovie}
        closeModal={closeModal}
        toggleMyList={toggleMyList}
        isInMyList={isInMyList}
      />


      {/* FOOTER */}
      <footer className="px-6 md:px-12 py-12 text-neutral-500 text-sm border-t border-neutral-800">
        <p>© 2024 Netflix Clone. All rights reserved.</p>
      </footer>

    </div>
  );
}



// -------------------------------------------------------------
// HERO SECTION
// -------------------------------------------------------------
function HeroSection({ featured }) {
  return (
    <section className="relative h-[55vw] max-h-[720px] overflow-hidden">
      <img
        src={featured.backdrop_path}
        className="absolute inset-0 w-full h-full object-cover"
        alt=""
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>

      <div className="absolute bottom-[18%] left-1/2 -translate-x-1/2 text-center max-w-3xl px-6">
        <h1 className="text-4xl md:text-6xl font-extrabold drop-shadow-lg">
          {featured.title || featured.name}
        </h1>

        <p className="mt-4 text-neutral-300 text-sm md:text-lg">
          {(featured.overview || '').slice(0, 220)}...
        </p>

        <div className="mt-6 flex justify-center gap-4">
          <button className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-md">
            <Play className="w-5 h-5" /> Play
          </button>
          <button className="flex items-center gap-2 bg-white/20 text-white px-6 py-3 rounded-md border border-white/20">
            <Info className="w-5 h-5" /> More Info
          </button>
        </div>
      </div>
    </section>
  );
}



// -------------------------------------------------------------
// MOVIE ROW (titles always visible, click title = modal)
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

      {/* LEFT BUTTON */}
      {showLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-40 bg-black/50 hover:bg-black/80 w-10 h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition rounded-r"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* SCROLL ROW */}
      <div
        ref={scrollRef}
        onScroll={updateControls}
        className="flex gap-4 overflow-x-auto scroll-smooth no-scrollbar py-2"
      >
        {items.map(item => (
          <div key={item.id} className="min-w-[150px] md:min-w-[220px]">

            {/* IMAGE */}
            <div className="w-full h-[210px] md:h-[320px] rounded-lg overflow-hidden">
              <LazyImage
                src={item.poster_path || item.backdrop_path}
                alt={item.title}
              />
            </div>

            {/* TITLE — CLICKABLE (opens modal) */}
            <h4
              onClick={() => openModal(item)}
              className="mt-2 text-sm md:text-base font-semibold truncate cursor-pointer hover:text-red-400"
            >
              {item.title || item.name}
            </h4>

            {/* Action Controls */}
            <button
              onClick={() => onToggleList(item)}
              className="mt-2 bg-white text-black p-2 rounded-full"
            >
              {isInMyList(item.id) ? <Check /> : <Plus />}
            </button>
          </div>
        ))}
      </div>

      {/* RIGHT BUTTON */}
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
// GRID MOVIE CARD (Search, MyList)
// -------------------------------------------------------------
function MovieCard({ item, onToggleList, isInList, openModal }) {
  return (
    <div className="group relative">

      {/* IMAGE */}
      <div className="w-full h-[300px] rounded-lg overflow-hidden cursor-pointer">
        <LazyImage
          src={item.poster_path || item.backdrop_path}
          alt={item.title}
          onClick={() => openModal(item)}
        />
      </div>

      {/* TITLE — ALWAYS SHOWN */}
      <h4
        onClick={() => openModal(item)}
        className="mt-2 font-semibold text-sm cursor-pointer hover:text-red-400"
      >
        {item.title || item.name}
      </h4>

      {/* BUTTONS BELOW */}
      <button
        onClick={() => onToggleList(item)}
        className="absolute bottom-3 right-3 bg-white p-2 rounded-full shadow"
      >
        {isInList ? <Check className="text-black" /> : <Plus className="text-black" />}
      </button>
    </div>
  );
}



// -------------------------------------------------------------
// MOVIE MODAL (NEW)
// -------------------------------------------------------------
function MovieModal({ show, movie, closeModal, toggleMyList, isInMyList }) {

  if (!show || !movie) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[300] flex justify-center items-start overflow-y-auto py-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >

        <motion.div
          className="bg-[#111] w-[90%] md:w-[70%] lg:w-[55%] rounded-lg overflow-hidden shadow-2xl relative"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >

          {/* BANNER */}
          <div className="relative h-[250px] md:h-[350px] w-full overflow-hidden">
            <img
              src={movie.backdrop_path || movie.poster_path}
              alt="banner"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#111] to-transparent" />

            <button
              onClick={closeModal}
              className="absolute top-4 right-4 bg-black/70 p-2 rounded-full hover:bg-black/90"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* DETAILS */}
          <div className="p-6 space-y-4">
            <h2 className="text-3xl font-bold">{movie.title || movie.name}</h2>

            <div className="flex items-center gap-4">
              <span>{(movie.release_date || movie.first_air_date || '').slice(0, 4)}</span>
              <span className="text-green-400 font-semibold">
                {Math.round((movie.vote_average || 0) * 10)}% Match
              </span>
            </div>

            <p className="text-neutral-300">{movie.overview || "No description available."}</p>

            <button
              onClick={() => toggleMyList(movie)}
              className="bg-white text-black px-6 py-2 rounded-md font-semibold"
            >
              {isInMyList(movie.id) ? "✓ Remove from My List" : "+ Add to My List"}
            </button>
          </div>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}



// -------------------------------------------------------------
// Auth Screen
// -------------------------------------------------------------
function AuthScreen({ onLogin }) {

  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [remember, setRemember] = useState(false);

  const submit = () => {
    if (!email || !pass) return alert("Enter credentials");
    onLogin(remember);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white relative">
      <img
        src={LOCAL_UPLOADED_BG}
        className="absolute inset-0 w-full h-full object-cover opacity-50"
        alt=""
      />
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative bg-black/70 p-10 rounded-lg w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6">Sign In</h1>

        <div className="space-y-4">
          <input
            type="email"
            className="w-full px-4 py-3 bg-neutral-800 rounded"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />

          <input
            type="password"
            className="w-full px-4 py-3 bg-neutral-800 rounded"
            placeholder="Password"
            value={pass}
            onChange={e => setPass(e.target.value)}
          />

          <button
            className="w-full bg-[#E50914] py-3 rounded font-semibold mt-4"
            onClick={submit}
          >
            Sign In
          </button>
        </div>

        <div className="flex justify-between mt-4 text-sm text-neutral-400">
          <label>
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
            <span className="ml-2">Remember me</span>
          </label>
          <span className="cursor-pointer">Need help?</span>
        </div>
      </div>
    </div>
  );
}

