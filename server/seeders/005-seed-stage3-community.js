/**
 * 005 种子：阶段3 社区数据
 *  - 帖子 3 条（作者=演示用户 13800138000，按 phone 查 id；COUNT==0 才插）
 * 幂等：posts 表空才插，重复执行无副作用。
 */
const { pool } = require('../models');

const POSTS = [
  {
    title: '四川公务员结构化面试刚上岸，分享我的 21 天备考时间线',
    content: '第一周打基础：学各题型框架+晨读积累热点；第二周专项突破：每天三类题逐题开口练并录音复盘；第三周全真模拟：每天 1-2 场模拟面试并请人点评。重点是把“想得好”变成“说得好”，积累金句和答题模板要内化而不是死记。',
    position: '公务员', region: '四川', interviewType: 1, result: 1, tags: ['上岸分享'],
  },
  {
    title: '应急应变题总是答不出细节，求各位大佬指点',
    content: '练了半个月，组织管理和综合分析还能应付，但应急应变题一开口就干巴巴的，只会说“先安抚情绪”。怎么积累具体的处置细节？有没有好的框架或例子推荐？',
    position: '公务员', region: '四川', interviewType: 1, result: 0, tags: ['求助'],
  },
  {
    title: '事业单位面试：专业题占比高，应该如何准备？',
    content: '报考的是事业单位专业技术岗，公告说面试会涉及专业题。除了结构化公共题，专业题要怎么突击？有没有过来人讲讲备考重点？',
    position: '事业单位', region: '全国', interviewType: 1, result: 0, tags: ['求助'],
  },
];

async function seed() {
  const [cnt] = await pool.query('SELECT COUNT(*) AS c FROM posts');
  if (cnt[0].c > 0) {
    console.log('[seed] posts 已有数据，跳过');
    return;
  }
  const [users] = await pool.query("SELECT id, nickname, avatar FROM users WHERE phone = '13800138000' LIMIT 1");
  const author = users[0] || { id: 1, nickname: '演示用户', avatar: null };
  for (const p of POSTS) {
    await pool.query(
      'INSERT INTO posts (author_id, author_name, author_avatar, title, content, position, region, interview_type, result, tags, status) VALUES (?,?,?,?,?,?,?,?,?,?,1)',
      [author.id, author.nickname, author.avatar, p.title, p.content, p.position, p.region, p.interviewType, p.result, JSON.stringify(p.tags)],
    );
  }
  console.log(`[seed] 已插入 ${POSTS.length} 条帖子（作者=${author.nickname}）`);
}

module.exports = { seed };
