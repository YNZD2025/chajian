package com.nian.yinianzhida.mapper;

import com.nian.yinianzhida.entity.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

/**
 * 用户Mapper接口
 */
@Mapper
public interface UserMapper {

    /**
     * 根据OpenID查询用户
     */
    User selectByOpenid(@Param("openid") String openid);

    /**
     * 根据ID查询用户
     */
    User selectById(@Param("id") Long id);

    /**
     * 根据邮箱查询用户
     */
    User selectByEmail(@Param("email") String email);

    /**
     * 插入新用户
     */
    int insert(User user);

    /**
     * 更新用户信息
     */
    int updateById(User user);

    /**
     * 更新最后登录时间
     */
    int updateLastLoginTime(@Param("id") Long id);

    /**
     * 分页查询用户列表
     * @param params 查询参数（keyword, isVip, status, offset, limit）
     * @return 用户列表
     */
    List<User> selectByPage(@Param("params") Map<String, Object> params);

    /**
     * 统计用户总数
     * @param params 查询参数（keyword, isVip, status）
     * @return 用户总数
     */
    int countByParams(@Param("params") Map<String, Object> params);

    /**
     * 根据ID删除用户
     * @param id 用户ID
     * @return 影响行数
     */
    int deleteById(@Param("id") Long id);

    /**
     * 批量删除用户
     * @param ids 用户ID列表
     * @return 影响行数
     */
    int deleteBatchByIds(@Param("ids") List<Long> ids);
}
