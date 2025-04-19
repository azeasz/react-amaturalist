import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faCheck } from '@fortawesome/free-solid-svg-icons';
import { apiFetch } from '../utils/api';
import { useQueryClient } from '@tanstack/react-query';

const NotificationBar = ({ notifications, onClose, onMarkAsRead }) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const handleMarkAllAsRead = async () => {
        try {
            await apiFetch('/notifications/read-all', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
                }
            });
            // Refresh notifikasi
            queryClient.invalidateQueries(['notifications']);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    const handleNotificationClick = async (notification) => {
        try {
            // Tandai notifikasi sebagai dibaca
            await onMarkAsRead(notification.id);
            // Tutup notification bar
            onClose();
            // Navigasi ke halaman observasi
            navigate(`/observations/${notification.checklist_id}`);
        } catch (error) {
            console.error('Error handling notification click:', error);
        }
    };

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        return {
            date: date.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'numeric',
                year: 'numeric'
            }),
            time: date.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
            })
        };
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl z-50 max-h-[calc(100vh-100px)] overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
                <div className="flex items-center space-x-2">
                    <h3 className="text-xl font-medium">Notifikasi</h3>
                    {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-2">
                            {unreadCount}
                        </span>
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllAsRead}
                            className="text-sm text-[#679995] hover:text-[#5a8884] flex items-center space-x-1"
                        >
                            <FontAwesomeIcon icon={faCheck} className="text-sm" />
                            <span>Tandai sudah dibaca</span>
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <FontAwesomeIcon icon={faTimes} className="text-lg" />
                    </button>
                </div>
            </div>
            <div className="divide-y">
                {notifications.length === 0 ? (
                    <div className="p-6 text-center text-gray-500">
                        Tidak ada notifikasi baru
                    </div>
                ) : (
                    notifications.map(notification => {
                        const { date, time } = formatDateTime(notification.created_at);
                        return (
                            <div
                                key={notification.id}
                                className={`p-4 hover:bg-gray-50 cursor-pointer ${!notification.is_read ? 'bg-blue-50' : ''}`}
                                onClick={() => handleNotificationClick(notification)}
                            >
                                <p className="text-base text-gray-800 mb-2">{notification.message}</p>
                                <div className="flex items-center text-xs text-gray-500">
                                    <span>{date}</span>
                                    <span className="mx-1">•</span>
                                    <span>{time}</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default NotificationBar;
