import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  deleteApiKey,
  getApiKeyStatus,
  logout,
  saveApiKey,
} from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';

export default function Settings() {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  async function loadStatus() {
    setLoading(true);
    try {
      const status = await getApiKeyStatus({ force: true });
      setHasApiKey(Boolean(status.has_api_key));
      setUpdatedAt(status.updated_at || null);
    } catch (err) {
      toast.error(err.message || 'Failed to load key status.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  async function handleSaveKey() {
    try {
      await saveApiKey(apiKey);
      setApiKey('');
      setShowKeyInput(false);
      toast.success('API key saved securely.');
      await loadStatus();
    } catch (err) {
      toast.error(err.message || 'Failed to save API key.');
    }
  }

  async function handleDeleteKey() {
    try {
      await deleteApiKey();
      setShowKeyInput(false);
      toast.success('API key removed.');
      await loadStatus();
    } catch (err) {
      toast.error(err.message || 'Failed to delete API key.');
    }
  }

  function handleSignOut() {
    setShowLogoutDialog(true);
  }

  function confirmSignOut() {
    logout();
    toast.success('Logged out successfully');
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
          <p className="text-slate-400">Manage your LLM API key and account access.</p>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-bold text-white mb-2">LLM API Key (Required)</h2>
          <p className="text-slate-400 text-sm mb-4">
            Resume optimization is disabled until a valid API key is saved.
          </p>

          {loading ? (
            <p className="text-slate-300">Loading key status...</p>
          ) : hasApiKey ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="text-green-400 font-medium">Key configured</p>
                  {updatedAt && (
                    <p className="text-slate-500 text-sm mt-0.5">
                      Updated: {new Date(updatedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {showKeyInput ? (
                <div className="space-y-3">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Paste your new Groq API key"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveKey}
                      disabled={!apiKey.trim()}
                      className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors"
                    >
                      Save Key
                    </button>
                    <button
                      onClick={() => { setShowKeyInput(false); setApiKey(''); }}
                      className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowKeyInput(true)}
                    className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Update Key
                  </button>
                  <button
                    onClick={handleDeleteKey}
                    className="px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg font-semibold transition-colors"
                  >
                    Remove Key
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your Groq API key"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <button
                onClick={handleSaveKey}
                disabled={!apiKey.trim()}
                className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors"
              >
                Save Key
              </button>
            </div>
          )}
        </div>

        <div className="bg-slate-900/50 border border-red-900/50 rounded-xl p-6">
          <h2 className="text-xl font-bold text-red-400 mb-2">Session</h2>
          <p className="text-slate-400 text-sm mb-4">Sign out from this device.</p>
          <button
            onClick={handleSignOut}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={confirmSignOut}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmText="Sign Out"
        variant="danger"
      />
    </div>
  );
}
