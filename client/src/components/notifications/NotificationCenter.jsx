import React, { useEffect } from 'react';
import { useNotificationStore } from '../../store/useNotificationStore';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const NotificationCenter = ({ onClose }) => {
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications, isLoading } = useNotificationStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    
    // Navigate based on type
    if (notification.type === 'MESSAGE' || notification.type === 'CONNECTION_ACCEPTED') {
      if (notification.conversation) {
        navigate(`/chat/${notification.conversation}`);
        onClose();
      }
    } else if (notification.type === 'CONNECTION_REQUEST') {
      navigate('/contacts');
      onClose();
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex items-center justify-between p-4 border-b border-base-300">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-lg">Notifications</h2>
          {unreadCount > 0 && (
            <span className="badge badge-primary badge-sm">{unreadCount}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button 
              onClick={clearAllNotifications} 
              className="btn btn-ghost btn-xs text-xs font-normal text-error"
              title="Clear all"
            >
              <Trash2 className="w-3 h-3 mr-1" /> Clear All
            </button>
          )}
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead} 
              className="btn btn-ghost btn-xs text-xs font-normal"
              title="Mark all as read"
            >
              <Check className="w-3 h-3 mr-1" /> Read All
            </button>
          )}
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-circle">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading && notifications.length === 0 ? (
          <div className="flex justify-center p-8">
            <span className="loading loading-spinner text-primary"></span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-base-content/50 space-y-4">
            <Bell className="w-12 h-12 opacity-20" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div 
                key={notification._id}
                className={`group relative flex flex-col p-3 rounded-xl cursor-pointer transition-all ${
                  notification.isRead 
                    ? 'bg-base-200/30 hover:bg-base-200/50' 
                    : 'bg-primary/10 border border-primary/20 shadow-sm'
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex gap-3">
                  <div className="avatar">
                    <div className="w-10 h-10 rounded-full bg-base-300">
                      <img src={notification.sender?.profilePicture || `https://ui-avatars.com/api/?name=${notification.sender?.name || 'U'}`} alt="avatar" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm ${notification.isRead ? 'font-medium text-base-content/80' : 'font-semibold text-base-content'}`}>
                      {notification.title}
                    </h4>
                    <p className="text-xs text-base-content/60 truncate mt-0.5">
                      {notification.body}
                    </p>
                    <span className="text-[10px] text-base-content/40 mt-1 block">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>

                <button 
                  onClick={(e) => { e.stopPropagation(); deleteNotification(notification._id); }}
                  className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-base-300 rounded-lg transition-all text-error"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
