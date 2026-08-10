/**
 * 002 种子：阶段2 成长/学习体系数据
 *  - 学习规划 3 套（公务员·四川 7 日冲刺 / 公务员通用 / 通用回退），按 name 查缺插
 *  - 勋章定义 6 枚（按 code 查缺插，可增量）
 *  - hot_topics 热点样例（表空则插）
 *  - 把已有题目标记为「今日推荐」（source_type='hot'，按内容子串匹配，可重复跑）
 * 幂等：每段均先查询存在性，缺则补，重复执行无副作用。
 */
const { pool } = require('../models');

// 学习规划：节点 = [title, node_type, target_type, target_id, est_minutes]
const PLANS = [
  {
    name: '公务员·四川 7日冲刺', position: '公务员', region: '四川',
    description: '针对四川公务员结构化面试的 7 天冲刺规划',
    nodes: [
      ['每日打卡', 'checkin', null, null, 5],
      ['晨读：今日热点精读', 'reading', null, null, 20],
      ['专项练习：社会现象 3 题', 'question', null, null, 30],
      ['结构化面试模拟', 'interview', null, null, 15],
      ['当日复盘与错题整理', 'review', null, null, 10],
    ],
  },
  {
    name: '公务员通用基础计划', position: '公务员', region: null,
    description: '公务员各题型基础训练（全国通用）',
    nodes: [
      ['每日打卡', 'checkin', null, null, 5],
      ['通识：结构化面试入门', 'course', null, null, 20],
      ['专项练习：态度观点 3 题', 'question', null, null, 30],
      ['全真模拟面试', 'interview', null, null, 20],
      ['错题复盘', 'review', null, null, 10],
    ],
  },
  {
    name: '通用学习计划', position: null, region: null,
    description: '默认回退规划（未匹配到岗位/地区专属规划时使用）',
    isDefault: 1,
    nodes: [
      ['每日打卡', 'checkin', null, null, 5],
      ['基础通识学习', 'course', null, null, 20],
      ['随堂练习题', 'question', null, null, 20],
      ['AI 模拟面试', 'interview', null, null, 15],
      ['复习回顾', 'review', null, null, 10],
    ],
  },
];

// 勋章：[code, name, icon, description, condition_type, condition_value, sort]
const BADGES = [
  ['first_checkin', '首次打卡', '🌱', '迈出第一步', 'checkin_days', 1, 1],
  ['checkin_7', '连续打卡7天', '🔥', '坚持不懈', 'checkin_days', 7, 2],
  ['first_interview', '首次面试', '🎯', '初出茅庐', 'interview_count', 1, 3],
  ['plan_first', '完成首份规划', '🗺️', '学有规划', 'plan_count', 1, 4],
  ['growth_100', '成长值100', '⭐', '小有积累', 'growth_points', 100, 5],
  ['growth_500', '成长值500', '🌟', '厚积薄发', 'growth_points', 500, 6],
];

// 热点样例（表空才插）
const HOT_TOPICS = [
  {
    title: '2026 政府工作报告：稳就业政策解读',
    summary: '深入解读就业优先政策、职业培训与创业扶持等与求职者密切相关的内容。',
    content: '2026 年政府工作报告提出把稳就业摆在突出位置，聚焦高校毕业生、农民工等重点群体，完善职业技能培训体系，扩大就业见习规模。求职者可重点关注基层岗位招录、灵活就业保障与公共就业服务等红利。',
    position: '公务员', region: '四川', views: 1200, publish_date: '2026-08-06',
  },
  {
    title: '数字政务与适老化改造观察',
    summary: '政务服务加速数字化，适老化改造成考核新考点。',
    content: '多地持续推进“一网通办”，同时要求保留线下窗口并做适老化改造。此类话题在结构化面试中常以社会现象题出现，答题需兼顾效率与公平。',
    position: '公务员', region: '四川', views: 980, publish_date: '2026-08-05',
  },
  {
    title: '事业单位改革新动向',
    summary: '分类改革、岗位管理优化，备考需关注政策方向。',
    content: '事业单位改革强调公益属性与绩效考核相结合，逐步推行岗位设置动态管理。对面试而言，理解改革逻辑有助于回答组织管理与岗位认知类题目。',
    position: '事业单位', region: '全国', views: 760, publish_date: '2026-08-04',
  },
  {
    title: '教资面试结构化备考技巧',
    summary: '掌握“职业认知—问题处理—活动组织”三类高频题型。',
    content: '教资面试结构化环节常考应急应变与人际沟通，答题注意先控场、再解决、后反思的层次，语言简洁有温度。',
    position: '教资面试', region: '全国', views: 620, publish_date: '2026-08-03',
  },
];

async function seedStudyPlans(conn) {
  for (const plan of PLANS) {
    const [exist] = await conn.query('SELECT id FROM study_plans WHERE name = ? LIMIT 1', [plan.name]);
    if (exist.length) continue;
    const [result] = await conn.query(
      'INSERT INTO study_plans (name, position, region, description, is_default) VALUES (?,?,?,?,?)',
      [plan.name, plan.position, plan.region, plan.description, plan.isDefault || 0],
    );
    const planId = result.insertId;
    for (let i = 0; i < plan.nodes.length; i++) {
      const [title, nodeType, targetType, targetId, estMinutes] = plan.nodes[i];
      await conn.query(
        'INSERT INTO study_plan_nodes (plan_id, title, node_type, target_type, target_id, est_minutes, sort_order) VALUES (?,?,?,?,?,?,?)',
        [planId, title, nodeType, targetType, targetId, estMinutes, i],
      );
    }
    console.log(`[seed] 已创建学习规划「${plan.name}」(${plan.nodes.length} 节点)`);
  }
}

async function seedBadges(conn) {
  for (const [code, name, icon, description, conditionType, conditionValue, sort] of BADGES) {
    const [exist] = await conn.query('SELECT id FROM badges WHERE code = ? LIMIT 1', [code]);
    if (exist.length) continue;
    await conn.query(
      'INSERT INTO badges (code, name, icon, description, condition_type, condition_value, sort) VALUES (?,?,?,?,?,?,?)',
      [code, name, icon, description, conditionType, conditionValue, sort],
    );
    console.log(`[seed] 已创建勋章「${name}」(${code})`);
  }
}

async function seedHotTopics(conn) {
  const [cnt] = await conn.query('SELECT COUNT(*) AS c FROM hot_topics');
  if (cnt[0].c > 0) return;
  for (const t of HOT_TOPICS) {
    await conn.query(
      'INSERT INTO hot_topics (title, summary, content, position, region, views, publish_date) VALUES (?,?,?,?,?,?,?)',
      [t.title, t.summary, t.content, t.position, t.region, t.views, t.publish_date],
    );
  }
  console.log(`[seed] 已插入 ${HOT_TOPICS.length} 条热点内容`);
}

/** 把 3 道社会现象题标记为今日推荐（source_type='hot'） */
async function markHotQuestions() {
  const [cnt] = await pool.query("SELECT COUNT(*) AS c FROM questions WHERE source_type = 'hot'");
  if (cnt[0].c > 0) return;
  const [result] = await pool.query(
    "UPDATE questions SET source_type = 'hot' WHERE source_type = 'normal' AND (content LIKE ? OR content LIKE ? OR content LIKE ?)",
    ['%数字政务%', '%探店%', '%天空之镜%'],
  );
  console.log(`[seed] 已将 ${result.affectedRows} 道题标记为今日推荐（hot）`);
}

async function seed() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await seedStudyPlans(conn);
    await seedBadges(conn);
    await seedHotTopics(conn);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  await markHotQuestions();
  console.log('[seed] 002 执行完成');
}

module.exports = { seed };
