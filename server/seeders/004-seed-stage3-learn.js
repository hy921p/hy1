/**
 * 004 种子：阶段3 智学模块数据
 *  - 晨读 3 篇（公务员/四川 + 公务员/全国 + 通用）
 *  - 素材 6 条（金句/案例/名言 各 2）
 *  - 通识 3 篇
 *  - 课程 2 门
 * 幂等：每张表 COUNT==0 才插，重复执行无副作用。
 */
const { pool } = require('../models');

const READINGS = [
  {
    title: '2026 上半年四川公务员面试热点：基层治理现代化',
    position: '公务员', region: '四川',
    summary: '从"街乡吹哨、部门报到"到网格化治理，基层治理现代化是高频考点。',
    content: '基层治理现代化强调多元主体协同、数字赋能与群众参与。四川多地推行"微网格"治理模式，将服务触角延伸至楼栋单元。面试答题可从党建引领、重心下移、数字化平台、群众参与四个维度展开，体现对治理逻辑的理解。',
    publish_date: '2026-08-07', is_hot: 1,
  },
  {
    title: '结构化面试金句积累：为民服务篇',
    position: '公务员', region: '全国',
    summary: '为民服务类金句盘点，附使用场景。',
    content: '“民生无小事，枝叶总关情”“些小吾曹州县吏，一枝一叶总关情”“利民之事，丝发必兴”。此类金句适用于社会现象、态度观点题，作答时点出为民服务的价值取向，再落到具体措施，避免空喊口号。',
    publish_date: '2026-08-06', is_hot: 0,
  },
  {
    title: '青年干部成长：从"会说话"到"会干事"',
    position: null, region: '全国',
    summary: '青年干部面试高频主题：知行合一。',
    content: '面试中"青年成长"类题目常考察知行合一、脚踏实地、基层磨砺。作答要点：端正心态甘于从基层小事做起，练就过硬本领，善于向群众学习，在实践一线增长才干，保持廉洁自律底线。',
    publish_date: '2026-08-05', is_hot: 0,
  },
];

const MATERIALS = [
  ['功崇惟志，业广惟勤', '公务员', '金句', '出自《尚书》，意为：取得伟大的功业，必须有伟大的志向；完成伟大的功业，在于辛勤不懈地工作。适用于态度观点题谈志向与实干。'],
  ['民之所盼，政之所向', '公务员', '金句', '政务服务应以人民需求为导向，适用于社会现象题谈政府与群众关系、民生工作。'],
  ['浙江"最多跑一次"改革', '公务员', '案例', '以数据共享与流程再造实现群众办事"最多跑一次"，是政务服务改革的经典案例，可用于数字政务、营商环境类题目。'],
  ['北京"接诉即办"基层治理', '公务员', '案例', '以市民热线驱动政府服务向主动治理转变，体现"民有所呼、我有所应"，适用于基层治理、为民服务类题目。'],
  ['知屋漏者在宇下，知政失者在草野', '公务员', '名言', '出自汉代王充《论衡》，意为要知道房屋是否漏雨，住的人最清楚；要了解政治得失，民间百姓最了解。强调深入基层调研、倾听群众意见。'],
  ['治国有常，而利民为本', '公务员', '名言', '出自《淮南子》，治理国家有常法，而以对百姓有利为根本。适用于以人民为中心的发展思想类题目。'],
];

const BASICS = [
  ['结构化面试概论', '公务员', '面试基础', '结构化面试是考官按统一标准、固定流程对考生逐题考查的面试形式，主要测查综合分析、组织协调、应急应变、人际沟通等能力。作答要领：审题准确、结构清晰、语言流畅、有重点有细节。'],
  ['综合分析题答题框架', '公务员', '题型方法', '综合分析题（社会现象/态度观点）通用框架：亮明观点—多角度分析（背景、原因、影响）—提出对策—联系自身升华。社会现象重"现象—原因—对策"，态度观点重"释义—论证—践行"。'],
  ['应急应变题：控场三原则', '公务员', '题型方法', '应急应变题作答记住"先控场、再解决、后反思"三原则：先安抚情绪、控制事态，再分清轻重缓急逐一解决，事后总结复盘、完善机制。'],
];

const COURSES = [
  ['结构化面试导学课', '公务员', null, 'https://example.com/course/1.mp4', 45, '王老师', '系统讲解结构化面试流程、评分标准与各题型作答框架，零基础入门首选。'],
  ['高分作答：人际沟通专项', '公务员', null, 'https://example.com/course/2.mp4', 30, '李老师', '聚焦人际关系类题目，拆解"与领导/同事/群众/亲友"四类情境的高分答法。'],
];

async function seed() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // readings
    const [rc] = await conn.query('SELECT COUNT(*) AS c FROM readings');
    if (rc[0].c > 0) {
      console.log('[seed] readings 已有数据，跳过');
    } else {
      for (const r of READINGS) {
        await conn.query(
          'INSERT INTO readings (title, position, region, summary, content, publish_date, is_hot) VALUES (?,?,?,?,?,?,?)',
          [r.title, r.position, r.region, r.summary, r.content, r.publish_date, r.is_hot],
        );
      }
      console.log(`[seed] 已插入 ${READINGS.length} 篇晨读`);
    }
    // materials
    const [mc] = await conn.query('SELECT COUNT(*) AS c FROM materials');
    if (mc[0].c > 0) {
      console.log('[seed] materials 已有数据，跳过');
    } else {
      for (const [title, position, type, content] of MATERIALS) {
        await conn.query('INSERT INTO materials (title, position, type, content) VALUES (?,?,?,?)', [title, position, type, content]);
      }
      console.log(`[seed] 已插入 ${MATERIALS.length} 条素材`);
    }
    // basics
    const [bc] = await conn.query('SELECT COUNT(*) AS c FROM basics');
    if (bc[0].c > 0) {
      console.log('[seed] basics 已有数据，跳过');
    } else {
      for (const [title, position, category, content] of BASICS) {
        await conn.query('INSERT INTO basics (title, position, category, content) VALUES (?,?,?,?)', [title, position, category, content]);
      }
      console.log(`[seed] 已插入 ${BASICS.length} 篇通识`);
    }
    // courses
    const [cc] = await conn.query('SELECT COUNT(*) AS c FROM courses');
    if (cc[0].c > 0) {
      console.log('[seed] courses 已有数据，跳过');
    } else {
      for (const [title, position, cover, videoUrl, duration, teacher, description] of COURSES) {
        await conn.query(
          'INSERT INTO courses (title, position, cover, video_url, duration, teacher, description) VALUES (?,?,?,?,?,?,?)',
          [title, position, cover, videoUrl, duration, teacher, description],
        );
      }
      console.log(`[seed] 已插入 ${COURSES.length} 门课程`);
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  console.log('[seed] 004 执行完成');
}

module.exports = { seed };
