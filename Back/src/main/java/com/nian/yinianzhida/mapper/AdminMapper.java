package com.nian.yinianzhida.mapper;

import com.nian.yinianzhida.entity.Admin;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
 * 管理员Mapper接口
 */
@Mapper
public interface AdminMapper {

    /**
     * 根据用户名查询管理员
     * @param username 用户名
     * @return 管理员对象
     */
    Admin findByUsername(@Param("username") String username);

    /**
     * 根据ID查询管理员
     * @param id 管理员ID
     * @return 管理员对象
     */
    Admin findById(@Param("id") Long id);

    /**
     * 更新管理员最后登录时间
     * @param id 管理员ID
     * @return 影响行数
     */
    int updateLastLoginTime(@Param("id") Long id);

    /**
     * 插入管理员
     * @param admin 管理员对象
     * @return 影响行数
     */
    int insert(Admin admin);

    /**
     * 更新管理员信息
     * @param admin 管理员对象
     * @return 影响行数
     */
    int update(Admin admin);

    /**
     * 删除管理员
     * @param id 管理员ID
     * @return 影响行数
     */
    int deleteById(@Param("id") Long id);
}
