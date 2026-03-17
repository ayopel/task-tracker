import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBoard } from '../../context/BoardContext';
import sheetsService from '../../services/sheetsService';
import LoadingSpinner from '../common/LoadingSpinner';

export default function JoinBoard() {
  const { boardId } = useParams();
  const { isAuthenticated, signIn } = useAuth();
  const { loadBoards, selectBoard } = useBoard();
  const navigate = useNavigate();
  const [status, setStatus] = useState('joining'); // joining | error
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;

    const join = async () => {
      try {
        setStatus('joining');
        await sheetsService.joinBoardByLink(boardId);
        await loadBoards();
        navigate(`/board/${boardId}`, { replace: true });
      } catch (err) {
        console.error('Error joining board:', err);
        setErrorMsg(
          err?.message?.includes('403') || err?.message?.includes('404')
            ? "You don't have access to this board. Ask the owner to share it with you directly."
            : 'Something went wrong joining the board. Please try again.'
        );
        setStatus('error');
      }
    };

    join();
  }, [isAuthenticated, boardId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 p-4">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            You're invited to a board
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Sign in with Google to join this board.
          </p>
          <button
            onClick={signIn}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900 p-4">
        <div className="text-center max-w-sm">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Couldn't join board
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{errorMsg}</p>
          <button
            onClick={() => navigate('/', { replace: true })}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Go to my boards
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
      <LoadingSpinner message="Joining board..." />
    </div>
  );
}
