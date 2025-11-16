package com.nian.yinianzhida.service;

import com.nian.yinianzhida.entity.User;
import com.nian.yinianzhida.mapper.UserMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 用户服务
 */
@Service
public class UserService {

    @Autowired
    private UserMapper userMapper;

  /*  @Autowired
    private OssService ossService;*/

    /**
     * 根据OpenID查询或创建用户
     *
     * @param openid 微信OpenID
     * @param nickname 微信昵称
     * @param avatarUrl 微信头像URL
     * @return 用户对象
     */
    public User getOrCreateUser(String openid, String nickname, String avatarUrl) {
        // 先查询用户是否存在
        User user = userMapper.selectByOpenid(openid);

        if (user != null) {
            // 用户已存在，更新登录时间
            userMapper.updateLastLoginTime(user.getId());

            // 更新用户信息（昵称和头像可能变化）
            if (nickname != null && !nickname.equals(user.getNickname())) {
                user.setNickname(nickname);
            }
            if (avatarUrl != null && !avatarUrl.equals(user.getAvatar())) {
                // 直接使用微信头像URL
                user.setAvatar(avatarUrl);
            }
            userMapper.updateById(user);

            // 重新查询获取最新数据
            user = userMapper.selectByOpenid(openid);
        } else {
            // 用户不存在，创建新用户
            user = new User();
            user.setOpenid(openid);
            user.setNickname(nickname);

            // 直接使用微信头像URL
            user.setAvatar(avatarUrl);

            user.setGender(0);
            user.setIsVip(0);
            user.setResumeOptimizeCount(3); // 新用户赠送3次优化机会
            user.setStatus(1);
            user.setCreatedAt(LocalDateTime.now());
            user.setUpdatedAt(LocalDateTime.now());
            user.setLastLoginTime(LocalDateTime.now());

            userMapper.insert(user);
        }

        return user;
    }

    /**
     * 根据ID查询用户
     */
    public User getUserById(Long id) {
        return userMapper.selectById(id);
    }

    /**
     * 根据OpenID查询用户
     */
    public User getUserByOpenid(String openid) {
        return userMapper.selectByOpenid(openid);
    }

    /**
     * 分页查询用户列表
     * @param keyword 关键词（昵称/手机号/邮箱）
     * @param isVip VIP状态（null表示全部）
     * @param status 账号状态（null表示全部）
     * @param page 当前页
     * @param size 每页大小
     * @return 分页结果
     */
    public Map<String, Object> getUserList(String keyword, Integer isVip, Integer status, int page, int size) {
        // 构造查询参数
        Map<String, Object> params = new HashMap<>();
        params.put("keyword", keyword);
        params.put("isVip", isVip);
        params.put("status", status);
        params.put("offset", (page - 1) * size);
        params.put("limit", size);

        // 查询列表
        List<User> list = userMapper.selectByPage(params);

        // 查询总数
        int total = userMapper.countByParams(params);

        // 组装返回结果
        Map<String, Object> result = new HashMap<>();
        result.put("list", list);
        result.put("total", total);
        result.put("page", page);
        result.put("size", size);
        result.put("totalPages", (int) Math.ceil((double) total / size));

        return result;
    }

    /**
     * 更新用户信息
     * @param user 用户对象
     * @return 更新结果
     */
    public boolean updateUser(User user) {
        return userMapper.updateById(user) > 0;
    }

    /**
     * 删除用户
     * @param id 用户ID
     * @return 删除结果
     */
    public boolean deleteUser(Long id) {
        return userMapper.deleteById(id) > 0;
    }

    /**
     * 根据邮箱查询用户
     * @param email 邮箱地址
     * @return 用户对象
     */
    public User getUserByEmail(String email) {
        return userMapper.selectByEmail(email);
    }

    /**
     * 创建新用户
     * @param user 用户对象
     * @return 创建结果
     */
    public boolean createUser(User user) {
        return userMapper.insert(user) > 0;
    }

    /**
     * 更新用户最后登录时间
     * @param userId 用户ID
     */
    public void updateLastLoginTime(Long userId) {
        userMapper.updateLastLoginTime(userId);
    }

    /**
     * 批量删除用户
     * @param ids 用户ID列表
     * @return 删除结果
     */
    public boolean batchDeleteUsers(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return false;
        }
        return userMapper.deleteBatchByIds(ids) > 0;
    }
}
