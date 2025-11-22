/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useState, useEffect, useRef } from 'react';
import { Play, Info, Plus, Check, Search, Bell, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';

const API_KEY = 'e950e51d5d49e85f7c2f17f01eb23ba3';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/original';
const IMG_SMALL = 'https://image.tmdb.org/t/p/w500';

export default function NetflixClone() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const [featured, setFeatured] = useState(null);
  const [categories, setCategories] = useState({});
  const [myList, setMyList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [scrolled, setScrolled] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isLoggedIn && currentPage === 'home') {
      loadHomeContent();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, currentPage]);

  const loadHomeContent = async () => {
    setLoading(true);
    try {
      const categoryData = {
        trending: await fetchData('/trending/all/week'),
        topRated: await fetchData('/movie/top_rated'),
        netflixOriginals: await fetchData('/discover/tv?with_networks=213'),
        action: await fetchData('/discover/movie?with_genres=28'),
        comedy: await fetchData('/discover/movie?with_genres=35'),
        horror: await fetchData('/discover/movie?with_genres=27'),
        romance: await fetchData('/discover/movie?with_genres=10749'),
        documentaries: await fetchData('/discover/movie?with_genres=99'),
      };
      
      setCategories(categoryData);
      const trendingItems = categoryData.trending.filter(item => item.backdrop_path);
      setFeatured(trendingItems[Math.floor(Math.random() * trendingItems.length)]);
    } catch (error) {
      console.error('Error loading content:', error);
    }
    setLoading(false);
  };

  const fetchData = async (endpoint) => {
    const res = await fetch(`${BASE_URL}${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${API_KEY}`);
    const data = await res.json();
    return data.results || [];
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const results = await fetchData(`/search/multi?query=${encodeURIComponent(searchQuery)}`);
      setSearchResults(results.filter(item => item.poster_path || item.backdrop_path));
      setCurrentPage('search');
      setShowSearchBar(false);
    } catch (error) {
      console.error('Search error:', error);
    }
    setLoading(false);
  };

  const toggleMyList = (item) => {
    setMyList(prev => {
      const exists = prev.find(i => i.id === item.id);
      return exists ? prev.filter(i => i.id !== item.id) : [...prev, item];
    });
  };

  const isInMyList = (id) => myList.some(item => item.id === id);

  if (!isLoggedIn) {
    return <AuthScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="bg-[#141414] min-h-screen text-white">
      {/* Header */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        scrolled ? 'bg-[#141414]' : 'bg-gradient-to-b from-black to-transparent'
      }`}>
        <div className="flex items-center justify-between px-4 md:px-12 h-[68px]">
          <div className="flex items-center space-x-8">
            <h1 
              className="text-[#E50914] text-2xl md:text-3xl font-bold cursor-pointer"
              onClick={() => setCurrentPage('home')}
              style={{ fontFamily: 'Netflix Sans, Arial, sans-serif', letterSpacing: '-0.5px' }}
            >
              NETFLIX
            </h1>
            <nav className="hidden md:flex space-x-5 text-sm">
              {['Home', 'TV Shows', 'Movies', 'New & Popular', 'My List', 'Browse by Languages'].map((item) => (
                <button 
                  key={item}
                  onClick={() => item === 'Home' ? setCurrentPage('home') : item === 'My List' && setCurrentPage('mylist')} 
                  className={`hover:text-gray-300 transition ${
                    (item === 'Home' && currentPage === 'home') || (item === 'My List' && currentPage === 'mylist') 
                      ? 'font-semibold' 
                      : 'font-light text-[#e5e5e5]'
                  }`}
                >
                  {item}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="relative">
              {showSearchBar ? (
                <div className="flex items-center bg-black/90 border border-white">
                  <Search className="w-5 h-5 text-white ml-3" />
                  <input
                    type="text"
                    placeholder="Titles, people, genres"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="bg-transparent px-3 py-2 text-sm w-60 focus:outline-none text-white placeholder-gray-400"
                    autoFocus
                  />
                  <X 
                    className="w-5 h-5 text-white mr-2 cursor-pointer" 
                    onClick={() => {
                      setShowSearchBar(false);
                      setSearchQuery('');
                    }}
                  />
                </div>
              ) : (
                <Search 
                  className="w-6 h-6 cursor-pointer hover:text-gray-300 transition" 
                  onClick={() => setShowSearchBar(true)}
                />
              )}
            </div>
            
            <Bell className="w-6 h-6 cursor-pointer hover:text-gray-300 transition hidden md:block" />
            
            <div className="relative">
              <div 
                className="flex items-center space-x-2 cursor-pointer group"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/0/0b/Netflix-avatar.png"
                  alt="Profile"
                  className="w-8 h-8 rounded"
                />
                <ChevronDown className={`w-4 h-4 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
              </div>
              
              {showProfileMenu && (
                <div className="absolute right-0 mt-5 bg-black/95 border border-gray-700 py-1 w-52 shadow-xl">
                  <div className="px-4 py-3 hover:bg-white/10 cursor-pointer text-sm">Account</div>
                  <div className="px-4 py-3 hover:bg-white/10 cursor-pointer text-sm">Help Center</div>
                  <div className="border-t border-gray-700"></div>
                  <div 
                    className="px-4 py-3 hover:bg-white/10 cursor-pointer text-sm"
                    onClick={() => setIsLoggedIn(false)}
                  >
                    Sign out of Netflix
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div>
        {currentPage === 'home' && (
          <>
            {/* Featured Banner */}
            {featured && (
              <div className="relative h-[56.25vw] max-h-[700px]">
                <div className="absolute inset-0">
                  <img
                    src={`${IMG_BASE}${featured.backdrop_path || featured.poster_path}`}
                    alt={featured.title || featured.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#141414] to-transparent" />
                </div>
                
                <div className="absolute bottom-[35%] left-4 md:left-12 max-w-xl md:max-w-2xl">
                  <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 drop-shadow-2xl">
                    {featured.title || featured.name}
                  </h2>
                  <p className="text-sm md:text-lg mb-5 line-clamp-3 drop-shadow-lg text-white font-normal leading-relaxed">
                    {featured.overview}
                  </p>
                  <div className="flex space-x-3">
                    <button className="flex items-center bg-white text-black px-6 md:px-8 py-2 md:py-3 rounded font-bold text-base md:text-lg hover:bg-white/80 transition shadow-md">
                      <Play className="w-5 h-5 md:w-6 md:h-6 mr-2" fill="black" />
                      Play
                    </button>
                    <button className="flex items-center bg-[#6d6d6eb3] text-white px-6 md:px-8 py-2 md:py-3 rounded font-bold text-base md:text-lg hover:bg-[#6d6d6e66] transition shadow-md">
                      <Info className="w-5 h-5 md:w-6 md:h-6 mr-2" />
                      More Info
                    </button>
                  </div>
                </div>
                
                <div className="absolute bottom-0 right-0 mb-[35%] mr-8 md:mr-16 flex items-center">
                  <div className="border-l-4 border-gray-400/60 pl-3 md:pl-4">
                    <div className="text-xl md:text-2xl font-bold text-white/90">18+</div>
                  </div>
                </div>
              </div>
            )}

            {/* Movie Rows */}
            <div className="relative -mt-20 md:-mt-32 z-10 space-y-10 md:space-y-12 pb-20">
              {Object.entries(categories).map(([key, items]) => (
                <MovieRow
                  key={key}
                  title={formatTitle(key)}
                  items={items}
                  onToggleList={toggleMyList}
                  isInMyList={isInMyList}
                  isLarge={key === 'netflixOriginals'}
                />
              ))}
            </div>
          </>
        )}

        {currentPage === 'search' && (
          <div className="px-4 md:px-12 pt-28 pb-20">
            <h2 className="text-xl md:text-2xl font-semibold mb-8">
              {searchResults.length > 0 
                ? `Results for "${searchQuery}"`
                : `No results found for "${searchQuery}"`
              }
            </h2>
            {searchResults.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {searchResults.map(item => (
                  <MovieCard 
                    key={item.id} 
                    item={item} 
                    onToggleList={toggleMyList} 
                    isInList={isInMyList(item.id)} 
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {currentPage === 'mylist' && (
          <div className="px-4 md:px-12 pt-28 pb-20">
            <h2 className="text-3xl md:text-4xl font-bold mb-10">My List</h2>
            {myList.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-400 text-lg mb-6">You haven't added any titles to your list yet.</p>
                <button 
                  onClick={() => setCurrentPage('home')}
                  className="bg-white text-black px-8 py-3 rounded font-bold hover:bg-gray-200 transition"
                >
                  Find Something to Watch
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                {myList.map(item => (
                  <MovieCard 
                    key={item.id} 
                    item={item} 
                    onToggleList={toggleMyList} 
                    isInList={true} 
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-[#141414] border-t border-gray-900 py-16 px-4 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs md:text-sm text-gray-500">
            <div className="space-y-3">
              <p className="hover:underline cursor-pointer">Audio Description</p>
              <p className="hover:underline cursor-pointer">Investor Relations</p>
              <p className="hover:underline cursor-pointer">Legal Notices</p>
            </div>
            <div className="space-y-3">
              <p className="hover:underline cursor-pointer">Help Center</p>
              <p className="hover:underline cursor-pointer">Jobs</p>
              <p className="hover:underline cursor-pointer">Cookie Preferences</p>
            </div>
            <div className="space-y-3">
              <p className="hover:underline cursor-pointer">Gift Cards</p>
              <p className="hover:underline cursor-pointer">Terms of Use</p>
              <p className="hover:underline cursor-pointer">Corporate Information</p>
            </div>
            <div className="space-y-3">
              <p className="hover:underline cursor-pointer">Media Center</p>
              <p className="hover:underline cursor-pointer">Privacy</p>
              <p className="hover:underline cursor-pointer">Contact Us</p>
            </div>
          </div>
          <p className="text-gray-600 text-xs mt-10">© 2024 Netflix Clone. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function formatTitle(key) {
  const titles = {
    trending: 'Trending Now',
    topRated: 'Top Rated',
    netflixOriginals: 'Netflix Originals',
    action: 'Action Thrillers',
    comedy: 'Comedies',
    horror: 'Horror Movies',
    romance: 'Romantic Movies',
    documentaries: 'Documentaries',
  };
  return titles[key] || key;
}

function AuthScreen({ onLogin }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    if (email && password) {
      onLogin();
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="https://assets.nflxext.com/ffe/siteui/vlv3/93da5c27-be66-427c-8b72-5cb39d275279/94eb5ad7-10d8-4cca-bf45-ac52e0a052c0/IN-en-20240226-popsignuptwoweeks-perspective_alpha_website_large.jpg"
          alt="Background"
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <div className="absolute top-6 left-4 md:left-12 z-10">
        <h1 className="text-[#E50914] text-3xl md:text-4xl font-bold">NETFLIX</h1>
      </div>

      <div className="relative bg-black/75 px-12 md:px-16 py-14 md:py-16 rounded max-w-md w-full">
        <h1 className="text-3xl font-bold mb-7">{isSignUp ? 'Sign Up' : 'Sign In'}</h1>
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email or phone number"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            className="w-full px-5 py-4 bg-[#333] rounded text-white placeholder-gray-500 focus:outline-none focus:bg-[#454545]"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            className="w-full px-5 py-4 bg-[#333] rounded text-white placeholder-gray-500 focus:outline-none focus:bg-[#454545]"
          />
          <button
            onClick={handleSubmit}
            className="w-full bg-[#E50914] hover:bg-[#f6121d] py-4 rounded font-semibold transition text-base mt-6"
          >
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-3 text-xs text-gray-400">
          <label className="flex items-center cursor-pointer">
            <input type="checkbox" className="mr-2" />
            Remember me
          </label>
          <a href="#" className="hover:underline">Need help?</a>
        </div>
        
        <p className="mt-16 text-gray-400 text-base">
          {isSignUp ? 'Already have an account?' : 'New to Netflix?'}{' '}
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-white hover:underline">
            {isSignUp ? 'Sign in now' : 'Sign up now'}
          </button>
          .
        </p>
        
        <p className="text-xs text-gray-500 mt-3 leading-relaxed">
          This page is protected by Google reCAPTCHA to ensure you're not a bot.{' '}
          <a href="#" className="text-blue-600 hover:underline">Learn more</a>.
        </p>
      </div>
    </div>
  );
}

function MovieRow({ title, items, onToggleList, isInMyList, isLarge }) {
  const scrollRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -window.innerWidth * 0.8 : window.innerWidth * 0.8;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      setTimeout(handleScroll, 300);
    }
  };

  return (
    <div className="relative group/row px-4 md:px-12">
      <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4 hover:text-white transition">{title}</h3>
      
      {showLeftArrow && (
        <button 
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-40 bg-black/60 hover:bg-black/80 h-full w-12 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}
      
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex space-x-1 md:space-x-2 overflow-x-scroll scrollbar-hide scroll-smooth"
      >
        {items.map(item => (
          <div 
            key={item.id} 
            className={`${
              isLarge ? 'min-w-[140px] md:min-w-[230px]' : 'min-w-[140px] md:min-w-[280px]'
            } group/card relative transition-transform duration-300 hover:scale-110 hover:z-50 cursor-pointer`}
          >
            <img
              src={`${IMG_SMALL}${isLarge ? item.poster_path : (item.backdrop_path || item.poster_path)}`}
              alt={item.title || item.name}
              className="rounded w-full object-cover"
            />
            
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity rounded flex flex-col justify-end p-3 md:p-4">
              <h4 className="font-bold text-xs md:text-sm mb-2 line-clamp-1">{item.title || item.name}</h4>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1 md:space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleList(item);
                    }}
                    className="bg-white hover:bg-white/80 p-1.5 md:p-2 rounded-full transition"
                  >
                    {isInMyList(item.id) ? (
                      <Check className="w-3 h-3 md:w-4 md:h-4 text-black" />
                    ) : (
                      <Plus className="w-3 h-3 md:w-4 md:h-4 text-black" />
                    )}
                  </button>
                </div>
                <span className="text-green-500 font-semibold text-xs">
                  {Math.round(item.vote_average * 10)}% Match
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showRightArrow && (
        <button 
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-40 bg-black/60 hover:bg-black/80 h-full w-12 flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-opacity"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}
    </div>
  );
}

function MovieCard({ item, onToggleList, isInList }) {
  return (
    <div className="group/card relative transition-transform duration-300 hover:scale-105 cursor-pointer">
      <img
        src={`${IMG_SMALL}${item.poster_path || item.backdrop_path}`}
        alt={item.title || item.name}
        className="rounded w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity rounded flex flex-col justify-end p-3">
        <h4 className="font-bold text-sm mb-2 line-clamp-2">{item.title || item.name}</h4>
        <button
          onClick={() => onToggleList(item)}
          className="bg-white hover:bg-white/80 p-2 rounded-full w-fit transition"
        >
          {isInList ? (
            <Check className="w-4 h-4 text-black" />
          ) : (
            <Plus className="w-4 h-4 text-black" />
          )}
        </button>
      </div>
    </div>
  );
}