import React, { useState, useEffect } from 'react';
import { Users, Search, UserPlus, TrendingUp, ArrowLeft } from 'lucide-react';
import { UserSearchCard } from '../social/UserSearchCard';
import { FriendRequestCard } from '../social/FriendRequestCard';
import { FriendCard } from '../social/FriendCard';
import { FriendProfileModal } from '../social/FriendProfileModal';
import { FeedWorkoutCard } from '../social/FeedWorkoutCard';
import { Modal } from '../ui/Modal';
import {
    searchUsers,
    sendFriendRequest,
    getFriendRequests,
    respondToFriendRequest,
    getFriends,
    getFriendsFeed,
    addWorkoutComment,
    getFriendProfile,
    removeFriend,
    deleteWorkoutComment,
    getFriendNotificationSettings,
    updateFriendNotificationSetting
} from '../../services/api';

export const SocialViewDesktop = ({ onNavigateBack, currentUser }) => {
    const [activeTab, setActiveTab] = useState('feed');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [friends, setFriends] = useState([]);
    const [feed, setFeed] = useState([]);
    const [sentRequests, setSentRequests] = useState(new Set());
    const [isSearching, setIsSearching] = useState(false);
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [friendProfile, setFriendProfile] = useState(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isProfileLoading, setIsProfileLoading] = useState(false);
    const [isConfirmRemoveOpen, setIsConfirmRemoveOpen] = useState(false);
    const [friendNotifications, setFriendNotifications] = useState({});

    useEffect(() => {
        loadFriendRequests();
        loadFriends();
        loadFeed();
        loadFriendNotificationSettings();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            loadFriendRequests();
            loadFeed();
        }, 15000);

        return () => clearInterval(interval);
    }, [currentUser]);

    const loadFriendRequests = async () => {
        try {
            const data = await getFriendRequests();
            setFriendRequests(data.requests);
        } catch (error) {
            console.error('Failed to load friend requests:', error);
        }
    };

    const loadFriends = async () => {
        try {
            const data = await getFriends();
            setFriends(data.friends);
        } catch (error) {
            console.error('Failed to load friends:', error);
        }
    };

    const loadFeed = async () => {
        try {
            const data = await getFriendsFeed();
            setFeed(data.workouts);
        } catch (error) {
            console.error('Failed to load feed:', error);
        }
    };

    const loadFriendNotificationSettings = async () => {
        try {
            const data = await getFriendNotificationSettings();
            const next = (data.settings || []).reduce((acc, setting) => {
                acc[setting.friendId] = setting.notifyOnWorkout;
                return acc;
            }, {});
            setFriendNotifications(next);
        } catch (error) {
            console.error('Failed to load friend notification settings:', error);
        }
    };

    const handleSearch = async () => {
        if (searchQuery.trim().length < 2) return;

        setIsSearching(true);
        try {
            const data = await searchUsers(searchQuery);
            setSearchResults(data.users);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSendRequest = async (userId) => {
        try {
            await sendFriendRequest(userId);
            setSentRequests(new Set([...sentRequests, userId]));
        } catch (error) {
            alert(error.message);
        }
    };

    const handleAcceptRequest = async (requestId) => {
        try {
            await respondToFriendRequest(requestId, true);
            loadFriendRequests();
            loadFriends();
            loadFeed();
        } catch (error) {
            alert(error.message);
        }
    };

    const handleRejectRequest = async (requestId) => {
        try {
            await respondToFriendRequest(requestId, false);
            loadFriendRequests();
        } catch (error) {
            alert(error.message);
        }
    };

    const openFriendProfile = async (friend) => {
        setSelectedFriend(friend);
        setIsProfileOpen(true);
        setIsProfileLoading(true);
        try {
            const data = await getFriendProfile(friend.friend_id);
            setFriendProfile(data.profile);
        } catch (error) {
            console.error('Failed to load friend profile:', error);
            setFriendProfile(null);
        } finally {
            setIsProfileLoading(false);
        }
    };

    const closeFriendProfile = () => {
        setIsProfileOpen(false);
        setSelectedFriend(null);
        setFriendProfile(null);
        setIsConfirmRemoveOpen(false);
    };

    const handleToggleFriendNotifications = (friendId, enabled) => {
        setFriendNotifications((prev) => ({ ...prev, [friendId]: enabled }));
        updateFriendNotificationSetting({ friendId, notifyOnWorkout: enabled }).catch((error) => {
            console.error('Failed to save friend notification settings:', error);
        });
    };

    const handleRemoveFriend = async (friendId) => {
        try {
            await removeFriend(friendId);
            loadFriends();
            loadFeed();
            closeFriendProfile();
        } catch (error) {
            alert(error.message);
        }
    };

    const handleAddComment = async (workoutId, comment) => {
        try {
            const data = await addWorkoutComment({ workoutId, comment });
            setFeed(prevFeed => prevFeed.map(workout => (
                workout.id === workoutId
                    ? { ...workout, comments: [...(workout.comments || []), data.comment] }
                    : workout
            )));
        } catch (error) {
            alert(error.message || 'Failed to add comment.');
        }
    };

    const handleDeleteComment = async (workoutId, commentId) => {
        try {
            await deleteWorkoutComment({ commentId });
            setFeed(prevFeed => prevFeed.map(workout => (
                workout.id === workoutId
                    ? { ...workout, comments: (workout.comments || []).filter((comment) => comment.id !== commentId) }
                    : workout
            )));
        } catch (error) {
            alert(error.message || 'Failed to delete comment.');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 mb-6">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onNavigateBack}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft size={24} />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                                <Users className="text-blue-500" />
                                Social
                            </h1>
                            <p className="text-gray-400 mt-1">Connect with friends and see their workouts</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-gray-800 border border-gray-700 rounded-2xl mb-6 overflow-hidden">
                    <div className="flex border-b border-gray-700">
                        <button
                            onClick={() => setActiveTab('feed')}
                            className={`flex-1 py-4 px-6 text-center font-semibold transition-all flex items-center justify-center gap-2 ${
                                activeTab === 'feed'
                                    ? 'text-white bg-gray-700/50 border-b-2 border-blue-600'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                            }`}
                        >
                            <TrendingUp size={18} />
                            Feed
                        </button>
                        <button
                            onClick={() => setActiveTab('friends')}
                            className={`flex-1 py-4 px-6 text-center font-semibold transition-all flex items-center justify-center gap-2 ${
                                activeTab === 'friends'
                                    ? 'text-white bg-gray-700/50 border-b-2 border-blue-600'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                            }`}
                        >
                            <Users size={18} />
                            Friends ({friends.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('add')}
                            className={`flex-1 py-4 px-6 text-center font-semibold transition-all flex items-center justify-center gap-2 ${
                                activeTab === 'add'
                                    ? 'text-white bg-gray-700/50 border-b-2 border-blue-600'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-700/30'
                            }`}
                        >
                            <UserPlus size={18} />
                            Add Friends
                            {friendRequests.length > 0 && (
                                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                  {friendRequests.length}
                </span>
                            )}
                        </button>
                    </div>

                    {/* Tab Content */}
                    <div className="p-6">
                        {/* Feed Tab */}
                        {activeTab === 'feed' && (
                            <div>
                                {feed.length === 0 ? (
                                    <div className="text-center py-12">
                                        <TrendingUp size={48} className="text-gray-600 mx-auto mb-4" />
                                        <p className="text-gray-400">No workouts to show yet.</p>
                                        <p className="text-gray-500 text-sm mt-2">Add friends to see their workouts!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {feed.map((workout) => (
                                    <FeedWorkoutCard
                                        key={workout.id}
                                        workout={workout}
                                        onAddComment={handleAddComment}
                                        onDeleteComment={(commentId) => handleDeleteComment(workout.id, commentId)}
                                        currentUserId={currentUser?.id}
                                    />
                                ))}
                            </div>
                                )}
                            </div>
                        )}

                        {/* Friends Tab */}
                        {activeTab === 'friends' && (
                            <div>
                                {friends.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Users size={48} className="text-gray-600 mx-auto mb-4" />
                                        <p className="text-gray-400">You don't have any friends yet.</p>
                                        <p className="text-gray-500 text-sm mt-2">Search for users to add them!</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {friends.map((friend) => (
                                            <FriendCard key={friend.friend_id} friend={friend} onSelect={openFriendProfile} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Add Friends Tab */}
                        {activeTab === 'add' && (
                            <div>
                                {/* Friend Requests */}
                                {friendRequests.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-white font-semibold mb-4">Friend Requests</h3>
                                        <div className="space-y-4">
                                            {friendRequests.map((request) => (
                                                <FriendRequestCard
                                                    key={request.id}
                                                    request={request}
                                                    onAccept={handleAcceptRequest}
                                                    onReject={handleRejectRequest}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Search */}
                                <div className="mb-6">
                                    <h3 className="text-white font-semibold mb-4">Search Users</h3>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                                placeholder="Search by username or email..."
                                                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                            />
                                        </div>
                                        <button
                                            onClick={handleSearch}
                                            disabled={isSearching}
                                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-lg transition-all disabled:opacity-50"
                                        >
                                            Search
                                        </button>
                                    </div>
                                </div>

                                {/* Search Results */}
                                {searchResults.length > 0 && (
                                    <div>
                                        <h3 className="text-white font-semibold mb-4">Search Results</h3>
                                        <div className="space-y-4">
                                            {searchResults.map((user) => (
                                                <UserSearchCard
                                                    key={user.id}
                                                    user={user}
                                                    onSendRequest={handleSendRequest}
                                                    requestSent={sentRequests.has(user.id)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <FriendProfileModal
                isOpen={isProfileOpen}
                onClose={closeFriendProfile}
                profile={friendProfile}
                isLoading={isProfileLoading}
                onRemove={() => setIsConfirmRemoveOpen(true)}
                notifyOnWorkout={selectedFriend ? friendNotifications[selectedFriend.friend_id] ?? false : false}
                onToggleNotify={(enabled) => {
                    if (selectedFriend) {
                        handleToggleFriendNotifications(selectedFriend.friend_id, enabled);
                    }
                }}
            />
            <Modal
                isOpen={isConfirmRemoveOpen}
                onClose={() => setIsConfirmRemoveOpen(false)}
                title="Remove friend?"
                message={`Remove ${selectedFriend?.username || 'this friend'} from your friends list?`}
                buttons={[
                    {
                        label: 'Cancel',
                        onClick: () => setIsConfirmRemoveOpen(false),
                        className: 'bg-gray-700 text-white hover:bg-gray-600'
                    },
                    {
                        label: 'Remove',
                        onClick: () => {
                            if (selectedFriend) {
                                handleRemoveFriend(selectedFriend.friend_id);
                            }
                        },
                        className: 'bg-red-600 text-white hover:bg-red-500'
                    }
                ]}
            />
        </div>
    );
};
    const loadFriendNotificationSettings = async () => {
        try {
            const data = await getFriendNotificationSettings();
            const next = (data.settings || []).reduce((acc, setting) => {
                acc[setting.friendId] = setting.notifyOnWorkout;
                return acc;
            }, {});
            setFriendNotifications(next);
        } catch (error) {
            console.error('Failed to load friend notification settings:', error);
        }
    };
