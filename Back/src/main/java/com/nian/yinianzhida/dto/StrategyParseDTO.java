package com.nian.yinianzhida.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 攻略内容解析请求DTO
 */
@Data
public class StrategyParseDTO {

    /**
     * 内容类型（json | text）
     */
    @NotBlank(message = "内容类型不能为空")
    private String contentType;

    /**
     * 原始内容
     */
    @NotBlank(message = "内容不能为空")
    private String content;
}
