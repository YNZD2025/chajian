package com.nian.yinianzhida.service;

import me.chanjar.weixin.common.error.WxErrorException;
import me.chanjar.weixin.mp.api.WxMpService;
import me.chanjar.weixin.common.bean.WxOAuth2UserInfo;
import me.chanjar.weixin.common.bean.oauth2.WxOAuth2AccessToken;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * 微信公众号服务
 */
@Service
public class WeChatService {

    @Autowired
    private WxMpService wxMpService;

    /**
     * 生成微信授权URL
     *
     * @param redirectUri 授权后重定向URL
     * @param state 状态参数（用于防止CSRF攻击）
     * @return 授权URL
     */
    public String generateAuthUrl(String redirectUri, String state) {
        return wxMpService.getOAuth2Service().buildAuthorizationUrl(
                redirectUri,
                "snsapi_userinfo",  // 授权作用域：获取用户信息
                state
        );
    }

    /**
     * 通过授权码获取Access Token
     *
     * @param code 授权码
     * @return Access Token对象
     */
    public WxOAuth2AccessToken getAccessToken(String code) throws WxErrorException {
        return wxMpService.getOAuth2Service().getAccessToken(code);
    }

    /**
     * 通过Access Token获取用户信息
     *
     * @param accessToken Access Token对象
     * @return 微信用户信息
     */
    public WxOAuth2UserInfo getUserInfo(WxOAuth2AccessToken accessToken) throws WxErrorException {
        return wxMpService.getOAuth2Service().getUserInfo(accessToken, "zh_CN");
    }

    /**
     * 通过授权码直接获取用户信息
     *
     * @param code 授权码
     * @return 微信用户信息
     */
    public WxOAuth2UserInfo getUserInfoByCode(String code) throws WxErrorException {
        WxOAuth2AccessToken accessToken = getAccessToken(code);
        return getUserInfo(accessToken);
    }
}
