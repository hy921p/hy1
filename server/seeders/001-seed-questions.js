/**
 * 001 种子：面试题库 + 公务员场景 + 场景出题 prompt
 * 幂等：questions 表已有数据则跳过；公务员场景不存在则插入；
 *       场景 system_prompt 为 NULL 的一律补齐（可重复执行）。
 * 题型码：1社会现象 2态度观点 3组织管理 4应急应变 5人际关系 6情景模拟 7自我认知 8专业题 9开放论述
 */
const { pool } = require('../models');

const GONGWUYUAN = '公务员';
const SICHUAN = '四川';

// 公务员/四川 结构化六题型 × 3
const gwyQuestions = [
  ['社会现象', 1, '当前各地大力推行“数字政务”，让数据多跑路、群众少跑腿。但有些老年人反映不会用智能手机办事。对此你怎么看？', '既要肯定数字政务的便民高效，也要正视数字鸿沟问题，提出保留人工窗口、亲属代办、适老化改造、社区帮办等具体措施。'],
  ['社会现象', 1, '短视频平台“探店”类内容火爆，有的博主夸大宣传、甚至虚假推荐。谈谈你对这种现象的看法。', '从传播规律、平台治理、消费者权益三方面分析，提出加强审核、完善处罚、引导行业自律、提高消费者辨别力等建议。'],
  ['社会现象', 1, '一些地方为吸引游客在景区设置“天空之镜”等网红打卡点，但实物与宣传差别很大，引发游客吐槽。你怎么看？', '指出“重营销轻服务”的问题，分析短期流量与长期口碑的辩证关系，建议加强规划、诚信经营、完善配套设施。'],
  ['态度观点', 2, '有人说“功成不必在我”，也有人说“功成必定有我”。请谈谈你的理解。', '先分别解读两句话的内涵与侧重点，再指出二者辩证统一：既要有淡泊名利、甘于奉献的境界，又要有敢于担当、真抓实干的作为。'],
  ['态度观点', 2, '习近平总书记强调“青年要扣好人生第一粒扣子”。请谈谈你对这句话的理解。', '结合青年时期价值观养成的重要性展开，联系自身岗位谈树立正确三观、防微杜渐、守住底线。'],
  ['态度观点', 2, '“利民之事，丝发必兴；厉民之事，毫末必去。”谈谈你对这句话的认识。', '解读古语为民服务的主旨，结合政务服务实例说明群众利益无小事，谈如何落实以人民为中心。'],
  ['组织管理', 3, '单位准备组织一次“安全生产宣传进社区”活动，领导交给你负责，你会如何组织？', '按“前期准备—宣传动员—组织实施—总结反馈”四步展开，突出人员物资、现场布置、应急准备、效果评估等细节。'],
  ['组织管理', 3, '你所在单位要开展一次青年干部读书分享会，领导让你策划，请谈谈你的方案思路。', '明确活动主题与目标人群，设计推荐书目、分组研讨、代表分享、领导点评等环节，并说明时间场地预算安排。'],
  ['组织管理', 3, '上级部门要来你单位开展调研，领导让你负责接待与行程安排，你怎么做？', '先了解调研目的与需求，制定行程方案并报领导审定，做好材料准备、陪同对接、后勤保障与后期总结落实。'],
  ['应急应变', 4, '你在窗口办理业务时，一位群众因材料不全无法办理而情绪激动、大声喧哗。你怎么办？', '先安抚情绪、引导至安静区域，耐心解释政策并列出补办材料清单，提供一次性告知与预约通道，事后反思优化提示。'],
  ['应急应变', 4, '会议开始前 10 分钟，你发现主讲嘉宾的 PPT 无法打开。你怎么办？', '保持镇定，优先尝试备份文件与备用设备，同时与主持人和嘉宾沟通调整开场环节，确保会议如期举行。'],
  ['应急应变', 4, '你在基层调研时，村民向你反映村里的饮水问题长期未解决，情绪激动。你会怎么处理？', '先倾听记录、安抚情绪，现场核实情况并明确责任单位，能解决的限期解决，不能立即解决的说明原因与时限并跟踪反馈。'],
  ['人际关系', 5, '你刚进入单位，同事觉得你锋芒毕露，与你有疏离感。你会如何处理与同事的关系？', '主动自省沟通，注意谦逊低调、多请教多补位，用工作成绩赢得认可，营造和谐共事氛围。'],
  ['人际关系', 5, '领导安排你和一个经验丰富的老同事共同完成一项任务，但老同事积极性不高。你怎么办？', '理解老同事顾虑，主动承担更多事务性工作，多请示多学习，肯定其经验价值，寻找机会沟通达成共识。'],
  ['人际关系', 5, '你和小李竞争同一个晋升名额，后来你晋升成功，小李对你有意见，工作中不太配合。你怎么处理？', '摆正心态不回避，主动化解，尊重对方，在工作上坚持原则又体现协作，用成绩和态度赢得理解。'],
  ['自我认知', 7, '请做一个简短的自我介绍，并说说你报考这个岗位的优势与不足。', '结构化表达：基本经历 + 与该岗位匹配的能力/经历 + 坦诚不足 + 改进方向，条理清晰、真诚朴实。'],
  ['自我认知', 7, '入职后你发现实际工作与想象有差距，你会如何调整心态并适应岗位？', '正视落差、调整预期，从小事做起快速熟悉业务，主动请教老同志，制定学习计划，在实干中建立成就感。'],
  ['自我认知', 7, '如果这次面试通过，谈谈你入职后第一年的工作计划。', '分阶段谈：适应期熟悉业务与制度、成长期主动承担任务与学习、成熟期为团队做贡献并规划长远发展。'],
];

// 技术岗少量题目（region=全国）
const techQuestions = [
  ['前端开发工程师', '全国', 8, '谈谈你对前端工程化的理解，以及你会如何优化一个大型单页应用的加载性能？', '从模块化、组件化、自动化构建与质量保障讲工程化；性能优化从首屏指标、代码分割、缓存、SSR 等维度展开。'],
  ['前端开发工程师', '全国', 4, '你负责的项目即将上线，但临时发现一个影响首屏渲染的性能问题，你会如何排查与解决？', '先评估影响面与上线窗口，用性能工具定位瓶颈，采取分步降级方案保证可上线，再制定根治优化计划并复盘。'],
  ['Java开发工程师', '全国', 8, '请谈谈你对 JVM 内存模型与常见调优手段的理解。', '讲清楚堆、栈、方法区与 GC 流程，结合场景谈堆大小、GC 选择、调优工具（jstat/jmap）与排查思路。'],
  ['Java开发工程师', '全国', 4, '线上系统出现内存溢出（OOM），作为开发你会如何定位与处理？', '先止血（扩容/重启/限流），再通过日志、堆转储与监控定位泄漏点，分析根因后修复并建立监控预警。'],
  ['产品经理', '全国', 9, '如果让你设计一款面向求职者的 AI 面试模拟产品，你会如何做用户调研与需求分析？', '明确目标用户与核心痛点，通过访谈/问卷验证需求，梳理用户故事与优先级，输出 MVP 范围与衡量指标。'],
  ['产品经理', '全国', 3, '你的产品方案被研发评估为成本过高，但你认为价值很大，你会如何推进？', '重估价值与成本，寻找分期实施方案，用数据与试点验证价值，争取决策层支持，必要时调整范围换取落地。'],
];

function buildQuestion({ content, ref, category, position, region, type }, createdBy) {
  return [
    content, null, category, '公共部门', position, region, type, 1, ref,
    JSON.stringify(['面试题']), 0, null, 1, createdBy, null, null,
  ];
}

async function seedQuestions() {
  const [cnt] = await pool.query('SELECT COUNT(*) AS c FROM questions');
  if (cnt[0].c > 0) {
    console.log('[seed] questions 已有数据，跳过题目种子');
    return;
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const rows = [];
    for (const [category, type, content, ref] of gwyQuestions) {
      rows.push(buildQuestion({ content, ref, category, position: GONGWUYUAN, region: SICHUAN, type }, 1));
    }
    for (const [position, region, type, content, ref] of techQuestions) {
      rows.push(buildQuestion({ content, ref, category: '专业题', position, region, type }, 1));
    }
    const sql =
      'INSERT INTO questions (content, detail, category, industry, position, region, type, difficulty, ' +
      'reference_answer, tags, usage_count, avg_score, status, created_by, deleted_at, operated_by) ' +
      'VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)';
    for (const row of rows) {
      await conn.query(sql, row);
    }
    await conn.commit();
    console.log(`[seed] 已插入 ${rows.length} 道题目`);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function seedGongwuyuanScenario() {
  const [exists] = await pool.query(
    "SELECT id FROM interview_scenarios WHERE position = ? AND deleted_at IS NULL LIMIT 1",
    [GONGWUYUAN]
  );
  if (exists.length) return;
  await pool.query(
    'INSERT INTO interview_scenarios ' +
    '(name, industry, position, interview_type, difficulty, description, system_prompt, ' +
    'duration_minutes, question_count, icon, is_template, created_by, usage_count, sort_order, status) ' +
    'VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
    [
      '公务员-结构化面试-通用', '公共部门', GONGWUYUAN, 0, 0,
      '公务员结构化面试通用场景：综合分析、组织管理、应急应变等核心能力考察。',
      '你是一位专业、亲切的公务员结构化面试考官，拥有多年机关单位招录经验，擅长综合分析、组织管理、应急应变、人际沟通等能力的考察，提问由浅入深并适当追问，点评客观、具体、有建设性。',
      15, 3, '🏛️', 1, 1, 0, 1, 1,
    ]
  );
  console.log('[seed] 已创建公务员结构化面试场景');
}

async function fillSystemPrompts() {
  const [scenarios] = await pool.query(
    'SELECT id, name, position FROM interview_scenarios WHERE system_prompt IS NULL OR system_prompt = ""'
  );
  if (!scenarios.length) return;
  for (const s of scenarios) {
    const prompt =
      `你是一位专业、亲切的「${s.position}」岗位模拟面试官，拥有多年该岗位的招聘面试经验，` +
      '擅长结构化提问、追问与点评。\n' +
      `面试目标：评估求职者与「${s.position}」岗位的匹配度，考察其综合分析、逻辑表达、岗位认知、应变与协作能力。\n` +
      '面试风格：语气自然温暖，每题作答后给出简短、具体、有建设性的点评，再进入下一题；全程使用中文。';
    await pool.query('UPDATE interview_scenarios SET system_prompt = ? WHERE id = ?', [prompt, s.id]);
  }
  console.log(`[seed] 已补齐 ${scenarios.length} 个场景的 system_prompt`);
}

async function seed() {
  await seedQuestions();
  await seedGongwuyuanScenario();
  await fillSystemPrompts();
  console.log('[seed] 001 执行完成');
}

module.exports = { seed };
