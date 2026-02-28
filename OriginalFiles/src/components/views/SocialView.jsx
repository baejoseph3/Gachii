import React, { useState, useEffect, useRef } from 'react';
import { Users, Search, UserPlus, TrendingUp } from 'lucide-react';
import { UserSearchCard } from '../social/UserSearchCard';
import { FriendRequestCard } from '../social/FriendRequestCard';
import { FriendCard } from '../social/FriendCard';
import { FriendProfileModal } from '../social/FriendProfileModal';
import { FeedWorkoutCard } from '../social/FeedWorkoutCard';
import { Modal } from '../ui/Modal';
import { PullToRefreshIndicator, PULL_TO_REFRESH_THRESHOLD } from '../ui/PullToRefreshIndicator';
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

export const SocialView = ({ currentUser }) => {
    const [activeTab, setActiveTab] = useState('feed');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [friends, setFriends] = useState([]);
    const [feed, setFeed] = useState([]);
    const [sentRequests, setSentRequests] = useState(new Set());
    const [isSearching, setIsSearching] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [friendProfile, setFriendProfile] = useState(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isProfileLoading, setIsProfileLoading] = useState(false);
    const [isConfirmRemoveOpen, setIsConfirmRemoveOpen] = useState(false);
    const [friendNotifications, setFriendNotifications] = useState({});

    const touchStartRef = useRef(0);
    const pullingRef = useRef(false);

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

    const handleTouchStart = (event) => {
        if (window.scrollY !== 0 || activeTab !== 'feed') return;
        touchStartRef.current = event.touches[0].clientY;
        pullingRef.current = true;
    };

    const handleTouchMove = (event) => {
        if (!pullingRef.current) return;
        const distance = event.touches[0].clientY - touchStartRef.current;
        if (distance > 0) {
            setPullDistance(Math.min(distance, 120));
        }
    };

    const handleTouchEnd = () => {
        if (!pullingRef.current) return;
        pullingRef.current = false;
        if (pullDistance > PULL_TO_REFRESH_THRESHOLD) {
            setIsRefreshing(true);
            loadFeed().finally(() => {
                setIsRefreshing(false);
                setPullDistance(0);
            });
        } else {
            setPullDistance(0);
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
        <div
            className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-safe-top pb-32"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Fixed Header + Tabs */}
            <div className="fixed top-0 left-0 right-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pt-safe-top z-10 border-b border-gray-700">
                <div className="px-4">
                    {/* Header */}
                    <div className="pt-4 pb-4">
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Users className="text-blue-500" size={32} />
                            Social
                        </h1>
                        <p className="text-gray-400 mt-2">Connect with friends</p>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 pb-4 overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setActiveTab('feed')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                                activeTab === 'feed'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-800 text-gray-400'
                            }`}
                        >
                            <TrendingUp size={18} />
                            Feed
                        </button>
                        <button
                            onClick={() => setActiveTab('friends')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                                activeTab === 'friends'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-800 text-gray-400'
                            }`}
                        >
                            <Users size={18} />
                            Friends {friends.length > 0 && `(${friends.length})`}
                        </button>
                        <button
                            onClick={() => setActiveTab('add')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                                activeTab === 'add'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-800 text-gray-400'
                            }`}
                        >
                            <UserPlus size={18} />
                            Add
                            {friendRequests.length > 0 && (
                                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                    {friendRequests.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Scrollable Content with top padding to account for fixed header */}
            <div className="px-4" style={{ paddingTop: '200px' }}>
                {/* Feed Tab */}
                {activeTab === 'feed' && (
                    <div>
                        <PullToRefreshIndicator
                            isRefreshing={isRefreshing}
                            pullDistance={pullDistance}
                            threshold={PULL_TO_REFRESH_THRESHOLD}
                            idleLabel="Pull to refresh"
                            loadingLabel="Refreshing feed…"
                        />
                        {feed.length === 0 ? (
                            <div className="text-center py-12 bg-gray-800/50 rounded-2xl border border-gray-700">
                                <TrendingUp size={48} className="text-gray-600 mx-auto mb-4" />
                                <p className="text-gray-400">No workouts to show yet</p>
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
                            <div className="text-center py-12 bg-gray-800/50 rounded-2xl border border-gray-700">
                                <Users size={48} className="text-gray-600 mx-auto mb-4" />
                                <p className="text-gray-400">No friends yet</p>
                                <p className="text-gray-500 text-sm mt-2">Search for users to add them!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
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
                                <h3 className="text-white font-semibold mb-4 text-lg">Friend Requests</h3>
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
                            <h3 className="text-white font-semibold mb-4 text-lg">Search Users</h3>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                        placeholder="Search by username or email..."
                                        className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                    />
                                </div>
                                <button
                                    onClick={handleSearch}
                                    disabled={isSearching}
                                    className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-6 rounded-xl transition-all disabled:opacity-50 font-semibold"
                                >
                                    Search
                                </button>
                            </div>
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div>
                                <h3 className="text-white font-semibold mb-4 text-lg">Results</h3>
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
