import { useState, useEffect, useRef } from 'react';
import { useBoard } from '../../context/BoardContext';
import { useAuth } from '../../context/AuthContext';
import googleAuthService from '../../services/googleAuthService';
import Modal from '../common/Modal';
import { UserPlus, X, Users, Crown, Eye, Edit3, Link, Check } from 'lucide-react';

export default function ShareBoardModal({ isOpen, onClose, boardId }) {
  const { boards, getBoard, shareBoard, removeCollaborator } = useBoard();
  const { user } = useAuth();

  const [board, setBoard] = useState(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('viewer'); // viewer or editor
  const [suggestions, setSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isRemoving, setIsRemoving] = useState(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [error, setError] = useState('');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyLink = () => {
    const link = `${window.location.origin}/join/${boardId}`;
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const suggestionsTimeoutRef = useRef(null);

  // Sync board from the boards list whenever boards list or boardId changes
  useEffect(() => {
    if (boardId) {
      const found = getBoard(boardId);
      setBoard(found || null);
    }
  }, [boardId, boards]); // eslint-disable-line react-hooks/exhaustive-deps

  // Search contacts with debounce
  useEffect(() => {
    if (suggestionsTimeoutRef.current) {
      clearTimeout(suggestionsTimeoutRef.current);
    }

    if (email.length < 2) {
      setSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    suggestionsTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await googleAuthService.searchContacts(email);
        setSuggestions(results || []);
      } catch (err) {
        console.error('Error searching contacts:', err);
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 300);

    return () => {
      if (suggestionsTimeoutRef.current) {
        clearTimeout(suggestionsTimeoutRef.current);
      }
    };
  }, [email]);

  const handleShare = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setIsSharing(true);
    try {
      // shareBoard(boardId, email, role)
      await shareBoard(boardId, email.trim(), role === 'editor' ? 'writer' : 'reader');
      setEmail('');
      setSuggestions([]);
      setRole('viewer');
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('403') || msg.includes('domainPolicy') || msg.includes('sharingNotSupported')) {
        setError('Cannot share: the recipient\'s Google account does not allow external sharing, or you don\'t have permission to share this file.');
      } else if (msg.includes('400') || msg.includes('invalid')) {
        setError('Invalid email address. Please check and try again.');
      } else {
        setError(msg || 'Failed to share board. Please try again.');
      }
      console.error('Error sharing board:', err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId, collaboratorEmail) => {
    setIsRemoving(collaboratorId);
    try {
      await removeCollaborator(boardId, collaboratorId, { collaboratorEmail });
    } catch (err) {
      setError('Failed to remove collaborator');
      console.error('Error removing collaborator:', err);
    } finally {
      setIsRemoving(null);
    }
  };

  const handleLeaveBoard = async () => {
    setIsLeaving(true);
    try {
      // Leave = remove self as collaborator
      const selfPermission = board?.collaborators?.find(
        (c) => c.email?.toLowerCase() === user?.email?.toLowerCase()
      );
      if (selfPermission) {
        await removeCollaborator(boardId, selfPermission.id, {
          collaboratorEmail: user?.email,
        });
      }
      setShowLeaveConfirm(false);
      onClose();
    } catch (err) {
      setError('Failed to leave board');
      console.error('Error leaving board:', err);
    } finally {
      setIsLeaving(false);
    }
  };

  const isOwner = board?.isOwner ?? (board?.ownership === 'owned');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Share: ${board?.name || 'Board'}`}
      size="md"
    >
      <div className="space-y-6">
        {/* Copy Link */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Share via link</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{`${window.location.origin}/join/${boardId}`}</p>
          </div>
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
          >
            {linkCopied ? <Check className="w-4 h-4 text-green-500" /> : <Link className="w-4 h-4" />}
            {linkCopied ? 'Copied!' : 'Copy link'}
          </button>
        </div>

        {/* Share Form */}
        {isOwner && (
          <form onSubmit={handleShare} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Share with email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address..."
                  disabled={isSharing}
                  autoComplete="off"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />

                {/* Suggestions Dropdown */}
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10">
                    {suggestions.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => {
                          setEmail(contact.email);
                          setSuggestions([]);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors"
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {contact.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {contact.email}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {isLoadingSuggestions && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin">
                      <Users className="w-5 h-5 text-gray-400" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={isSharing}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isSharing || !email.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                >
                  <UserPlus className="w-5 h-5" />
                  {isSharing ? 'Sharing...' : 'Share'}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}
          </form>
        )}

        {/* Collaborators List */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Collaborators
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {board?.collaborators && board.collaborators.length > 0 ? (
              board.collaborators.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                >
                  {/* Collaborator Info */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-300">
                        {collaborator.name?.[0]?.toUpperCase() ||
                          collaborator.email?.[0]?.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {collaborator.name || collaborator.email}
                      </div>
                      {collaborator.name && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                          {collaborator.email}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Role and Actions */}
                  <div className="flex items-center gap-3 ml-3">
                    {/* Owner Badge */}
                    {collaborator.isOwner && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-xs font-medium">
                        <Crown className="w-3 h-3" />
                        Owner
                      </div>
                    )}

                    {/* Role Badge */}
                    {!collaborator.isOwner && (
                      <div
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                          collaborator.role === 'editor'
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {collaborator.role === 'editor' ? (
                          <Edit3 className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                        {collaborator.role === 'editor' ? 'Editor' : 'Viewer'}
                      </div>
                    )}

                    {/* Remove Button */}
                    {isOwner && !collaborator.isOwner && (
                      <button
                        onClick={() => handleRemoveCollaborator(collaborator.id, collaborator.email)}
                        disabled={isRemoving === collaborator.id}
                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                        title="Remove collaborator"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No collaborators yet
              </p>
            )}
          </div>
        </div>

        {/* Leave Board Option */}
        {!isOwner && (
          <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="w-full px-4 py-2 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition-colors"
            >
              Leave Board
            </button>
          </div>
        )}

        {/* Leave Confirmation Dialog */}
        {showLeaveConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-sm w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Leave Board?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Are you sure you want to leave "{board?.name}"? You can request
                access again later if needed.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  disabled={isLeaving}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLeaveBoard}
                  disabled={isLeaving}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLeaving ? 'Leaving...' : 'Leave'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
