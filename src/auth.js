/**
 * Arcade FX — Supabase Authentication Controller (src/auth.js)
 * Controls user signup, login, password reset, email verification alerts,
 * and session state synchronization.
 */

import { getSupabase } from './supabase.js';
import { ApiClient } from './data/apiClient.js';

let currentUser = null;
let currentProfile = null;

export function captureReferralParameter() {
  if (typeof window === 'undefined') return;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref') || urlParams.get('referral');
    if (refCode && refCode.trim() !== '') {
      const cleanCode = refCode.trim().toUpperCase();
      sessionStorage.setItem('arcadefx_ref_code', cleanCode);
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `arcadefx_ref_code=${cleanCode}; expires=${expires}; path=/; SameSite=Lax`;
      console.log('[ArcadeFX Referral] Captured referral code:', cleanCode);
    }
  } catch (e) {
    console.warn('[ArcadeFX Referral] Parameter capture warning:', e);
  }
}

export function getStoredReferralCode() {
  if (typeof window === 'undefined') return null;
  try {
    const sessionVal = sessionStorage.getItem('arcadefx_ref_code');
    if (sessionVal) return sessionVal.trim().toUpperCase();

    const match = document.cookie.match(/(?:^|; )arcadefx_ref_code=([^;]*)/);
    if (match && match[1]) return decodeURIComponent(match[1]).trim().toUpperCase();
  } catch (e) {}
  return null;
}

export const AuthState = {
  getUser: () => currentUser,
  getProfile: () => currentProfile,
  isAuthenticated: () => Boolean(currentUser)
};

export function initAuth(onUserChangedCallback) {
  captureReferralParameter();
  const supabase = getSupabase();
  if (!supabase) return;

  // Listen to auth changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    currentUser = session?.user || null;

    if (currentUser) {
      // Fetch profile
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        currentProfile = profile || {
          id: currentUser.id,
          email: currentUser.email,
          full_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0],
          is_verified: currentUser.email_confirmed_at != null
        };
      } catch (err) {
        currentProfile = {
          id: currentUser.id,
          email: currentUser.email,
          full_name: currentUser.email?.split('@')[0],
          is_verified: false
        };
      }
    } else {
      currentProfile = null;
    }

    updateAuthUI();

    if (typeof onUserChangedCallback === 'function') {
      onUserChangedCallback(currentUser, currentProfile);
    }
  });

  // Attach DOM event listeners
  setupAuthModalListeners();
}

export function updateAuthUI() {
  const user = currentUser;
  const profile = currentProfile;

  // Header Avatar & User details
  const avatarElem = document.querySelector('.user-profile .avatar');
  const profileContainer = document.querySelector('.user-profile');
  const logoutBtn = document.getElementById('logoutBtn');

  const userGreetingElem = document.getElementById('userGreetingName');
  if (userGreetingElem) {
    let displayName = 'Trader';
    if (user) {
      displayName = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || (user.email ? user.email.split('@')[0] : 'Trader');
    } else {
      try {
        const stored = localStorage.getItem('arcadefx_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          displayName = parsed.full_name || parsed.name || 'Trader';
        }
      } catch (e) {}
    }
    userGreetingElem.textContent = displayName;
  }

  if (avatarElem) {
    if (user) {
      const name = profile?.full_name || user.email || 'User';
      const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      avatarElem.textContent = initials || 'AF';
      avatarElem.title = `${name} (${user.email}) - Click to manage account`;
    } else {
      avatarElem.textContent = '👤';
      avatarElem.title = 'Click to Log In / Sign Up';
    }
  }

  if (profileContainer) {
    profileContainer.style.cursor = 'pointer';
    profileContainer.onclick = () => {
      if (user) {
        openAccountDrawer();
      } else {
        openAuthModal('login');
      }
    };
  }

  if (logoutBtn) {
    if (user) {
      logoutBtn.style.display = 'flex';
      logoutBtn.onclick = (e) => {
        e.preventDefault();
        signOutUser();
      };
    } else {
      logoutBtn.style.display = 'flex';
      logoutBtn.onclick = (e) => {
        e.preventDefault();
        openAuthModal('login');
      };
    }
  }
}

export async function signUpUser(email, password, fullName, phone) {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase client unavailable' };

  try {
    const refCode = getStoredReferralCode();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone || '',
          referral_code: refCode || undefined
        },
        emailRedirectTo: `${window.location.origin}/index.html`
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data?.user && refCode) {
      try {
        await ApiClient.request('referrals', {
          method: 'POST',
          body: { referral_code: refCode }
        });
      } catch (rErr) {
        console.warn('[Referral Attribution Warning]', rErr.message);
      }
    }

    return {
      success: true,
      user: data.user,
      message: 'Registration successful! A verification link has been sent to your email.'
    };
  } catch (err) {
    return { success: false, error: err.message || 'Registration failed' };
  }
}

export async function signInUser(email, password) {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase client unavailable' };

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      let msg = error.message;
      if (msg.includes('Invalid login credentials')) {
        msg = 'Invalid email or password. If you do not have an account yet, please click "Create Account" above to register.';
      }
      return { success: false, error: msg };
    }

    return { success: true, user: data.user };
  } catch (err) {
    return { success: false, error: err.message || 'Authentication failed' };
  }
}

export async function signOutUser() {
  const supabase = getSupabase();
  if (supabase) {
    try { await supabase.auth.signOut(); } catch(e) {}
  }
  try { localStorage.removeItem('arcade_user_session'); } catch(e) {}
  currentUser = null;
  currentProfile = null;
  const targetLanding = 'landing.html';
  window.location.href = targetLanding;
}

export async function resetPassword(email) {
  const supabase = getSupabase();
  if (!supabase) return { success: false, error: 'Supabase client unavailable' };

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/index.html?action=reset-password`
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    };
  } catch (err) {
    return { success: false, error: 'Unable to request password reset' };
  }
}

export function openAuthModal(tab = 'login') {
  let backdrop = document.getElementById('authModalBackdrop');
  if (!backdrop) return;

  switchAuthTab(tab);
  backdrop.classList.add('active');
}

export function closeAuthModal() {
  const backdrop = document.getElementById('authModalBackdrop');
  if (backdrop) backdrop.classList.remove('active');
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('authFormLogin');
  const signupForm = document.getElementById('authFormSignup');
  const forgotForm = document.getElementById('authFormForgot');
  const tabLogin = document.getElementById('authTabLogin');
  const tabSignup = document.getElementById('authTabSignup');
  const title = document.getElementById('authModalTitle');

  if (!loginForm || !signupForm || !forgotForm) return;

  loginForm.style.display = 'none';
  signupForm.style.display = 'none';
  forgotForm.style.display = 'none';

  if (tabLogin) tabLogin.classList.remove('active');
  if (tabSignup) tabSignup.classList.remove('active');

  if (tab === 'signup') {
    signupForm.style.display = 'block';
    if (tabSignup) tabSignup.classList.add('active');
    if (title) title.textContent = 'Create Arcade FX Account';
  } else if (tab === 'forgot') {
    forgotForm.style.display = 'block';
    if (title) title.textContent = 'Reset Password';
  } else {
    loginForm.style.display = 'block';
    if (tabLogin) tabLogin.classList.add('active');
    if (title) title.textContent = 'Sign In to Arcade FX';
  }
}

function openAccountDrawer() {
  let drawer = document.getElementById('accountDrawerBackdrop');
  if (drawer) {
    drawer.classList.add('active');
    // Refresh user profile details in drawer
    const emailElem = document.getElementById('drawerUserEmail');
    const nameElem = document.getElementById('drawerUserName');
    const statusElem = document.getElementById('drawerUserStatus');

    if (emailElem && currentUser) emailElem.textContent = currentUser.email;
    if (nameElem) nameElem.textContent = currentProfile?.full_name || 'Trader';
    if (statusElem) {
      const isVer = currentProfile?.is_verified || currentUser?.email_confirmed_at != null;
      statusElem.textContent = isVer ? '✓ Verified Trader' : '⚠️ Unverified Email';
      statusElem.style.color = isVer ? 'var(--accent-bull)' : 'var(--accent-bear)';
    }
  }
}

function setupAuthModalListeners() {
  document.getElementById('authTabLogin')?.addEventListener('click', () => switchAuthTab('login'));
  document.getElementById('authTabSignup')?.addEventListener('click', () => switchAuthTab('signup'));
  document.getElementById('authLinkForgot')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchAuthTab('forgot');
  });
  document.getElementById('authLinkBackLogin')?.addEventListener('click', (e) => {
    e.preventDefault();
    switchAuthTab('login');
  });
  document.getElementById('authModalCloseBtn')?.addEventListener('click', closeAuthModal);

  // Forms
  document.getElementById('authFormLogin')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnLoginSubmit');
    const errBox = document.getElementById('authLoginErr');
    const email = document.getElementById('loginEmail')?.value;
    const pass = document.getElementById('loginPassword')?.value;

    if (btn) btn.disabled = true;
    if (errBox) errBox.style.display = 'none';

    const res = await signInUser(email, pass);
    if (btn) btn.disabled = false;

    if (res.success) {
      closeAuthModal();
      showAuthToast('✓ Logged in successfully');
    } else if (errBox) {
      errBox.textContent = res.error;
      errBox.style.display = 'block';
    }
  });

  document.getElementById('authFormSignup')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSignupSubmit');
    const errBox = document.getElementById('authSignupErr');
    const name = document.getElementById('signupName')?.value;
    const email = document.getElementById('signupEmail')?.value;
    const pass = document.getElementById('signupPassword')?.value;
    const phone = document.getElementById('signupPhone')?.value;

    if (btn) btn.disabled = true;
    if (errBox) errBox.style.display = 'none';

    const res = await signUpUser(email, pass, name, phone);
    if (btn) btn.disabled = false;

    if (res.success) {
      closeAuthModal();
      showAuthToast(res.message);
    } else if (errBox) {
      errBox.textContent = res.error;
      errBox.style.display = 'block';
    }
  });

  document.getElementById('authFormForgot')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnForgotSubmit');
    const errBox = document.getElementById('authForgotErr');
    const email = document.getElementById('forgotEmail')?.value;

    if (btn) btn.disabled = true;
    if (errBox) errBox.style.display = 'none';

    const res = await resetPassword(email);
    if (btn) btn.disabled = false;

    if (res.success) {
      switchAuthTab('login');
      showAuthToast(res.message);
    } else if (errBox) {
      errBox.textContent = res.error;
      errBox.style.display = 'block';
    }
  });

  document.getElementById('accountDrawerCloseBtn')?.addEventListener('click', () => {
    document.getElementById('accountDrawerBackdrop')?.classList.remove('active');
  });
}

function showAuthToast(msg) {
  let toast = document.getElementById('arcadefxGlobalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'arcadefxGlobalToast';
    toast.className = 'arcadefx-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 4000);
}
