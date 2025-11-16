package com.nian.yinianzhida.service;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Session缓存服务
 * 用于管理自动填表的会话状态（analyze-page和fill-values之间的上下文）
 */
@Service
public class SessionCacheService {

    /**
     * 会话数据类
     */
    private static class SessionData {
        private final Map<String, Object> data;
        private final long createTime;
        private final long expireTime; // 过期时间（毫秒）

        public SessionData(Map<String, Object> data, long expireTime) {
            this.data = data;
            this.createTime = System.currentTimeMillis();
            this.expireTime = expireTime;
        }

        public boolean isExpired() {
            return System.currentTimeMillis() - createTime > expireTime;
        }

        public Map<String, Object> getData() {
            return data;
        }
    }

    // 使用ConcurrentHashMap存储会话数据（生产环境建议使用Redis）
    private final Map<String, SessionData> sessionCache = new ConcurrentHashMap<>();

    /**
     * 创建新会话
     * @param data 会话数据
     * @param expireMinutes 过期时间（分钟）
     * @return sessionId
     */
    public String createSession(Map<String, Object> data, int expireMinutes) {
        String sessionId = UUID.randomUUID().toString();
        long expireTime = expireMinutes * 60 * 1000L;
        sessionCache.put(sessionId, new SessionData(data, expireTime));

        // 清理过期会话
        cleanExpiredSessions();

        return sessionId;
    }

    /**
     * 获取会话数据
     * @param sessionId 会话ID
     * @return 会话数据，如果不存在或已过期返回null
     */
    public Map<String, Object> getSession(String sessionId) {
        if (sessionId == null || sessionId.isEmpty()) {
            return null;
        }

        SessionData sessionData = sessionCache.get(sessionId);
        if (sessionData == null) {
            return null;
        }

        if (sessionData.isExpired()) {
            sessionCache.remove(sessionId);
            return null;
        }

        return sessionData.getData();
    }

    /**
     * 更新会话数据
     * @param sessionId 会话ID
     * @param data 新数据
     */
    public void updateSession(String sessionId, Map<String, Object> data) {
        SessionData oldSession = sessionCache.get(sessionId);
        if (oldSession != null && !oldSession.isExpired()) {
            sessionCache.put(sessionId, new SessionData(data, 10 * 60 * 1000L));
        }
    }

    /**
     * 删除会话
     * @param sessionId 会话ID
     */
    public void deleteSession(String sessionId) {
        sessionCache.remove(sessionId);
    }

    /**
     * 清理过期会话
     */
    private void cleanExpiredSessions() {
        sessionCache.entrySet().removeIf(entry -> entry.getValue().isExpired());
    }

    /**
     * 获取当前会话数量
     * @return 会话数量
     */
    public int getSessionCount() {
        cleanExpiredSessions();
        return sessionCache.size();
    }
}
