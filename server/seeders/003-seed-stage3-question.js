/**
 * 003 种子：阶段3 题库模块数据
 *  - 真题 3 道（source_type='real'，year 2025四川/2024广东/2023全国）
 *  - 模拟卷 2 道（source_type='mock'，region 四川）
 *  - 情景模拟 3 道（type=6）+ 开放论述 3 道（type=9）补齐九题型
 *  - answer_10 勋章（condition_type='answer_count', value 10）按 code 查缺插
 * 幂等：按 source_type/category 的 COUNT==0 查缺插，重复执行无副作用。
 */
const { pool } = require('../models');

// 真题：[year, region, type, category, content, ref]
const REAL_QUESTIONS = [
  [
    2025, '四川', 1, '社会现象',
    '近年来四川多地大力发展“夜间经济”，但也随之出现摊位扰民、垃圾乱扔、噪音扰民等问题。对此你怎么看？',
    '既要肯定夜间经济带动消费与就业的积极作用，也要正视其带来的城市管理新课题。从合理规划空间、强化监管执法、引导商户自律、完善公共服务等角度提出对策，并强调“放管结合、张弛有度”。',
  ],
  [
    2024, '广东', 3, '组织管理',
    '单位准备组织一次“优化营商环境”企业座谈会，领导交给你负责，你会如何组织？',
    '按“摸清需求—拟定方案—邀请对接—组织实施—跟踪落实”展开：先调研企业关切确定主题，制定方案报审，精准邀请企业代表与相关部门，会中做好记录与问题清单，会后限时反馈办理结果并回访满意度。',
  ],
  [
    2023, '全国', 4, '应急应变',
    '你正在组织一场大型现场招聘会，开场不久现场人群拥挤，出现踩踏隐患，你怎么办？',
    '第一时间启动应急预案：引导疏散、拉开人流、暂停入口放行并广播安抚，联系安保与医务支援，必要时暂停活动并转移至安全区域，事后排查原因、完善现场管控与应急预案。',
  ],
];

// 模拟卷：[type, category, content, ref]
const MOCK_QUESTIONS = [
  [
    3, '组织管理',
    '（模拟卷）单位要开展一次青年干部“我为群众办实事”岗位练兵活动，请你策划具体方案。',
    '围绕“服务一线、锤炼本领”确定活动形式（跟班服务、轮岗体验、结对帮扶），做好组织动员、过程指导、效果评比与典型宣传，突出参与度与实际成效。',
  ],
  [
    4, '应急应变',
    '（模拟卷）你在窗口值班时，突遇系统故障无法办理业务，群众排队等候且情绪焦躁，你怎么办？',
    '立即安抚现场并说明情况，启动手工登记与预约改期通道，及时报修并跟进修复进度，向等候群众发放序号与后续办理指引，事后总结完善应急预案。',
  ],
];

// 情景模拟（type=6）补齐九题型之一
const SCENARIO_QUESTIONS = [
  [
    6, '情景模拟',
    '你是一名社区工作人员，一位老大爷因补贴发放延迟情绪激动地来到社区，请现场模拟你与他沟通的过程。',
    '以“请坐、倒茶、先听再答”开场，语气温和称呼大爷，先安抚情绪再核查原因，说明进度与预计到账时间，留下联系方式承诺跟进，并提醒大爷留意到账短信。',
  ],
  [
    6, '情景模拟',
    '你和小王共同负责一项任务，小王总以“忙”为由拖延，请你模拟与他沟通协调的场景。',
    '先站在对方角度体谅其工作压力，再说明任务节点的重要性，提出合理分工建议与协作方式，明确各自责任与完成时间，并表示会一起分担、共同推进。',
  ],
  [
    6, '情景模拟',
    '群众对某项新政策不理解，前来咨询时情绪激动，请你模拟现场解释政策的场景。',
    '先道歉致意、稳定情绪，用通俗语言分条解释政策要点，结合案例说明办理流程与权益，主动询问是否还有疑问，留下咨询电话以便后续跟进。',
  ],
];

// 开放论述（type=9）补齐九题型之一
const OPEN_QUESTIONS = [
  [
    9, '开放论述',
    '有人说“平台经济创造了大量灵活就业机会”，也有人说“平台经济冲击了传统就业形态”。请你就此进行综合论述。',
    '既要肯定平台经济在吸纳就业、提升效率方面的积极意义，也要正视其劳动关系、社会保障等新问题。提出完善劳动权益保障、加强行业规范、促进新业态与传统业态协同发展等综合施策建议，体现辩证思维。',
  ],
  [
    9, '开放论述',
    '结合政务数字化转型，谈谈你对“数字政府”建设中机遇与挑战的理解。',
    '从提升服务效率、实现数据共享、精准治理等维度谈机遇；从数据安全、数字鸿沟、基层承接能力等角度谈挑战，提出以人民为中心、统筹发展与安全、补齐适老化短板等对策。',
  ],
  [
    9, '开放论述',
    '谈谈你对“共同富裕”背景下完善第三次分配制度的理解。',
    '解释第三次分配的内涵（慈善捐赠等自愿公益分配），阐述其对初次分配、再分配的补充作用，从税收激励、慈善立法、社会组织培育、监管透明等角度提出完善建议，落点到共建共享。',
  ],
];

function insertQuestions(conn, rows) {
  const sql =
    'INSERT INTO questions (content, detail, category, industry, position, region, source_type, year, type, ' +
    'difficulty, reference_answer, tags, usage_count, avg_score, status, created_by, deleted_at, operated_by) ' +
    'VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
  return rows.reduce(
    (p, row) => p.then(() => conn.query(sql, row)),
    Promise.resolve(),
  );
}

function buildRow({ content, ref, category, position, region, type, sourceType, year }) {
  return [
    content, null, category, '公共部门', position, region, sourceType || 'normal',
    year || null, type, 1, ref, JSON.stringify(['面试题']), 0, null, 1, 1, null, null,
  ];
}

async function seedReal(conn) {
  const [rows] = await conn.query("SELECT COUNT(*) AS c FROM questions WHERE source_type = 'real'");
  if (rows[0].c > 0) {
    console.log('[seed] real 真题已有数据，跳过');
    return;
  }
  const data = [];
  for (const [year, region, type, category, content, ref] of REAL_QUESTIONS) {
    data.push(buildRow({ content, ref, category, position: '公务员', region, type, sourceType: 'real', year }));
  }
  await insertQuestions(conn, data);
  console.log(`[seed] 已插入 ${data.length} 道真题（real）`);
}

async function seedMock(conn) {
  const [rows] = await conn.query("SELECT COUNT(*) AS c FROM questions WHERE source_type = 'mock'");
  if (rows[0].c > 0) {
    console.log('[seed] mock 模拟题已有数据，跳过');
    return;
  }
  const data = [];
  for (const [type, category, content, ref] of MOCK_QUESTIONS) {
    data.push(buildRow({ content, ref, category, position: '公务员', region: '四川', type, sourceType: 'mock' }));
  }
  await insertQuestions(conn, data);
  console.log(`[seed] 已插入 ${data.length} 道模拟题（mock）`);
}

async function seedScenarios(conn) {
  const [rows] = await conn.query("SELECT COUNT(*) AS c FROM questions WHERE category = '情景模拟'");
  if (rows[0].c > 0) {
    console.log('[seed] 情景模拟题已有数据，跳过');
    return;
  }
  const data = [];
  for (const [type, category, content, ref] of SCENARIO_QUESTIONS) {
    data.push(buildRow({ content, ref, category, position: '公务员', region: '四川', type }));
  }
  await insertQuestions(conn, data);
  console.log(`[seed] 已插入 ${data.length} 道情景模拟题（type=6）`);
}

async function seedOpen(conn) {
  const [rows] = await conn.query("SELECT COUNT(*) AS c FROM questions WHERE category = '开放论述'");
  if (rows[0].c > 0) {
    console.log('[seed] 开放论述题已有数据，跳过');
    return;
  }
  const data = [];
  for (const [type, category, content, ref] of OPEN_QUESTIONS) {
    data.push(buildRow({ content, ref, category, position: '公务员', region: '全国', type }));
  }
  await insertQuestions(conn, data);
  console.log(`[seed] 已插入 ${data.length} 道开放论述题（type=9）`);
}

async function seedAnswerBadge(conn) {
  const [exist] = await conn.query("SELECT id FROM badges WHERE code = 'answer_10' LIMIT 1");
  if (exist.length) {
    console.log('[seed] answer_10 勋章已存在，跳过');
    return;
  }
  await conn.query(
    'INSERT INTO badges (code, name, icon, description, condition_type, condition_value, sort) VALUES (?,?,?,?,?,?,?)',
    ['answer_10', '答题十次', '✍️', '累计作答 10 题', 'answer_count', 10, 7],
  );
  console.log('[seed] 已创建勋章「答题十次」（answer_10）');
}

async function seed() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await seedReal(conn);
    await seedMock(conn);
    await seedScenarios(conn);
    await seedOpen(conn);
    await seedAnswerBadge(conn);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  console.log('[seed] 003 执行完成');
}

module.exports = { seed };
