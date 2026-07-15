// Real authentication for the admin panel, backed by Supabase Auth.
var AdminAuth = (function(){
  async function isAuthenticated(){
    var result = await supabaseClient.auth.getSession();
    return !!(result.data && result.data.session);
  }
  async function login(email, password){
    var result = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
    return !result.error;
  }
  async function logout(){
    await supabaseClient.auth.signOut();
  }
  return { isAuthenticated: isAuthenticated, login: login, logout: logout };
})();
