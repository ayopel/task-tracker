import { useState, useRef, useEffect } from 'react';
import { useTask } from '../../context/TaskContext';
import { useAuth } from '../../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import { formatDistanceToNow } from 'date-fns';
import { Send, Edit3, Trash2, MessageSquare } from 'lucide-react';
import ConfirmDialog from '../common/ConfirmDialog';

export default function TaskComments({ taskId }) {
  const { getTaskComments, addComment, updateComment, deleteComment, members } =
    useTask();
  const { user } = useAuth();
  const [commentBody, setCommentBody] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingBody, setEditingBody] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(null);
  const [atInput, setAtInput] = useState('');
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [mentionCursorPos, setMentionCursorPos] = useState(0);
  const textareaRef = useRef(null);
  const editTextareaRef = useRef(null);

  const comments = getTaskComments(taskId);

  // Update mention suggestions when @ is typed
  useEffect(() => {
    const textBeforeCursor = commentBody.substring(
      0,
      textareaRef.current?.selectionStart || 0
    );
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const searchText = textBeforeCursor.substring(lastAtIndex + 1);
      if (searchText.length > 0 && !searchText.includes(' ')) {
        const filtered = members.filter((member) =>
          member.email.toLowerCase().includes(searchText.toLowerCase())
        );
        setMentionSuggestions(filtered);
        setShowMentionSuggestions(true);
        setMentionCursorPos(lastAtIndex);
      } else {
        setShowMentionSuggestions(false);
      }
    } else {
      setShowMentionSuggestions(false);
    }
  }, [commentBody, members]);

  const handleAddComment = async () => {
    if (!commentBody.trim()) return;

    try {
      await addComment({
        taskId,
        body: commentBody,
        createdBy: user?.email,
      });
      setCommentBody('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleEditComment = async (commentId) => {
    try {
      const fullComment = comments.find(c => c.commentId === commentId);
      if (!fullComment) return;
      await updateComment({ ...fullComment, body: editingBody });
      setEditingCommentId(null);
      setEditingBody('');
    } catch (error) {
      console.error('Error editing comment:', error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const fullComment = comments.find(c => c.commentId === commentId);
      if (!fullComment) return;
      await deleteComment(fullComment);
      setShowDeleteDialog(null);
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleMentionSelect = (member) => {
    const textBeforeMention = commentBody.substring(
      0,
      mentionCursorPos
    );
    const textAfterMention = commentBody.substring(textareaRef.current?.selectionStart || 0);
    const newText = `${textBeforeMention}@${member.email} ${textAfterMention}`;
    setCommentBody(newText);
    setShowMentionSuggestions(false);
    setAtInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleAddComment();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare size={18} className="text-gray-600 dark:text-gray-400" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Comments
        </h2>
        <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
          {comments.length}
        </span>
      </div>

      {/* Comments list */}
      <div className="space-y-4 mb-6">
        {comments.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm italic">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.commentId}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                    {comment.createdBy}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {comment.createdAt
                      ? formatDistanceToNow(new Date(comment.createdAt), {
                          addSuffix: true,
                        })
                      : 'Just now'}
                  </p>
                </div>
                {comment.createdBy === user?.email && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingCommentId(comment.commentId);
                        setEditingBody(comment.body);
                      }}
                      className="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      title="Edit comment"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      onClick={() => setShowDeleteDialog(comment.commentId)}
                      className="p-1 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Delete comment"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {editingCommentId === comment.commentId ? (
                <div className="space-y-2">
                  <textarea
                    ref={editTextareaRef}
                    value={editingBody}
                    onChange={(e) => setEditingBody(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    rows="4"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditComment(comment.commentId)}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingCommentId(null);
                        setEditingBody('');
                      }}
                      className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="prose dark:prose-invert max-w-none text-sm">
                  {comment.isDeleted ? (
                    <p className="text-gray-400 dark:text-gray-500 italic">
                      [deleted]
                    </p>
                  ) : (
                    <ReactMarkdown>{comment.body}</ReactMarkdown>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add comment form */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="space-y-3">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a comment (Markdown supported, Ctrl+Enter to submit)... Type @ to mention"
              rows="4"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            {showMentionSuggestions && mentionSuggestions.length > 0 && (
              <div className="absolute top-12 left-0 right-0 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                {mentionSuggestions.map((member) => (
                  <button
                    key={member.email}
                    onClick={() => handleMentionSelect(member)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2 border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                  >
                    <div className="w-5 h-5 rounded-full bg-blue-500 dark:bg-blue-600 text-white text-xs font-medium flex items-center justify-center">
                      {member.email.substring(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-xs">{member.displayName}</div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs">
                        {member.email}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleAddComment}
              disabled={!commentBody.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              <Send size={14} />
              Comment
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={!!showDeleteDialog}
        onClose={() => setShowDeleteDialog(null)}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={() => handleDeleteComment(showDeleteDialog)}
      />
    </div>
  );
}
