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
    <div className="min-h-screen bg-bg-primary text-text-primary p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-text-primary mb-2 italic tracking-tighter uppercase font-black">Account Settings</h1>
          <p className="text-text-muted text-[10px] font-black uppercase tracking-widest">Manage your API configuration and account session</p>
        </div>

        <div className="bg-bg-surface border border-border-muted rounded-[2.5rem] p-10 shadow-xl shadow-black/5 mb-8 overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-brand-primary/20" />
          <h2 className="text-xl font-black text-text-primary mb-4 italic tracking-tighter uppercase">Groq API Key</h2>
          <p className="text-text-secondary text-sm leading-relaxed mb-8 font-medium">
            This system utilizes Groq's high-performance inference engine for optimization. Secure your free access key from{' '}
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-primary hover:text-brand-hover underline font-black"
            >
              console.groq.com/keys
            </a>
            . Optimization protocols are disabled until a valid key is integrated.
          </p>

          {loading ? (
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
              <p className="text-text-muted text-[10px] font-black uppercase tracking-widest">Querying status...</p>
            </div>
          ) : hasApiKey ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-6 bg-bg-secondary border border-border-subtle rounded-3xl">
                <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-text-primary font-black text-[10px] uppercase tracking-widest italic">Key Validated</p>
                  {updatedAt && (
                    <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.05em] mt-1">
                      Last Updated: {new Date(updatedAt).toLocaleString()}
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
                    placeholder="Enter secondary key manifest"
                    className="w-full px-6 py-4 bg-bg-secondary border border-border-subtle rounded-2xl text-text-primary placeholder-text-muted/50 focus:outline-none focus:border-brand-primary/30 transition-all font-medium text-sm"
                  />
                  <div className="flex gap-4">
                    <button
                      onClick={handleSaveKey}
                      disabled={!apiKey.trim()}
                      className="px-8 py-3 bg-brand-primary text-black rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-brand-primary/20 hover:bg-brand-hover transition-all disabled:opacity-50 active:scale-95"
                    >
                      Save API Key
                    </button>
                    <button
                      onClick={() => { setShowKeyInput(false); setApiKey(''); }}
                      className="px-8 py-3 bg-bg-secondary text-text-muted rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-bg-primary transition-all active:scale-95 border border-border-subtle"
                    >
                      Abort
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowKeyInput(true)}
                    className="px-8 py-3 bg-text-primary text-bg-primary rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all active:scale-95"
                  >
                    Update Key
                  </button>
                  <button
                    onClick={handleDeleteKey}
                    className="px-8 py-3 bg-bg-secondary border border-border-subtle text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500/10 transition-all active:scale-95"
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
                placeholder="Paste your primary key manifest"
                className="w-full px-6 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl text-neutral-900 placeholder-neutral-300 focus:outline-none focus:border-[#606c38]/30 transition-all font-medium text-sm"
              />
              <button
                onClick={handleSaveKey}
                disabled={!apiKey.trim()}
                className="px-10 py-4 bg-[#606c38] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-olive-500/20 hover:bg-[#4a532b] transition-all active:scale-95 disabled:opacity-50"
              >
                Save Key
              </button>
            </div>
          )}
        </div>

        <div className="bg-bg-surface border border-border-muted rounded-[2.5rem] p-10 shadow-xl shadow-black/5">
          <h2 className="text-xl font-black text-text-primary mb-2 italic tracking-tighter uppercase">Account Session</h2>
          <p className="text-text-muted text-[10px] font-black uppercase tracking-widest mb-8">Sign out of your active user session</p>
          <button
            onClick={handleSignOut}
            className="px-10 py-4 bg-bg-secondary text-text-muted hover:bg-bg-primary hover:text-text-primary rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 border border-border-subtle"
          >
            Logout
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
