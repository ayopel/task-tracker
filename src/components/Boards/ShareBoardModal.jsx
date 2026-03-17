import { useEffect, useMemo, useRef, useState } from 'react';
import { X, UserPlus, Users } from 'lucide-react';
import { useBoard } from '../../context/BoardContext';
import { useAuth } from '../../context/AuthContext';
import googleAuthService from '../../services/googleAuthService';

const ROLE_OPTIONS = [
  { label: 'Can edit', value: 'writer' },
  { label: 'Can view', value: 'reader' },
];

const RECENT_CONTACTS_KEY = 'share_board_recent_contacts';
const MAX_RECENT_CONTACTS = 8;
const PEOPLE_DEBOUNCE_MS = 250;
const PEOPLE_MIN_QUERY_LENGTH = 2;
const SUGGESTION_CACHE_TTL_MS = 5 * 60 * 1000;

const readRecentContacts = () => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem(RECENT_CONTACTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const persistRecentContacts = (contacts) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      RECENT_CONTACTS_KEY,
      JSON.stringify(contacts.slice(0, MAX_RECENT_CONTACTS))
    );
  } catch {
    // ignore
  }
};

const getInitials = (text = '') => {
  if (!text.trim()) return '';
  const parts = text.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

export default function ShareBoardModal({ isOpen, onClose, boardId, boardName }) {
  const { shareBoard, fetchCollaborators, removeCollaborator } = useBoard();
  const { user } = useAuth();

  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(ROLE_OPTIONS[0].value);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recentContacts, setRecentContacts] = useState([]);
  const [remoteSuggestions, setRemoteSuggestions] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [inputFocused, setInputFocused] = useState(false);
  const [pendingLeave, setPendingLeave] = useState(null);
  const [processingLeave, setProcessingLeave] = useState(false);

  const inputRef = useRef(null);
  const blurTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);
  const suggestionsCacheRef = useRef(new Map());
  const lastSelectedSuggestionRef = useRef(null);
  const currentUserEmail = user?.email?.trim().toLowerCase() || null;

  // Load collaborators from live API whenever the modal opens
  useEffect(() => {
    if (!boardId || !isOpen) return;
    loadCollaborators();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, isOpen]);

  // Load recent contacts when modal opens; reset state when it closes
  useEffect(() => {
    if (isOpen) {
      const stored = readRecentContacts();
      const filtered = currentUserEmail
        ? stored.filter((c) => {
            const v = typeof c === 'string' ? c : c?.email;
            return v?.toLowerCase() !== currentUserEmail;
          })
        : stored;
      setRecentContacts(filtered);
      return;
    }
    // Reset on close
    setCollaborators([]);
    setEmail('');
    setError('');
    setSubmitting(false);
    setRemoteSuggestions([]);
    setIsSuggesting(false);
    setActiveSuggestion(-1);
    setInputFocused(false);
    setPendingLeave(null);
    setProcessingLeave(false);
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, [isOpen, currentUserEmail]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  const loadCollaborators = async () => {
    try {
      setLoading(true);
      const data = await fetchCollaborators(boardId);
      setCollaborators((data || []).filter((p) => p.type === 'user'));
    } catch (err) {
      console.error(err);
      setError('Failed to load collaborators');
    } finally {
      setLoading(false);
    }
  };

  // Debounced remote contact search
  useEffect(() => {
    if (!isOpen) return;

    const trimmed = email.trim();
    if (trimmed.length < PEOPLE_MIN_QUERY_LENGTH) {
      abortControllerRef.current?.abort();
      abortControllerRef.current = null;
      setRemoteSuggestions([]);
      setIsSuggesting(false);
      return;
    }

    const normalizedQuery = trimmed.toLowerCase();
    const cached = suggestionsCacheRef.current.get(normalizedQuery);
    if (cached && cached.expiry > Date.now()) {
      setRemoteSuggestions(cached.results);
      setIsSuggesting(false);
      return;
    }

    setIsSuggesting(true);
    const controller = new AbortController();
    abortControllerRef.current?.abort();
    abortControllerRef.current = controller;

    const debounceId = setTimeout(async () => {
      try {
        const results = await googleAuthService.searchContacts(trimmed, {
          signal: controller.signal,
        });
        suggestionsCacheRef.current.set(normalizedQuery, {
          results,
          expiry: Date.now() + SUGGESTION_CACHE_TTL_MS,
        });
        setRemoteSuggestions(results);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch Google contacts', err);
        }
        setRemoteSuggestions([]);
      } finally {
        setIsSuggesting(false);
      }
    }, PEOPLE_DEBOUNCE_MS);

    return () => {
      clearTimeout(debounceId);
      controller.abort();
    };
  }, [email, isOpen]);

  const rememberRecentContact = (contact) => {
    if (!contact?.email) return;
    const normalizedEmail = contact.email.toLowerCase();
    if (currentUserEmail && normalizedEmail === currentUserEmail) return;

    setRecentContacts((prev = []) => {
      const deduped = prev.filter((entry) => {
        const entryEmail = (typeof entry === 'string' ? entry : entry?.email) || '';
        return entryEmail.toLowerCase() !== normalizedEmail;
      });
      const updated = [
        {
          email: contact.email,
          displayName: contact.displayName || contact.email,
          photoUrl: contact.photoUrl || null,
          source: contact.source || 'recent',
          timestamp: Date.now(),
        },
        ...deduped,
      ].slice(0, MAX_RECENT_CONTACTS);
      persistRecentContacts(updated);
      return updated;
    });
  };

  const normalizedEmailInput = email.trim().toLowerCase();

  const localMatches = useMemo(() => {
    const matchesTerm = (value = '', term = '') => value.toLowerCase().includes(term);
    const isSelf = (value = '') => currentUserEmail && value.toLowerCase() === currentUserEmail;

    const recents = (recentContacts || [])
      .map((contact) => {
        if (!contact) return null;
        if (typeof contact === 'string') return { email: contact, displayName: contact, source: 'recent' };
        return { email: contact.email, displayName: contact.displayName || contact.email, photoUrl: contact.photoUrl, source: contact.source || 'recent' };
      })
      .filter((c) => !!c?.email && !isSelf(c.email));

    const collabEntries = (collaborators || [])
      .map((c) => ({ email: c.emailAddress, displayName: c.displayName || c.emailAddress, source: 'collaborator' }))
      .filter((e) => !!e.email && !isSelf(e.email));

    if (!normalizedEmailInput) {
      return [...recents.slice(0, MAX_RECENT_CONTACTS), ...collabEntries];
    }

    const term = normalizedEmailInput;
    return [
      ...recents.filter((c) => matchesTerm(c.email, term) || matchesTerm(c.displayName || '', term)),
      ...collabEntries.filter((c) => matchesTerm(c.email, term) || matchesTerm(c.displayName || '', term)),
    ];
  }, [recentContacts, collaborators, normalizedEmailInput, currentUserEmail]);

  const suggestionOptions = useMemo(() => {
    const seen = new Set();
    return [...localMatches, ...remoteSuggestions].filter((item) => {
      const key = item.email?.toLowerCase();
      if (!key || seen.has(key) || (currentUserEmail && key === currentUserEmail)) return false;
      seen.add(key);
      return true;
    });
  }, [localMatches, remoteSuggestions, currentUserEmail]);

  const collaboratorEmails = useMemo(() => {
    const emails = new Set();
    (collaborators || []).forEach((c) => {
      const v = c.emailAddress?.toLowerCase();
      if (v) emails.add(v);
    });
    return emails;
  }, [collaborators]);

  const alreadyCollaborator = normalizedEmailInput && collaboratorEmails.has(normalizedEmailInput);
  const shouldShowSuggestions = inputFocused && (suggestionOptions.length > 0 || isSuggesting);

  const handleSuggestionSelect = (suggestion) => {
    if (!suggestion?.email) return;
    setEmail(suggestion.email);
    lastSelectedSuggestionRef.current = suggestion;
    setActiveSuggestion(-1);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleKeyNavigation = (event) => {
    if (!shouldShowSuggestions || suggestionOptions.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveSuggestion((prev) => (prev + 1 >= suggestionOptions.length ? 0 : prev + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveSuggestion((prev) => (prev - 1 < 0 ? suggestionOptions.length - 1 : prev - 1));
    } else if (event.key === 'Enter') {
      if (activeSuggestion >= 0 && suggestionOptions[activeSuggestion]) {
        event.preventDefault();
        handleSuggestionSelect(suggestionOptions[activeSuggestion]);
      }
    } else if (event.key === 'Escape') {
      setInputFocused(false);
      setActiveSuggestion(-1);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) { setError('Enter an email address'); return; }
    if (alreadyCollaborator) { setError('This person already has access'); return; }

    setSubmitting(true);
    setError('');
    try {
      await shareBoard(boardId, trimmedEmail, role);

      const matchedSuggestion =
        suggestionOptions.find((s) => s.email?.toLowerCase() === trimmedEmail.toLowerCase()) ||
        lastSelectedSuggestionRef.current;

      rememberRecentContact({
        email: trimmedEmail,
        displayName: matchedSuggestion?.displayName || trimmedEmail,
        photoUrl: matchedSuggestion?.photoUrl || null,
        source: matchedSuggestion?.source || 'manual',
      });

      setEmail('');
      setRole(ROLE_OPTIONS[0].value);
      setRemoteSuggestions([]);
      lastSelectedSuggestionRef.current = null;
      await loadCollaborators();
    } catch (err) {
      console.error(err);
      const msg = err?.message || '';
      if (msg.includes('403') || msg.includes('domainPolicy') || msg.includes('sharingNotSupported')) {
        setError("Cannot share: the recipient's Google account does not allow external sharing, or you don't have permission.");
      } else if (msg.includes('400') || msg.includes('invalid')) {
        setError('Invalid email address. Please check and try again.');
      } else if (msg.includes('401')) {
        setError('Your session expired. Please sign out and sign back in.');
      } else {
        setError(msg || 'Unable to share board. Verify email and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (permissionId, collaboratorEmail) => {
    try {
      setError('');
      await removeCollaborator(boardId, permissionId, { collaboratorEmail });
      await loadCollaborators();
    } catch (err) {
      console.error(err);
      setError('Failed to remove collaborator');
    }
  };

  const handleConfirmLeave = async () => {
    if (!pendingLeave?.permissionId) { setPendingLeave(null); return; }
    const permissionId = pendingLeave.permissionId;
    setPendingLeave(null);
    try {
      setProcessingLeave(true);
      setError('');
      await removeCollaborator(boardId, permissionId, { collaboratorEmail: pendingLeave.email });
      onClose?.();
    } catch (err) {
      console.error(err);
      setError('Failed to leave board');
    } finally {
      setProcessingLeave(false);
    }
  };

  if (!isOpen) return null;

  // Determine if current user is the owner from the live collaborators list
  const selfCollab = collaborators.find(
    (c) => c.emailAddress?.toLowerCase() === currentUserEmail
  );
  const isOwner = selfCollab ? selfCollab.role === 'owner' : true; // assume owner if not yet loaded

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-6">
            <div>
              <p className="text-sm uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1">
                Share Board
              </p>
              {boardName && (
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {boardName}
                </h2>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
            >
              <X size={22} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Invite form */}
            {isOwner && (
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                  {/* Email input with suggestions */}
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email address
                    </label>
                    <div className="relative">
                      <input
                        ref={inputRef}
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError('');
                          setActiveSuggestion(-1);
                          lastSelectedSuggestionRef.current = null;
                        }}
                        onFocus={() => {
                          if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
                          setInputFocused(true);
                        }}
                        onBlur={() => {
                          blurTimeoutRef.current = setTimeout(() => {
                            setInputFocused(false);
                            setActiveSuggestion(-1);
                          }, 80);
                        }}
                        onKeyDown={handleKeyNavigation}
                        placeholder="name@example.com"
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                        autoComplete="off"
                      />

                      {/* Suggestions dropdown */}
                      {shouldShowSuggestions && (
                        <div className="absolute left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl z-20">
                          <div role="listbox" aria-label="Suggested collaborators">
                            {suggestionOptions.map((suggestion, index) => (
                              <button
                                type="button"
                                key={suggestion.email}
                                role="option"
                                aria-selected={activeSuggestion === index}
                                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
                                  activeSuggestion === index
                                    ? 'bg-gray-100 dark:bg-gray-700'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleSuggestionSelect(suggestion);
                                }}
                              >
                                {suggestion.photoUrl ? (
                                  <img
                                    src={suggestion.photoUrl}
                                    alt=""
                                    className="h-8 w-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-sm font-semibold text-blue-700 dark:text-blue-300">
                                    {getInitials(suggestion.displayName || suggestion.email)}
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {suggestion.displayName || suggestion.email}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {suggestion.email}
                                  </p>
                                </div>
                                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                  {suggestion.source === 'google'
                                    ? 'Google'
                                    : suggestion.source === 'collaborator'
                                    ? 'Collaborator'
                                    : 'Recent'}
                                </span>
                              </button>
                            ))}
                            {isSuggesting && (
                              <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2 text-xs text-gray-400 dark:text-gray-500">
                                Searching Google contacts...
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    {alreadyCollaborator && (
                      <p className="mt-1 text-xs text-yellow-600 dark:text-yellow-400">
                        This person already has access.
                      </p>
                    )}
                  </div>

                  {/* Role selector */}
                  <div className="w-full md:w-40">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Access level
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {ROLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Submit button */}
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
                    >
                      <UserPlus size={18} />
                      {submitting ? 'Sharing...' : 'Share'}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Collaborators list */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users size={18} className="text-gray-400 dark:text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Collaborators
                </h3>
              </div>

              {loading ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading collaborators...</div>
              ) : collaborators.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Only you have access right now.
                </p>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg">
                  {collaborators.map((collab) => {
                    const normalizedAddress = collab.emailAddress?.toLowerCase();
                    const isSelf = currentUserEmail && normalizedAddress === currentUserEmail;
                    const canLeave = isSelf && collab.role !== 'owner';
                    const canRemove = collab.role !== 'owner' && !isSelf && isOwner;

                    return (
                      <li
                        key={collab.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">
                            {collab.displayName || collab.emailAddress}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {collab.emailAddress}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {collab.role === 'owner' && (
                              <span className="inline-flex text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                                Owner
                              </span>
                            )}
                            {isSelf && (
                              <span className="inline-flex text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                You
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {collab.role === 'writer'
                              ? 'Can edit'
                              : collab.role === 'reader'
                              ? 'Can view'
                              : collab.role === 'owner'
                              ? 'Owner'
                              : collab.role}
                          </span>
                          {canRemove && (
                            <button
                              onClick={() => handleRemove(collab.id, collab.emailAddress)}
                              className="text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                            >
                              Remove
                            </button>
                          )}
                          {canLeave && (
                            <button
                              onClick={() =>
                                setPendingLeave({
                                  permissionId: collab.id,
                                  email: collab.emailAddress,
                                  displayName: collab.displayName || collab.emailAddress,
                                })
                              }
                              className="text-sm font-medium text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300"
                            >
                              Leave board
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500">
              Shared collaborators get access to the underlying Google Sheet. Removing someone revokes access immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Leave confirmation dialog */}
      {pendingLeave && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setPendingLeave(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close"
            >
              <X size={22} />
            </button>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Leave board?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                You will lose access to this board immediately. This cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setPendingLeave(null)}
                  disabled={processingLeave}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  Stay
                </button>
                <button
                  onClick={handleConfirmLeave}
                  disabled={processingLeave}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors disabled:opacity-60"
                >
                  {processingLeave ? 'Leaving...' : 'Leave board'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
