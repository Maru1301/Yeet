import _ from 'lodash';
import { useAppStore } from '../store/index';

//todo: rewrite logic, currently just a placeholder for SSO auth and auth check

async function initStore() {
  const store = useAppStore();

  // Get User EAS Auth
  // await store.getUserAuth();

  // Delete url params
  const query = Object.fromEntries(new URLSearchParams(location.search));
  if (query.accountToken && query.adAccount && query.easToken) {
    const data = _.omit(query, ['accountToken', 'adAccount', 'easToken']);
    const queryString = Object.keys(data).map((key) => `${key}=${data[key]}`).join('&');
    let url = window.location.href.split('?')[0];
    if (queryString) url += `?${queryString}`;
    window.location.href = url;
  }
}

// async function authSSO() {
//   // Get SSO authentication
//   const authSSOinfo = await window.$kingSSO.auth();

//   if (authSSOinfo && authSSOinfo.adAccount) {
//     const store = useAppStore();
//     // Set AD to store
//     store.updateNtAccount(authSSOinfo.adAccount);
//     await initStore();
//   }
// }

// const initAuth = _.once(async () => {
//   const store = useAppStore();

//   // Check if has account AD cookie
//   const cookieAccount = await window.$kingSSO.getCookieAD();

//   if (cookieAccount) {
//     // If has AD cookie, update user AD to store
//     store.updateNtAccount(cookieAccount);
//     await initStore();
//   } else {
//     await authSSO();
//   }
// });

// function hasAuth(to: { name: string; params: Record<string, string>; }) {
//   const name = to.name;
//   const department = to.params && to.params.department;
// }

// export { initAuth, hasAuth };
