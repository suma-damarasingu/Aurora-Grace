import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  Calendar,
  Sparkles,
  XCircle,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const now = new Date();
  const past = new Date(dateString);
  const diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getNotificationIcon = (type) => {
  switch (type) {
    case 'booking_created':
      return <Calendar className="w-4 h-4 text-rose-500" />;
    case 'booking_accepted':
      return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    case 'booking_declined':
      return <XCircle className="w-4 h-4 text-rose-500" />;
    case 'booking_completed':
      return <Sparkles className="w-4 h-4 text-amber-500" />;
    case 'booking_cancelled':
      return <AlertCircle className="w-4 h-4 text-rose-500" />;
    default:
      return <Info className="w-4 h-4 text-slate-500" />;
  }
};

const NotificationBell = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Fetch unread count for the badge
  const fetchUnreadCount = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get('/notifications/unread-count?t=' + Date.now());
      if (res.data.success) {
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      // Silently catch polling errors
    }
  };

  // Fetch full list of notifications when dropdown opens
  const fetchNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await api.get('/notifications?t=' + Date.now());
      if (res.data.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and polling every 12 seconds
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 12000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Handle dropdown open
  const toggleDropdown = () => {
    if (!isOpen) {
      fetchNotifications();
    }
    setIsOpen((prev) => !prev);
  };

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Mark single notification as read and navigate
  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.isRead) {
        // Optimistic update
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        await api.patch(`/notifications/${notif._id}/read`);
      }
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }

    setIsOpen(false);

    // Contextual routing based on role and notification type
    if (isAdmin) {
      navigate('/admin/bookings');
    } else {
      navigate('/dashboard/bookings');
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      await api.patch('/notifications/read-all');
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={toggleDropdown}
        className="relative p-2.5 rounded-2xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all focus:outline-none"
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell className="w-5 h-5 transition-transform hover:scale-105" />

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1.5 text-[10px] font-black leading-none bg-rose-600 text-white rounded-full flex items-center justify-center shadow-md shadow-rose-200 ring-2 ring-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl border border-rose-100 shadow-2xl py-3 z-50 overflow-hidden transform transition-all origin-top-right">
          {/* Dropdown Header */}
          <div className="px-4 py-2 border-b border-rose-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-rose-50">
            {loading ? (
              <div className="py-8 text-center">
                <div className="w-6 h-6 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-xs text-slate-400">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center px-4">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-400 mx-auto flex items-center justify-center mb-2">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700">No notifications yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Updates on appointments and bookings will appear here.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors hover:bg-rose-50/50 ${
                    !notif.isRead ? 'bg-rose-50/30' : 'bg-white'
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center mt-0.5 shadow-sm ${
                      !notif.isRead ? 'bg-white ring-1 ring-rose-200' : 'bg-slate-50'
                    }`}
                  >
                    {getNotificationIcon(notif.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-xs truncate ${
                          !notif.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'
                        }`}
                      >
                        {notif.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>

                  {/* Unread indicator dot */}
                  {!notif.isRead && (
                    <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0 mt-2"></span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Dropdown Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 bg-rose-50/20 border-t border-rose-100 text-center">
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (isAdmin) {
                    navigate('/admin/bookings');
                  } else {
                    navigate('/dashboard/bookings');
                  }
                }}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 transition-colors"
              >
                View all bookings & history →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
