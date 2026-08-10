/**
 * 社区服务（阶段3 §7.13 / §5.11）
 * 帖子列表/发布/详情（+浏览）/点赞切换（含 like 通知楼主，非本人）。
 */
const AppError = require('../utils/app-error');
const User = require('../models/user');
const notificationService = require('./notificationService');
const { postModel, postLikeModel } = require('../models/post');

/** 帖子列表（sort: latest/hot） */
async function listPosts({ position, region, sort, page, pageSize }) {
  return postModel.list({ position, region, sort, page, pageSize });
}

/** 发布帖子（作者取登录用户） */
async function createPost(userId, { title, content, position, region, tags, interviewType, result }) {
  const t = title == null ? '' : String(title).trim();
  const c = content == null ? '' : String(content).trim();
  if (!t) throw new AppError(1001, '标题不能为空');
  if (!c) throw new AppError(1001, '内容不能为空');
  const user = await User.findById(userId);
  const postId = await postModel.create({
    authorId: userId,
    authorName: user ? user.nickname : '学员',
    authorAvatar: user ? user.avatar : null,
    title: t,
    content: c,
    position,
    region,
    interviewType,
    result,
    tags,
  });
  return { postId };
}

/** 帖子详情（浏览 +1；登录返回 liked） */
async function postDetail(userId, id) {
  const post = await postModel.findById(id);
  if (!post) throw new AppError(1002, '帖子不存在');
  await postModel.incView(id);
  const liked = userId ? !!(await postLikeModel.find(id, userId)) : false;
  return {
    id: post.id,
    authorId: post.author_id,
    authorName: post.author_name,
    authorAvatar: post.author_avatar,
    title: post.title,
    content: post.content,
    position: post.position,
    region: post.region,
    interviewType: post.interview_type,
    result: post.result,
    tags: post.tags,
    viewCount: post.view_count + 1,
    likeCount: post.like_count,
    commentCount: post.comment_count,
    liked,
    createdAt: post.created_at,
  };
}

/**
 * 点赞切换（先查后插删 + ER_DUP_ENTRY 并发幂等 → like_count ±1）
 * 点赞且非本人时通知楼主（fail-open，不阻断）。
 */
async function toggleLike(userId, postId) {
  const post = await postModel.findById(postId);
  if (!post) throw new AppError(1002, '帖子不存在');

  const exist = await postLikeModel.find(postId, userId);
  let liked;
  if (exist) {
    await postLikeModel.remove(postId, userId);
    await postModel.incLike(postId, -1);
    liked = false;
  } else {
    try {
      await postLikeModel.insert(postId, userId);
    } catch (e) {
      if (e && e.code !== 'ER_DUP_ENTRY') throw e;
    }
    await postModel.incLike(postId, 1);
    liked = true;
    if (post.author_id !== userId) {
      await notificationService.notify(
        post.author_id,
        'like',
        '有人赞了你的帖子',
        `你的帖子「${post.title}」获得了一个赞`,
        { postId: post.id, postTitle: post.title, fromUserId: userId },
      );
    }
  }
  const fresh = await postModel.findById(postId);
  return { liked, likeCount: fresh ? fresh.like_count : 0 };
}

module.exports = { listPosts, createPost, postDetail, toggleLike };
