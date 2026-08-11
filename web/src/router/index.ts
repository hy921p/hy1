/**
 * 路由配置 + 登录守卫
 * 嵌套路由：登录页独立；MainLayout 下挂六大模块；/ 重定向到 /home。
 * 未登录访问任何页面跳 /login；已登录访问 /login 跳 /home。
 */
import { createRouter, createWebHistory } from 'vue-router'
import { TOKEN_KEY } from '../api/http'

const MainLayout = () => import('../components/MainLayout.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('../views/login/index.vue') },
    {
      path: '/',
      component: MainLayout,
      children: [
        { path: '', redirect: '/home' },
        // 首页
        { path: 'home', component: () => import('../views/home/index.vue') },
        // 题库
        { path: 'questions', component: () => import('../views/questions/index.vue') },
        { path: 'questions/detail/:id', component: () => import('../views/questions/detail.vue') },
        { path: 'questions/hot', component: () => import('../views/questions/hot.vue') },
        { path: 'questions/real', component: () => import('../views/questions/real.vue') },
        { path: 'questions/mock', component: () => import('../views/questions/mock.vue') },
        { path: 'questions/wrong', component: () => import('../views/questions/wrong.vue') },
        // 智学
        { path: 'learn', component: () => import('../views/learn/index.vue') },
        { path: 'learn/reading', component: () => import('../views/learn/reading.vue') },
        { path: 'learn/reading/:id', component: () => import('../views/learn/reading-detail.vue') },
        { path: 'learn/material', component: () => import('../views/learn/material.vue') },
        { path: 'learn/basics', component: () => import('../views/learn/basics.vue') },
        { path: 'learn/courses', component: () => import('../views/learn/courses.vue') },
        { path: 'learn/notes', component: () => import('../views/learn/notes.vue') },
        // 智考（阶段 1 demo）
        { path: 'exam', component: () => import('../views/exam/index.vue') },
        { path: 'exam/room/:id', component: () => import('../views/exam/room.vue') },
        { path: 'exam/report/:id', component: () => import('../views/exam/report.vue') },
        // 社区
        { path: 'community', component: () => import('../views/community/index.vue') },
        { path: 'community/post/create', component: () => import('../views/community/create.vue') },
        { path: 'community/post/:id', component: () => import('../views/community/detail.vue') },
        // 我的
        { path: 'profile', component: () => import('../views/profile/index.vue') },
        { path: 'profile/plan', component: () => import('../views/profile/plan.vue') },
        { path: 'profile/report', component: () => import('../views/profile/report.vue') },
        { path: 'profile/assessment', component: () => import('../views/profile/assessment.vue') },
        { path: 'profile/badges', component: () => import('../views/profile/badges.vue') },
        { path: 'profile/growth-tree', component: () => import('../views/profile/growth-tree.vue') },
        { path: 'profile/notifications', component: () => import('../views/profile/notifications.vue') },
        { path: 'profile/settings', component: () => import('../views/profile/settings.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/home' },
  ],
})

router.beforeEach((to) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token && to.path !== '/login') return '/login'
  if (token && to.path === '/login') return '/home'
  return true
})

export default router
