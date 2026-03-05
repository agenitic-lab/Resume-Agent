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
import { Skeleton } from '../components/ui/skeleton';

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

  async function confirmSignOut() {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-primary text-primary p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-12">
          <h1 className="text-3xl font-bold text-primary mb-2 tracking-tight">Account Settings</h1>
          <p className="text-gray-500 text-sm">Manage your API configuration and account session</p>
        </div>

        <div className="bg-surface border border-gray-200 rounded-[2.5rem] p-6 md:p-10 shadow-xl shadow-black/5 mb-8 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-brand/20" />
          <h2 className="text-lg font-semibold text-primary mb-4">Groq API Key</h2>
          <p className="text-secondary text-sm leading-relaxed mb-8 font-medium">
            This system utilizes Groq's API for AI resume optimization. Secure your free API key from{' '}
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:text-brand-hover underline font-black"
            >
              console.groq.com/keys
            </a>
            . Resume optimization requires a valid API key.
          </p>

          {loading ? (
            <div className="space-y-3">
              <div className="flex items-center gap-4 p-6 bg-secondary border border-gray-100 rounded-3xl">
                <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-8 w-20 rounded-xl shrink-0" />
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-10 flex-1 rounded-2xl" />
              </div>
            </div>
          ) : hasApiKey ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-6 bg-secondary border border-gray-100 rounded-3xl">
                <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-brand" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-primary font-semibold text-sm">Key Validated</p>
                  {updatedAt && (
                    <p className="text-gray-500 text-xs mt-1">
                      Last updated: {new Date(updatedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {showKeyInput ? (
                <div className="space-y-4">
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your Groq API key"
                    className="w-full px-6 py-4 bg-secondary border border-gray-100 rounded-2xl text-primary placeholder-text-muted/50 focus:outline-none focus:border-brand-primary/30 transition-all font-medium text-sm"
                  />
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={handleSaveKey}
                      disabled={!apiKey.trim()}
                      className="px-8 py-3 bg-brand text-white rounded-2xl font-semibold text-sm tracking-wide shadow-lg shadow-brand/20 hover:bg-brand-hover transition-all disabled:opacity-50 active:scale-95"
                    >
                      Save API Key
                    </button>
                    <button
                      onClick={() => { setShowKeyInput(false); setApiKey(''); }}
                      className="px-8 py-3 bg-secondary text-gray-500 rounded-2xl font-medium text-sm hover:bg-primary transition-all active:scale-95 border border-gray-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => setShowKeyInput(true)}
                    className="px-8 py-3 bg-brand text-white rounded-2xl font-semibold text-sm tracking-wide hover:bg-brand-hover transition-all active:scale-95"
                  >
                    Update Key
                  </button>
                  <button
                    onClick={handleDeleteKey}
                    className="px-8 py-3 bg-secondary border border-gray-100 text-red-500 rounded-2xl font-semibold text-sm hover:bg-red-500/10 transition-all active:scale-95"
                  >
                    Remove Key
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your Groq API key"
                className="w-full px-6 py-4 bg-secondary border border-gray-100 rounded-2xl text-primary placeholder-text-muted/50 focus:outline-none focus:border-brand-primary/30 transition-all font-medium text-sm"
              />
              <button
                onClick={handleSaveKey}
                disabled={!apiKey.trim()}
                className="px-10 py-4 bg-brand text-white rounded-2xl font-semibold text-sm tracking-wide shadow-xl shadow-brand/20 hover:bg-brand-hover transition-all active:scale-95 disabled:opacity-50"
              >
                Save Key
              </button>
            </div>
          )}
        </div>

        <div className="bg-surface border border-gray-200 rounded-[2.5rem] p-6 md:p-10 shadow-xl shadow-black/5">
          <h2 className="text-lg font-semibold text-primary mb-2">Account Session</h2>
          <p className="text-gray-500 text-sm mb-8">Sign out of your active user session</p>
          <button
            onClick={handleSignOut}
            className="px-8 py-3 bg-secondary text-gray-500 hover:bg-primary hover:text-primary rounded-2xl font-medium text-sm transition-all active:scale-95 border border-gray-100"
          >
            Logout
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showLogoutDialog}
        onCancel={() => setShowLogoutDialog(false)}
        onConfirm={confirmSignOut}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        confirmText="Sign Out"
        variant="danger"
      />
    </div>
  );
}
