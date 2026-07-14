// Simple client-side auth for the admin panel (development only)
var AdminAuth = (function(){
  var KEY = 'provexa_admin_session_v1';
  // Default creds — change as needed. For production, implement server-side auth.
  var DEFAULT_USER = 'admin';
  var DEFAULT_PASS = 'provexa123';

  function isAuthenticated(){
    try{ return sessionStorage.getItem(KEY) === '1'; }catch(e){return false}
  }
  function login(user, pass){
    if(user === DEFAULT_USER && pass === DEFAULT_PASS){
      sessionStorage.setItem(KEY,'1'); return true;
    }
    return false;
  }
  function logout(){ sessionStorage.removeItem(KEY); }

  return { isAuthenticated:isAuthenticated, login:login, logout:logout };
})();
