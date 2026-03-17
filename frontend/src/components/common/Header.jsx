import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext'; // 1. Import the new useAuth hook

const navItems = [
  { to: "/", label: "Home" },
  { to: "/store", label: "Store" },
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact" },
];

export default function Header() {
  // 2. Get user data and functions from AuthContext
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItemsInCart } = useCart();
  
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null); 
  
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Close menus when the user navigates to a new page
    setShowMobileMenu(false);
    setShowProfileDropdown(false);
  }, [pathname]);

  useEffect(() => {
    // Click outside handler
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => { document.removeEventListener("mousedown", handleClickOutside); };
  }, []);

  const handleLogout = () => {
      logout(); // Call the logout function from AuthContext
      navigate('/'); // Redirect to home page
  };

  const linkBaseClasses = "relative text-sm font-medium text-gray-700 hover:text-green-700";
  const activeLinkClasses = "text-green-700 after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-full after:bg-green-600";

  return (
    <motion.header ref={mobileMenuRef} className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur-sm">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 md:py-5 lg:px-8">
        {/* Logo */}
        <Link to="/" className="inline-flex items-center gap-2 text-lg font-bold text-gray-900 flex-shrink-0">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-green-600 text-white"><i className="fa-solid fa-leaf" /></span>
          <span className="hidden sm:inline">GreenLeaf Farm</span>
        </Link>

        {/* --- DESKTOP VIEW --- */}
        <div className="hidden md:flex items-center justify-end flex-grow">
          {/* Navigation Links */}
           <div className="flex items-center gap-10">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => `${linkBaseClasses} ${isActive ? activeLinkClasses : ""}`}>{item.label}</NavLink>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-6 ml-8 pl-8 border-l border-gray-200">
            {/* Cart Icon */}
             <NavLink
              to="/checkout"
              aria-label="Cart"
              className={({ isActive }) =>
                `relative p-2 rounded-full transition-colors ${
                  isActive
                    ? `${activeLinkClasses} text-green-700`
                    : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              <i className="fa-solid fa-basket-shopping text-lg" />
              {totalItemsInCart > 0 && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1 -right-1 grid h-5 place-items-center rounded-full bg-green-600 px-1 text-xs font-bold text-white">
                  {totalItemsInCart}
                </motion.span>
              )}
            </NavLink>

            {/* --- 3. DYNAMIC AUTH SECTION (Desktop) --- */}
            {isAuthenticated ? (
                // If LOGGED IN, show Profile Dropdown
                <div className="relative" ref={dropdownRef}>
                    <button onClick={() => setShowProfileDropdown(!showProfileDropdown)} className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100">
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {user.fullName?.charAt(0)}
                        </div>
                         <i className={`fas fa-chevron-down text-xs transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    <AnimatePresence>
                        {showProfileDropdown && (
                            <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 5 }} exit={{ opacity: 0, y: -5 }} className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border">
                                <div className="p-2">
                                    <div className="px-3 py-2 border-b">
                                        <p className="font-semibold text-sm truncate">{user.fullName}</p>
                                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                    </div>
                                    <Link to="/profile" className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">My Profile</Link>
                                    <Link to="/my-orders" className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">My Orders</Link>
                                    {user.role === 'Admin' && <Link to="/admin" className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded">Admin Panel</Link>}
                                    <button onClick={handleLogout} className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded">Logout</button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ) : (
                // If LOGGED OUT, show Sign In button
                <Link to="/login">
                  <motion.button className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      Sign In
                  </motion.button>
                </Link>
            )}

          </div>
        </div>

        {/* --- MOBILE VIEW ACTIONS --- */}
        <div className="flex items-center gap-3 md:hidden">
          <NavLink
            to="/checkout"
            className={({ isActive }) =>
              `relative grid h-10 w-10 place-items-center rounded-lg border transition-colors ${
                isActive ? 'bg-green-50 text-green-700 border-green-500' : 'border-gray-200 text-gray-700'
              }`
            }
          >
            <i className="fa-solid fa-basket-shopping"></i>
            {totalItemsInCart > 0 && (<span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-green-600 text-xs text-white">{totalItemsInCart}</span>)}
          </NavLink>
          <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="grid h-10 w-10 place-items-center rounded-lg border" aria-label="Open menu">
            <i className={`fa-solid ${showMobileMenu ? "fa-xmark" : "fa-bars"}`} />
          </button>
        </div>
      </nav>

      {/* --- Mobile Menu --- */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="md:hidden overflow-hidden border-t">
            <div className="flex flex-col gap-1 px-4 py-4">
              {navItems.map((item) => ( <NavLink key={item.to} to={item.to} className={({ isActive }) => `flex items-center gap-3 px-3 py-3 rounded-lg ${isActive ? "bg-green-50 text-green-700" : "text-gray-700"}`}>{item.label}</NavLink> ))}
              
              {/* --- 4. DYNAMIC AUTH SECTION (Mobile) --- */}
              {isAuthenticated ? (
                <>
                  <NavLink to="/profile" className="flex items-center gap-3 px-3 py-3 rounded-lg text-gray-700">My Profile</NavLink>
                  <button onClick={handleLogout} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white">
                      Logout
                  </button>
                </>
              ) : (
                <Link to="/login" className="mt-4 w-full">
                  <motion.button className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white" whileTap={{ scale: 0.98 }}>
                      Sign In
                  </motion.button>
                </Link>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};