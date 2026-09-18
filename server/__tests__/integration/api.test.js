/**
 * API 集成测试（supertest + 测试库 ai_interview_coach_test）
 * 覆盖：认证 / 健康检查 / 题库 / 打卡 / 偏好 / 学习规划 / 社区 / 通知 / 智学 / 用户
 * 原则：
 *   - 连测试库（jest.setup.js 已切 DB_NAME），不动开发/生产库；
 *   - 不触发真实 AI 调用（跳过 interview/message、ai/ask、ai-summary 等 AI 端点）；
 *   - 登录用唯一手机号自动建号，互不干扰。
 * 运行前先 npm run test:setup 准备测试库。
 */
const { request, app, loginUser, auth, closePool } = require('../helpers');

afterAll(async () => {
  await closePool();
});

describe('健康检查与兜底', () => {
  test('GET /api/v1/health → 数据库连通', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.body.code).toBe(0);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.db).toBe(true);
  });

  test('未知路由 → 404 + code 1002', async () => {
    const res = await request(app).get('/api/v1/no-such-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.code).toBe(1002);
  });
});

describe('认证', () => {
  test('手机号格式错误 → 1001', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ phone: '123', code: '123456' });
    expect(res.body.code).toBe(1001);
  });

  test('验证码错误 → 1001', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ phone: '13800001111', code: '000000' });
    expect(res.body.code).toBe(1001);
  });

  test('未注册手机号自动建号并返回 token', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ phone: '13800002222', code: '123456' });
    expect(res.body.code).toBe(0);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.phone).toContain('****'); // 手机号脱敏
  });

  test('未登录访问受保护接口 → 2001', async () => {
    const res = await request(app).get('/api/v1/user/profile');
    expect(res.body.code).toBe(2001);
  });

  test('登录后可访问会话接口 isLoggedIn=true', async () => {
    const { token } = await loginUser();
    const res = await request(app).get('/api/v1/auth/session').set(auth(token));
    expect(res.body.code).toBe(0);
    expect(res.body.data.isLoggedIn).toBe(true);
  });
});

describe('题库', () => {
  let questionId;

  test('GET /questions 列表分页', async () => {
    const res = await request(app).get('/api/v1/questions');
    expect(res.body.code).toBe(0);
    expect(Array.isArray(res.body.data.list)).toBe(true);
    expect(res.body.data.total).toBeGreaterThan(0);
    questionId = res.body.data.list[0].id;
  });

  test('GET /questions?sourceType=real 真题入口', async () => {
    const res = await request(app).get('/api/v1/questions').query({ sourceType: 'real' });
    expect(res.body.code).toBe(0);
    expect(Array.isArray(res.body.data.list)).toBe(true);
  });

  test('GET /questions/categories 九题型', async () => {
    const res = await request(app).get('/api/v1/questions/categories');
    expect(res.body.code).toBe(0);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /questions/:id 详情与搜索', async () => {
    const detail = await request(app).get(`/api/v1/questions/${questionId}`);
    expect(detail.body.code).toBe(0);
    expect(detail.body.data.id).toBe(questionId);

    const search = await request(app).get('/api/v1/questions/search').query({ keyword: '面试' });
    expect(search.body.code).toBe(0);
  });

  test('答题提交 + 收藏切换（需登录）', async () => {
    const { token } = await loginUser();
    const submit = await request(app)
      .post(`/api/v1/questions/${questionId}/submit`)
      .set(auth(token))
      .send({ userAnswer: '集成测试答案', isCorrect: false, answerTime: 30 });
    expect(submit.body.code).toBe(0);

    const fav = await request(app).post(`/api/v1/questions/${questionId}/favorite`).set(auth(token));
    expect(fav.body.code).toBe(0);
  });
});

describe('打卡（每日防重）', () => {
  let token;

  beforeAll(async () => {
    token = (await loginUser()).token;
  });

  test('今日打卡成功', async () => {
    const res = await request(app).post('/api/v1/checkins').set(auth(token));
    expect(res.body.code).toBe(0);
  });

  test('同一天重复打卡 → 3001 防重', async () => {
    const res = await request(app).post('/api/v1/checkins').set(auth(token));
    expect(res.body.code).toBe(3001);
  });

  test('今日状态 / 月历 / 统计', async () => {
    const today = await request(app).get('/api/v1/checkins/today').set(auth(token));
    expect(today.body.code).toBe(0);
    expect(typeof today.body.data.streak).toBe('number');

    const cal = await request(app).get('/api/v1/checkins/calendar').query({ month: '2026-08' }).set(auth(token));
    expect(cal.body.code).toBe(0);

    const stats = await request(app).get('/api/v1/checkins/stats').set(auth(token));
    expect(stats.body.code).toBe(0);
  });

  test('月历参数格式错误 → 1001', async () => {
    const res = await request(app).get('/api/v1/checkins/calendar').query({ month: '202608' }).set(auth(token));
    expect(res.body.code).toBe(1001);
  });
});

describe('岗位偏好', () => {
  test('GET 默认偏好 + PUT 更新 + GET 回读', async () => {
    const { token } = await loginUser();
    const before = await request(app).get('/api/v1/preferences').set(auth(token));
    expect(before.body.code).toBe(0);
    expect(before.body.data.position).toBeTruthy();

    const upd = await request(app)
      .put('/api/v1/preferences')
      .set(auth(token))
      .send({ position: '公务员', region: '广东' });
    expect(upd.body.code).toBe(0);

    const after = await request(app).get('/api/v1/preferences').set(auth(token));
    expect(after.body.data.region).toBe('广东');
  });
});

describe('学习规划', () => {
  test('GET /study-plans/current 三级回退返回规划+节点', async () => {
    const res = await request(app).get('/api/v1/study-plans/current');
    expect(res.body.code).toBe(0);
    expect(res.body.data).toBeTruthy();
    expect(Array.isArray(res.body.data.nodes)).toBe(true);
  });

  test('GET /home/overview 首页聚合', async () => {
    const res = await request(app).get('/api/v1/home/overview');
    expect(res.body.code).toBe(0);
  });

  test('GET /recommendations/today 今日推荐', async () => {
    const res = await request(app).get('/api/v1/recommendations/today');
    expect(res.body.code).toBe(0);
  });
});

describe('社区', () => {
  let token;
  let postId;

  beforeAll(async () => {
    token = (await loginUser()).token;
  });

  test('发帖 → 返回 postId', async () => {
    const res = await request(app)
      .post('/api/v1/community/posts')
      .set(auth(token))
      .send({ title: '自动化测试帖', content: '由集成测试创建', tags: ['测试'] });
    expect(res.body.code).toBe(0);
    expect(res.body.data.postId).toBeTruthy();
    postId = res.body.data.postId;
  });

  test('列表与详情', async () => {
    const list = await request(app).get('/api/v1/community/posts');
    expect(list.body.code).toBe(0);
    expect(Array.isArray(list.body.data.list)).toBe(true);

    const detail = await request(app).get(`/api/v1/community/posts/${postId}`);
    expect(detail.body.code).toBe(0);
    expect(detail.body.data.title).toBe('自动化测试帖');
  });

  test('点赞切换', async () => {
    const like = await request(app).post(`/api/v1/community/posts/${postId}/like`).set(auth(token));
    expect(like.body.code).toBe(0);
    expect(like.body.data.liked).toBe(true);
  });
});

describe('通知', () => {
  test('列表 + 未读数', async () => {
    const { token } = await loginUser();
    const list = await request(app).get('/api/v1/notifications').set(auth(token));
    expect(list.body.code).toBe(0);

    const count = await request(app).get('/api/v1/notifications/unread-count').set(auth(token));
    expect(count.body.code).toBe(0);
    expect(typeof count.body.data.total).toBe('number');
  });
});

describe('智学（阅读/素材/笔记 CRUD）', () => {
  let token;

  beforeAll(async () => {
    token = (await loginUser()).token;
  });

  test('阅读与素材列表', async () => {
    const readings = await request(app).get('/api/v1/learn/readings');
    expect(readings.body.code).toBe(0);

    const materials = await request(app).get('/api/v1/learn/materials');
    expect(materials.body.code).toBe(0);
  });

  test('笔记 创建→列表→更新→删除', async () => {
    const created = await request(app)
      .post('/api/v1/learn/notes')
      .set(auth(token))
      .send({ title: '测试笔记', content: '内容', sourceType: 'note' });
    expect(created.body.code).toBe(0);
    const noteId = created.body.data.noteId;

    const list = await request(app).get('/api/v1/learn/notes').set(auth(token));
    expect(list.body.code).toBe(0);

    const updated = await request(app)
      .put(`/api/v1/learn/notes/${noteId}`)
      .set(auth(token))
      .send({ title: '测试笔记改', content: '新内容' });
    expect(updated.body.code).toBe(0);

    const deleted = await request(app).delete(`/api/v1/learn/notes/${noteId}`).set(auth(token));
    expect(deleted.body.code).toBe(0);
  });
});

describe('用户', () => {
  let token;

  beforeAll(async () => {
    token = (await loginUser()).token;
  });

  test('个人资料 / 成长 / 勋章 / 评估接口', async () => {
    const profile = await request(app).get('/api/v1/user/profile').set(auth(token));
    expect(profile.body.code).toBe(0);
    expect(profile.body.data.id).toBeTruthy();

    const badges = await request(app).get('/api/v1/user/badges').set(auth(token));
    expect(badges.body.code).toBe(0);

    const growth = await request(app).get('/api/v1/user/growth-records').set(auth(token));
    expect(growth.body.code).toBe(0);

    const trend = await request(app).get('/api/v1/user/progress-trend').set(auth(token));
    expect(trend.body.code).toBe(0);

    const report = await request(app).get('/api/v1/user/learning-report').set(auth(token));
    expect(report.body.code).toBe(0);

    const ability = await request(app).get('/api/v1/user/ability-assessment').set(auth(token));
    expect(ability.body.code).toBe(0);
  });
});
