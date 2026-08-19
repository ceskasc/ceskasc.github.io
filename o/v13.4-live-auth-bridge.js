(() => {
'use strict';

const AUTH_STORE = 'o.auth.session.v1';
const ACCOUNT_API = `${config.supabaseUrl || ''}/functions/v1/o-account`;
const baseLoadProfile = loadProfile;
let resolving = null;

function storedSession(){
  try { return JSON.parse(localStorage.getItem(AUTH_STORE) || 'null'); }
  catch { return null; }
}

async function accountStatus(){
  const r = await fetch(ACCOUNT_API, {
    method:'POST',
    headers:{ apikey:API_KEY, 'Content-Type':'application/json' },
    body:JSON.stringify({ action:'status', installationId, installationSecret })
  });
  const text = await r.text();
  let data = null;
  if(text){ try { data = JSON.parse(text); } catch {} }
  if(!r.ok) throw new Error(data?.error || `Account status failed (${r.status})`);
  return data;
}

async function resolveAccountProfile(){
  await baseLoadProfile();
  if(profile?.username) return profile;

  const session = storedSession();
  if(!session?.access_token || !session?.user?.id) return null;

  const status = await accountStatus();
  if(!status?.exists || status?.needsPassword || !status?.username) return null;

  const accountId = status.installationId || status.installation_id || null;
  if(accountId && session.user.id !== accountId) return null;

  if(accountId && accountId !== installationId){
    installationId = accountId;
    localStorage.setItem('o.installationId', accountId);
    await baseLoadProfile();
  }

  if(!profile?.username){
    profile = {
      installation_id: accountId || installationId,
      username: status.username,
      country_code: status.countryCode || status.country_code || null
    };
    try { renderProfileIdentity(); } catch {}
  }

  return profile;
}

loadProfile = async function(){
  if(resolving) return resolving;
  resolving = resolveAccountProfile()
    .catch(() => null)
    .finally(() => { resolving = null; });
  return resolving;
};
})();
