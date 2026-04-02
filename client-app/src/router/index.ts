import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('../components/AI.Chat.vue'),
  },
  {
    path: '/chat/:department',
    name: 'chat_department',
    component: () => import('../components/AI.Chat.vue'),
  },
  {
    path: '/record',
    name: 'record',
    component: () => import('../components/AI.RecordViewer.vue'),
  },
  {
    path: '/record/:department',
    name: 'record_department',
    component: () => import('../components/AI.RecordViewer.vue'),
  },
  {
    path: '/browser-not-support',
    name: 'browser_not_support',
    component: () => import('../views/BrowserNotSupport.vue'),
  },
  {
    path: '/no-auth',
    name: 'no_auth',
    component: () => import('../views/Auth.vue'),
  },
  { path: '/:pathMatch(.*)*', component: () => import('../views/Err.vue') },
];

const router = createRouter({
  history: createWebHistory(`${ROOT_FOLDER}/`),
  routes,
});

//todo: rewrite auth logic and add auth check in route guard, currently just a placeholder for SSO auth and auth check
// router.beforeEach(async (to, _from, next) => {
//   await initAuth();
//   // Check EAS Auth
//   if (hasAuth(to as { name: string; params: Record<string, string>; })) {
//     await initAIAuth();
//     next();
//   } else {
//     router.push({ name: 'no_auth' });
//   }
// });

export default router;
