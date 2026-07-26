import { createRouter, createWebHashHistory } from 'vue-router';
import HomePage from '../components/HomePage.vue';
import ManagePage from '../components/ManagePage.vue';
import LeafMeasurePage from '../components/LeafMeasurePage.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/manage',
    name: 'manage',
    component: ManagePage,
  },
  {
    path: '/leaf',
    name: 'leaf',
    component: LeafMeasurePage,
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const pathName = window.location.pathname || '';
  const hashValue = window.location.hash || '';
  if (pathName.includes('/leaflab') && !hashValue && to.path === '/') {
    next('/leaf');
    return;
  }
  next();
});

export default router;
