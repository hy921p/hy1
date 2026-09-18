/**
 * 管理端路由（Hash 模式，文档 §16）
 * 登录页独立；AdminLayout 下挂各管理模块；守卫：无 token → /login。
 */
import { createRouter, createWebHashHistory } from 'vue-router'
import { TOKEN_KEY } from '../api/request'

const AdminLayout = () => import('../layouts/AdminLayout.vue')

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/login', component: () => import('../views/login/index.vue') },
    {
      path: '/',
      component: AdminLayout,
      redirect: '/dashboard',
      children: [
        { path: 'dashboard', component: () => import('../views/dashboard/index.vue'), meta: { title: '数据看板' } },
        { path: 'questions', component: () => import('../views/question/index.vue'), meta: { title: '题库维护' } },
        { path: 'content/readings', component: () => import('../views/content/readings.vue'), meta: { title: '晨读管理' } },
        { path: 'content/materials', component: () => import('../views/content/materials.vue'), meta: { title: '面试素材' } },
        { path: 'content/basics', component: () => import('../views/content/basics.vue'), meta: { title: '通识基础' } },
        { path: 'content/courses', component: () => import('../views/content/courses.vue'), meta: { title: '课程管理' } },
        { path: 'content/hot-topics', component: () => import('../views/content/hot-topics.vue'), meta: { title: '热点管理' } },
        { path: 'study-plans', component: () => import('../views/study-plan/index.vue'), meta: { title: '学习规划' } },
        { path: 'badges', component: () => import('../views/badge/index.vue'), meta: { title: '勋章管理' } },
        { path: 'notifications', component: () => import('../views/notification/index.vue'), meta: { title: '通知推送' } },
        { path: 'agent-tools', component: () => import('../views/agent-tools/index.vue'), meta: { title: 'Agent 工具' } },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
})

router.beforeEach((to) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (!token && to.path !== '/login') return '/login'
  if (token && to.path === '/login') return '/dashboard'
  return true
})

export default router
